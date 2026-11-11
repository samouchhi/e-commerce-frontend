import { pricingFor } from './pricing.js'
import { availableVariant, variantPrice } from './productDetail.js'

const sorts = new Set([
  'best-seller',
  'new-arrival',
  'price-asc',
  'price-desc',
  'name-asc',
  'name-desc',
])
const first = (value) => (Array.isArray(value) ? value[0] : value)
const moneyToCents = (value, fallback) => {
  const amount = Number(first(value))
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : fallback
}
const positiveInteger = (value, fallback = 1) => {
  const number = Number.parseInt(first(value), 10)
  return Number.isInteger(number) && number > 0 ? number : fallback
}

export const productPriceRange = (product) => {
  const variants = product?.variants || []
  const active = variants.filter((variant) => variant.is_active !== false)
  const prices = (active.length ? active : variants)
    .map((variant) => variantPrice(variant).current)
    .filter(Number.isFinite)

  if (!prices.length) return { min: 0, max: 0, varies: false }
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return { min, max, varies: min !== max }
}

export const catalogStateFromQuery = (query = {}, { defaultSort, priceLimit }) => {
  const limit = Math.max(1, Number(priceLimit) || 1)
  const min = Math.min(limit, moneyToCents(query.min, 0))
  const max = Math.min(limit, moneyToCents(query.max, limit))
  const category = Number(first(query.category))
  const sort = String(first(query.sort) || '')

  return {
    q: String(first(query.q) || ''),
    category: Number.isFinite(category) && category > 0 ? category : null,
    sort: sorts.has(sort) ? sort : defaultSort,
    priceRange: [Math.min(min, max), Math.max(min, max)],
    inStock: first(query.stock) === '1',
    onSale: first(query.sale) === '1',
    layout: first(query.layout) === 'list' ? 'list' : 'grid',
    page: positiveInteger(query.page),
  }
}

export const catalogQueryFromState = (state, { base = {}, defaultSort, priceLimit }) => {
  const query = { ...base }
  ;['q', 'category', 'sort', 'min', 'max', 'stock', 'sale', 'layout', 'page'].forEach(
    (key) => delete query[key],
  )
  if (state.q.trim()) query.q = state.q.trim()
  if (state.category != null) query.category = String(state.category)
  if (state.sort !== defaultSort) query.sort = state.sort
  if (state.priceRange[0] > 0) query.min = String(state.priceRange[0] / 100)
  if (state.priceRange[1] < priceLimit) query.max = String(state.priceRange[1] / 100)
  if (state.inStock) query.stock = '1'
  if (state.onSale) query.sale = '1'
  if (state.layout === 'list') query.layout = 'list'
  if (state.page > 1) query.page = String(state.page)
  return query
}

export const filterCatalog = (
  products,
  {
    category = null,
    query = '',
    min = '',
    max = '',
    inStock = false,
    onSale = false,
    sort = 'best-seller',
  } = {},
) => {
  const search = query.trim().toLocaleLowerCase()
  const visible = products.filter((product) => {
    const pricing = pricingFor(product)
    const price = productPriceRange(product).min
    return (
      (category === null ||
        Number(product.category?.id ?? product.category_id) === Number(category)) &&
      (!search || product.name.toLocaleLowerCase().includes(search)) &&
      (min === '' || price >= Number(min)) &&
      (max === '' || price <= Number(max)) &&
      (!inStock || product.variants?.some(availableVariant)) &&
      (!onSale || pricing.hasDiscount)
    )
  })
  if (sort === 'new-arrival') return visible
  return visible.sort((a, b) => {
    if (sort === 'price-asc') return productPriceRange(a).min - productPriceRange(b).min
    if (sort === 'price-desc') return productPriceRange(b).min - productPriceRange(a).min
    if (sort === 'name-desc') return b.name.localeCompare(a.name)
    if (sort === 'name-asc') return a.name.localeCompare(b.name)
    return Number(b.is_best_seller) - Number(a.is_best_seller)
  })
}
