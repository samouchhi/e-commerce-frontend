import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createContext, SourceTextModule } from 'node:vm'

async function loadOrderService(response) {
  const requests = []
  const context = createContext({
    fetch: async (url, options) => {
      requests.push({ url, options })
      return response
    },
    localStorage: { getItem: () => 'customer-test-token' },
  })
  const api = new SourceTextModule(
    await readFile(new URL('../src/services/api.js', import.meta.url), 'utf8'),
    {
      context,
      initializeImportMeta: (meta) => {
        meta.env = { VITE_API_URL: 'https://api.example.test' }
      },
    },
  )
  const orders = new SourceTextModule(
    await readFile(new URL('../src/services/orderService.js', import.meta.url), 'utf8'),
    { context },
  )
  await api.link(() => {})
  await orders.link(() => api)
  await orders.evaluate()
  return { service: orders.namespace, requests }
}

test('payment service reads the ABA PNG from JSON and sends customer authentication', async () => {
  const image = 'data:image/png;base64,aGVsbG8='
  const { service, requests } = await loadOrderService(
    Response.json({
      expires_at: '2026-09-10T16:00:00+07:00',
      order_id: 76,
      amount: '0.20',
      qr_image: image,
      status: 'pending',
    }),
  )

  assert.equal((await service.generateOrderPayment(76)).qr_image, image)
  assert.equal(requests[0].url, 'https://api.example.test/api/orders/76/payment')
  assert.equal(requests[0].options.method, 'POST')
  assert.equal(requests[0].options.headers.Accept, 'application/json')
  assert.equal(requests[0].options.headers.Authorization, 'Bearer customer-test-token')
})

test('payment service preserves expired-payment error details', async () => {
  const { service } = await loadOrderService(
    Response.json({ message: 'QR expired.' }, { status: 409 }),
  )
  await assert.rejects(
    service.generateOrderPayment(76),
    (error) => error.message === 'QR expired.' && error.status === 409,
  )
})

test('payment service rejects missing images rather than displaying the raw payload as an image', async () => {
  const { service } = await loadOrderService(Response.json({ qr_string: '000201' }))
  await assert.rejects(service.generateOrderPayment(76), /did not include a valid QR image/)
})

test('verification reads the backend payment status', async () => {
  const { service, requests } = await loadOrderService(
    Response.json({ success: true, status: 'paid' }),
  )
  const controller = new AbortController()
  const payment = await service.verifyOrderPayment(76, { signal: controller.signal })
  assert.equal(requests[0].options.signal, controller.signal)
  assert.equal(payment.status, 'paid')
  assert.equal(requests[0].url, 'https://api.example.test/api/orders/76/verify')
})

test('payment service rejects invalid expiry before starting a countdown', async () => {
  const { service } = await loadOrderService(
    Response.json({ qr_image: 'data:image/png;base64,test', expires_at: 'not-a-date' }),
  )
  await assert.rejects(service.generateOrderPayment(76), /did not include a valid QR expiry/)
})
