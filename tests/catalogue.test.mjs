import assert from 'node:assert/strict'
import test from 'node:test'
import {
  catalogQueryFromState,
  catalogStateFromQuery,
  filterCatalog,
  productPriceRange,
} from '../src/utils/catalogue.js'
import { optionGroups } from '../src/utils/productDetail.js'

const product = (id, variants, extra = {}) => ({
  id,
  name: `Product ${id}`,
  variants,
  ...extra,
})

test('variable products advertise and sort by their lowest active price', () => {
  const variable = product(1, [
    { id: 1, is_active: true, stock_qty: 2, price: 30, discounted_price: 30 },
    { id: 2, is_active: true, stock_qty: 2, price: 60, discounted_price: 55 },
    { id: 3, is_active: false, stock_qty: 2, price: 10, discounted_price: 10 },
  ])
  const fixed = product(2, [
    { id: 4, is_active: true, stock_qty: 2, price: 40, discounted_price: 40 },
  ])

  assert.deepEqual(productPriceRange(variable), { min: 30, max: 55, varies: true })
  assert.deepEqual(
    filterCatalog([fixed, variable], { sort: 'price-asc' }).map(({ id }) => id),
    [1, 2],
  )
})

test('catalogue state round-trips through the URL and preserves unrelated query values', () => {
  const state = {
    q: '  premium  ',
    category: 7,
    sort: 'price-desc',
    priceRange: [1250, 5500],
    inStock: true,
    onSale: true,
    layout: 'list',
    page: 3,
  }
  const query = catalogQueryFromState(state, {
    base: { offer: 'fall', source: 'banner' },
    defaultSort: 'best-seller',
    priceLimit: 8000,
  })

  assert.deepEqual(query, {
    offer: 'fall',
    source: 'banner',
    q: 'premium',
    category: '7',
    sort: 'price-desc',
    min: '12.5',
    max: '55',
    stock: '1',
    sale: '1',
    layout: 'list',
    page: '3',
  })
  assert.deepEqual(catalogStateFromQuery(query, { defaultSort: 'best-seller', priceLimit: 8000 }), {
    ...state,
    q: 'premium',
  })
})

test('invalid catalogue query values fall back to safe defaults', () => {
  assert.deepEqual(
    catalogStateFromQuery(
      { category: 'none', sort: 'random', min: '-5', max: 'lots', page: '0' },
      { defaultSort: 'new-arrival', priceLimit: 5000 },
    ),
    {
      q: '',
      category: null,
      sort: 'new-arrival',
      priceRange: [0, 5000],
      inStock: false,
      onSale: false,
      layout: 'grid',
      page: 1,
    },
  )
})

test('numeric variant labels include known product units without changing named options', () => {
  assert.deepEqual(
    optionGroups({
      unit: { name: 'Pieces' },
      variants: [
        { id: 1, name: '4' },
        { id: 2, name: 'Gift box' },
      ],
    })[0].values,
    [
      { value: '1', label: '4 Pieces' },
      { value: '2', label: 'Gift box' },
    ],
  )
})
