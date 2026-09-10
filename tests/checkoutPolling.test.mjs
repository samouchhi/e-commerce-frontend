import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm'
import { parse, compileScript } from '@vue/compiler-sfc'
import { computed, ref } from 'vue'

const TEST_NOW = Date.parse('2026-09-10T09:00:00Z')

const source = await readFile(new URL('../src/views/CheckoutView.vue', import.meta.url), 'utf8')
const compiled = compileScript(parse(source).descriptor, { id: 'checkout-polling-test' }).content

function deferred() {
  let resolve
  let reject
  const promise = new Promise((ok, fail) => {
    resolve = ok
    reject = fail
  })
  return { promise, resolve, reject }
}

async function checkoutHarness({
  openApp = () => {},
  device = { userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5 },
  verify = async () => ({ status: 'pending', success: false }),
  generate = async () => ({
    qr_image: 'data:image/png;base64,test',
    deeplink_url: 'abamobilebank://ababank.com?type=payway&qrcode=test',
    amount: '5.00',
    currency: 'USD',
    merchant_name: 'Test Merchant',
    expires_at: new Date(TEST_NOW + 180000).toISOString(),
  }),
  create = async () => ({ id: 76 }),
} = {}) {
  let timerId = 0
  let clearCount = 0
  const timers = new Map()
  const intervals = new Map()
  let nowMs = TEST_NOW
  const requests = []
  const appLaunches = []
  const unmount = []
  const context = createContext({
    navigator: device,
    Date: class extends Date {
      static now() {
        return nowMs
      }
    },
    setInterval: (callback) => {
      intervals.set(++timerId, callback)
      return timerId
    },
    clearInterval: (id) => intervals.delete(id),
    AbortController,
    URL,
    window: {
      addEventListener() {},
      removeEventListener() {},
      location: {
        assign(url) {
          appLaunches.push(url)
          openApp(url)
        },
      },
    },
    setTimeout: (callback, delay) => {
      timers.set(++timerId, { callback, delay })
      return timerId
    },
    clearTimeout: (id) => timers.delete(id),
  })
  const mocks = {
    vue: { computed, ref, onMounted() {}, onUnmounted: (callback) => unmount.push(callback) },
    'vue-router': { RouterLink: {} },
    '../services/api': { default: {}, assetUrl: (path) => path },
    '../services/cartService': {
      getCart: () => [{ variantId: 1, productId: 1, price: 5, quantity: 1 }],
      clearCart: () => {
        clearCount += 1
      },
      mergeCartItem() {},
      updateCartItem() {},
      updateCartQuantity() {},
    },
    '../services/orderService': {
      createOrder: create,
      generateOrderPayment: generate,
      verifyOrderPayment: (id, options) => {
        requests.push({ id, options })
        return verify(id, options)
      },
    },
    '../services/productService': { getProducts: async () => [] },
  }
  const modules = new Map()
  const component = new SourceTextModule(compiled, { context })
  await component.link((specifier) => {
    if (!modules.has(specifier)) {
      const exports = mocks[specifier]
      assert.ok(exports, 'Unexpected import: ' + specifier)
      modules.set(
        specifier,
        new SyntheticModule(
          Object.keys(exports),
          function () {
            for (const [key, value] of Object.entries(exports)) this.setExport(key, value)
          },
          { context },
        ),
      )
    }
    return modules.get(specifier)
  })
  await component.evaluate()
  const view = component.namespace.default.setup({}, { expose() {} })
  view.isLoadingLogistics.value = false
  view.logistics.value = [{ id: 1, price: 0 }]
  view.selectedLogisticId.value = 1
  view.form.value = {
    name: 'Test',
    phone: '012345678',
    address: 'Street',
    city: 'Phnom Penh',
    note: '',
  }

  return {
    view,
    intervals,
    advance: (ms) => {
      nowMs += ms
      for (const update of intervals.values()) update()
    },
    timers,
    requests,
    appLaunches,
    get clearCount() {
      return clearCount
    },
    unmount: () => unmount.forEach((callback) => callback()),
    async tick() {
      const [id, timer] = timers.entries().next().value
      timers.delete(id)
      await timer.callback()
    },
  }
}

test('checkout starts polling after QR generation and confirms payment automatically', async () => {
  let checks = 0
  const h = await checkoutHarness({
    verify: async () =>
      ++checks === 1 ? { status: 'pending', success: false } : { status: 'paid', success: true },
  })
  await h.view.submitOrder()
  assert.equal(h.timers.size, 1)
  assert.equal([...h.timers.values()][0].delay, 3000)
  await h.tick()
  assert.equal(h.view.paymentWarning.value, '')
  assert.equal(h.timers.size, 1)
  await h.tick()
  assert.equal(h.view.paymentCompleted.value, true)
  assert.equal(h.clearCount, 1)
  assert.equal(h.timers.size, 0)
})

test('polling stops and removes the QR when Laravel reports expired', async () => {
  const h = await checkoutHarness({ verify: async () => ({ status: 'expired', success: false }) })
  await h.view.submitOrder()
  await h.tick()
  assert.equal(h.view.paymentExpired.value, true)
  assert.equal(h.view.countdownLabel.value, '00:00')
  assert.equal(h.intervals.size, 0)
  assert.equal(h.view.paymentQrImage.value, '')
  assert.equal(h.clearCount, 0)
  assert.equal(h.timers.size, 0)
})

test('slow verification does not overlap and late approval after close is ignored', async () => {
  const pending = deferred()
  const h = await checkoutHarness({ verify: () => pending.promise })
  await h.view.submitOrder()
  const checking = h.tick()
  await h.view.checkPayment()
  assert.equal(h.requests.length, 1)
  assert.equal(h.timers.size, 0)
  h.view.closePaymentModal()
  assert.equal(h.requests[0].options.signal.aborted, true)
  pending.resolve({ status: 'paid', success: true })
  await checking
  assert.equal(h.clearCount, 0)
  assert.equal(h.view.paymentCompleted.value, false)
  assert.equal(h.timers.size, 0)
})

test('unmount cancels polling and the active HTTP request', async () => {
  const pending = deferred()
  const h = await checkoutHarness({ verify: () => pending.promise })
  await h.view.submitOrder()
  const checking = h.tick()
  h.unmount()
  assert.equal(h.requests[0].options.signal.aborted, true)
  pending.resolve({ status: 'paid', success: true })
  await checking
  assert.equal(h.clearCount, 0)
  assert.equal(h.timers.size, 0)
})

test('temporary errors retry without marking payment paid', async () => {
  const h = await checkoutHarness({
    verify: async () => {
      throw new TypeError('Network unavailable')
    },
  })
  await h.view.submitOrder()
  await h.tick()
  assert.match(h.view.errorMessage.value, /keep checking automatically/)
  assert.equal([...h.timers.values()][0].delay, 3000)
  assert.equal(h.clearCount, 0)
})

test('rate limiting backs off and authentication errors stop polling', async () => {
  for (const status of [429, 401]) {
    const h = await checkoutHarness({
      verify: async () => {
        throw Object.assign(new Error('Request failed'), { status })
      },
    })
    await h.view.submitOrder()
    await h.tick()
    assert.equal(h.timers.size, status === 429 ? 1 : 0)
    if (status === 429) assert.equal([...h.timers.values()][0].delay, 30000)
    else {
      assert.equal(h.view.paymentQrImage.value, '')
      assert.equal(h.view.paymentDetails.value, null)
      assert.equal(h.intervals.size, 0)
    }
  }
})

test('closing during QR generation prevents a late response from restarting polling', async () => {
  const pending = deferred()
  const started = deferred()
  const h = await checkoutHarness({
    generate: () => {
      started.resolve()
      return pending.promise
    },
  })
  const submitting = h.view.submitOrder()
  await started.promise
  h.view.closePaymentModal()
  pending.resolve({
    qr_image: 'data:image/png;base64,test',
    deeplink_url: 'abamobilebank://ababank.com?type=payway&qrcode=test',
    expires_at: new Date(TEST_NOW + 180000).toISOString(),
  })
  await submitting
  assert.equal(h.view.paymentQrImage.value, '')
  assert.equal(h.timers.size, 0)
})

test('leaving during order creation prevents polling on a destroyed checkout', async () => {
  const pending = deferred()
  const h = await checkoutHarness({ create: () => pending.promise })
  const submitting = h.view.submitOrder()
  h.unmount()
  pending.resolve({ id: 76 })
  await submitting
  assert.equal(h.view.isSubmitted.value, false)
  assert.equal(h.timers.size, 0)
})

test('countdown follows the absolute expiry and hides stale QR while verification continues', async () => {
  const h = await checkoutHarness()
  await h.view.submitOrder()
  assert.equal(h.view.countdownLabel.value, '03:00')
  h.advance(9000)
  assert.equal(h.view.countdownLabel.value, '02:51')
  h.advance(180000)
  assert.equal(h.view.countdownLabel.value, '00:00')
  assert.equal(h.view.qrTimeUp.value, true)
  assert.equal(h.intervals.size, 0)
  assert.equal(h.timers.size, 1)
  await h.tick()
  assert.equal(h.view.paymentExpired.value, false)
  assert.equal(h.timers.size, 1)
  h.view.closePaymentModal()
  assert.equal(h.intervals.size, 0)
  assert.equal(h.timers.size, 0)
})

test('ABA scan and processing actions update the screen without completing the order', async () => {
  let action = 'request_qr'
  const h = await checkoutHarness({
    verify: async () => ({
      action,
      status: action === 'approved' ? 'paid' : 'pending',
      success: action === 'approved',
    }),
  })
  await h.view.submitOrder()
  await h.tick()
  assert.match(h.view.paymentStatusMessage.value, /Waiting for payment/)

  for (const [nextAction, message] of [
    ['scanned', /QR scanned.*Confirm the payment/],
    ['rqpay', /Payment requested/],
    ['processing-payment', /Payment is processing/],
  ]) {
    action = nextAction
    await h.tick()
    assert.match(h.view.paymentStatusMessage.value, message)
    assert.equal(h.view.paymentCompleted.value, false)
    assert.equal(h.clearCount, 0)
    assert.equal(h.timers.size, 1)
  }

  h.advance(180000)
  assert.equal(h.view.qrTimeUp.value, true)
  assert.match(h.view.paymentStatusMessage.value, /Payment is processing/)
  action = 'approved'
  await h.tick()
  assert.equal(h.view.paymentCompleted.value, true)
  assert.equal(h.clearCount, 1)
  assert.equal(h.timers.size, 0)
  h.view.closePaymentModal()
  assert.equal(h.view.paymentAction.value, '')
})

test('a scan response after the payment dialog closes is ignored', async () => {
  const pending = deferred()
  const h = await checkoutHarness({ verify: () => pending.promise })
  await h.view.submitOrder()
  const checking = h.tick()
  h.view.closePaymentModal()
  pending.resolve({ status: 'pending', success: false, action: 'scanned' })
  await checking
  assert.equal(h.view.paymentAction.value, '')
  assert.equal(h.timers.size, 0)
  assert.equal(h.clearCount, 0)
})

test('ABA app button is available on mobile only while the order QR is active', async () => {
  for (const device of [
    { userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5 },
    { userAgent: 'Android', platform: 'Linux', maxTouchPoints: 5 },
    { userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 5 },
  ]) {
    const h = await checkoutHarness({ device })
    assert.equal(h.view.canOpenAbaApp.value, false)
    await h.view.submitOrder()
    assert.equal(h.view.canOpenAbaApp.value, true)
    assert.equal(h.clearCount, 0)
    assert.equal(h.timers.size, 1)
    h.advance(180000)
    assert.equal(h.view.canOpenAbaApp.value, false)
    h.view.closePaymentModal()
  }
})

test('desktop, missing links and unexpected link destinations do not show the ABA app button', async () => {
  const desktop = await checkoutHarness({
    device: { userAgent: 'Windows', platform: 'Win32', maxTouchPoints: 0 },
  })
  await desktop.view.submitOrder()
  assert.equal(desktop.view.canOpenAbaApp.value, false)
  assert.equal(desktop.appLaunches.length, 0)
  desktop.view.closePaymentModal()
  const mobile = await checkoutHarness()
  await mobile.view.submitOrder()
  for (const deeplink of [undefined, '', 'javascript:alert(1)', 'https://example.com']) {
    mobile.view.paymentDetails.value.deeplink_url = deeplink
    assert.equal(mobile.view.canOpenAbaApp.value, false)
  }
  mobile.view.closePaymentModal()
})

test('mobile attempts to open ABA once after QR generation and never during polling', async () => {
  const h = await checkoutHarness()
  assert.equal(h.appLaunches.length, 0)
  await h.view.submitOrder()
  assert.deepEqual(h.appLaunches, [h.view.paymentDetails.value.deeplink_url])
  assert.equal(h.view.paymentCompleted.value, false)
  await h.tick()
  await h.tick()
  assert.equal(h.appLaunches.length, 1)
  assert.equal(h.view.canOpenAbaApp.value, true)
  assert.equal(h.clearCount, 0)
  h.view.closePaymentModal()
})

test('a blocked automatic app launch keeps the manual button, QR and polling available', async () => {
  const h = await checkoutHarness({
    openApp() {
      throw new Error('Browser requires a user gesture')
    },
  })
  await h.view.submitOrder()
  assert.equal(h.appLaunches.length, 1)
  assert.equal(h.view.errorMessage.value, '')
  assert.equal(h.view.canOpenAbaApp.value, true)
  assert.ok(h.view.paymentQrImage.value)
  assert.equal(h.timers.size, 1)
  await h.tick()
  assert.equal(h.appLaunches.length, 1)
  h.view.closePaymentModal()
})

test('expired or closed payment sessions never automatically open ABA', async () => {
  const expired = await checkoutHarness({
    generate: async () => ({
      qr_image: 'data:image/png;base64,test',
      deeplink_url: 'abamobilebank://ababank.com?type=payway&qrcode=test',
      expires_at: new Date(TEST_NOW - 1000).toISOString(),
    }),
  })
  await expired.view.submitOrder()
  assert.equal(expired.appLaunches.length, 0)
  expired.view.closePaymentModal()

  const pending = deferred()
  const started = deferred()
  const closed = await checkoutHarness({
    generate: () => {
      started.resolve()
      return pending.promise
    },
  })
  const submitting = closed.view.submitOrder()
  await started.promise
  closed.view.closePaymentModal()
  pending.resolve({
    qr_image: 'data:image/png;base64,test',
    deeplink_url: 'abamobilebank://ababank.com?type=payway&qrcode=test',
    expires_at: new Date(TEST_NOW + 180000).toISOString(),
  })
  await submitting
  assert.equal(closed.appLaunches.length, 0)
})
