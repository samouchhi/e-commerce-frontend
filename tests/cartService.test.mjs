import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm'

const source = await readFile(new URL('../src/services/cartService.js', import.meta.url), 'utf8')

async function loadCartService(cart, response) {
  const storage = new Map([['cart', JSON.stringify(cart)]])
  const requests = []
  const context = createContext({
    Event: class Event {
      constructor(type) {
        this.type = type
      }
    },
    JSON,
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
    },
    Map,
    Number,
    window: { dispatchEvent() {} },
  })
  const cartModule = new SourceTextModule(source, { context })
  const apiModule = new SyntheticModule(
    ['default'],
    function () {
      this.setExport('default', {
        request: async (...args) => {
          requests.push(args)
          return response
        },
      })
    },
    { context },
  )

  await cartModule.link(() => apiModule)
  await apiModule.evaluate()
  await cartModule.evaluate()

  return { requests, service: cartModule.namespace, storage }
}

test('cart resolution replaces locally stored prices with the server price', async () => {
  const { requests, service, storage } = await loadCartService(
    [{ variantId: 8, productId: 3, price: 20, quantity: 2 }],
    {
      can_checkout: true,
      items: [
        {
          product_variant_id: 8,
          product_id: 3,
          name: 'T-shirt',
          variant_name: 'Blue',
          quantity: 2,
          stock_qty: 5,
          available: true,
          original_unit_price: '20.00',
          unit_price: '15.00',
          message: null,
        },
      ],
    },
  )

  await service.resolveCart()

  assert.equal(requests[0][0], '/api/cart/resolve')
  assert.deepEqual(JSON.parse(requests[0][1].body), {
    items: [{ product_variant_id: 8, quantity: 2 }],
  })
  assert.deepEqual(JSON.parse(storage.get('cart')), [
    {
      variantId: 8,
      productId: 3,
      productName: 'T-shirt',
      variantName: 'Blue',
      price: 15,
      originalPrice: 20,
      quantity: 2,
      stockQty: 5,
      unavailable: false,
      cartMessage: '',
    },
  ])
})

test('unavailable items remain valid cart drafts for later refreshes', async () => {
  const { service, storage } = await loadCartService(
    [{ variantId: 8, productId: 3, price: 20, quantity: 2 }],
    {
      can_checkout: false,
      items: [
        {
          product_variant_id: 8,
          quantity: 0,
          available: false,
          message: 'This product was removed.',
        },
      ],
    },
  )

  await service.resolveCart()

  assert.equal(JSON.parse(storage.get('cart'))[0].quantity, 2)
  assert.equal(JSON.parse(storage.get('cart'))[0].unavailable, true)
})
