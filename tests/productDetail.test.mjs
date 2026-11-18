import assert from 'node:assert/strict'
import test from 'node:test'
import {
  optionGroups,
  optionAvailable,
  resolveVariant,
  variantPrice,
} from '../src/utils/productDetail.js'

const product = {
  variants: [
    {
      id: 1,
      name: '100ml',
      price: '15.00',
      discounted_price: '15.00',
      stock_qty: 2,
      is_active: true,
    },
    {
      id: 2,
      name: '150ml',
      price: '20.00',
      discounted_price: '18.00',
      stock_qty: 4,
      is_active: true,
    },
    { id: 3, name: '250ml', price: '25.00', stock_qty: 0, is_active: true },
  ],
}

test('size choices keep prices attached to the selected variant and require an explicit choice', () => {
  assert.equal(resolveVariant(product, {}), undefined)
  assert.deepEqual(
    optionGroups(product)[0].values.map(({ label }) => label),
    ['100ml', '150ml', '250ml'],
  )
  const selected = resolveVariant(product, { variant: '2' })
  assert.equal(selected.id, 2)
  assert.deepEqual(variantPrice(selected), { current: 18, original: 20, discounted: true })
})

test('customers can switch sizes while unavailable sizes stay disabled', () => {
  assert.equal(optionAvailable(product, { variant: '1' }, 'variant', '2'), true)
  assert.equal(optionAvailable(product, {}, 'variant', '3'), false)
  assert.equal(
    optionAvailable(
      { variants: [{ ...product.variants[0], is_active: false }] },
      {},
      'variant',
      '1',
    ),
    false,
  )
})
