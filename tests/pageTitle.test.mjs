import assert from 'node:assert/strict'
import test from 'node:test'
import { pageTitle } from '../src/utils/pageTitle.js'

test('page titles identify both the destination and store', () => {
  assert.equal(
    pageTitle({
      route: { name: 'orders', meta: { titleKey: 'orders.title' } },
      storeName: 'MongKol',
      translate: () => 'Your orders',
    }),
    'Your orders | MongKol',
  )
  assert.equal(
    pageTitle({
      route: { name: 'product-detail', meta: {} },
      productName: 'Premium Set',
      storeName: 'MongKol',
      translate: () => '',
    }),
    'Premium Set | MongKol',
  )
})
