export const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(price || 0))

const timeZone = import.meta.env?.VITE_TIME_ZONE || 'Asia/Phnom_Penh'

export const formatExpiry = (date) =>
  date ? new Date(date).toLocaleDateString('sv-SE', { timeZone }) : ''

const activeVariant = (product) =>
  product?.variants?.find((variant) => variant.is_active && Number(variant.stock_qty) > 0) ||
  product?.variants?.find((variant) => variant.is_active) ||
  product?.variants?.[0] ||
  null

export const isOnPromotion = (product) =>
  (product?.variants || []).some(
    (variant) => Number(variant.discounted_price) < Number(variant.price),
  )

export const activeDiscounts = (product) =>
  (product?.discounts || []).filter((discount) => discount.is_current)

const promotionMetadata = (discount) => [
  String(discount.name || ''),
  discount.start_date ? new Date(discount.start_date).getTime() : null,
  discount.end_date ? new Date(discount.end_date).getTime() : null,
  Number(discount.value),
  discount.type || null,
]

// Older APIs omit IDs. Keep their links compact, deterministic and distinct even
// when campaigns share a name; never expose the serialized metadata in the URL.
const fallbackPromotionKey = (discount) => {
  const slug = String(discount.name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
  const metadata = JSON.stringify(promotionMetadata(discount))
  let hash = 2166136261
  for (let index = 0; index < metadata.length; index++) {
    hash = Math.imul(hash ^ metadata.charCodeAt(index), 16777619)
  }
  return `${slug || 'offer'}-${(hash >>> 0).toString(36)}`
}

export const promotionKey = (discount) =>
  discount.id != null ? String(discount.id) : fallbackPromotionKey(discount)

export const matchesPromotion = (discount, value) => {
  if (typeof value !== 'string' || !value) return false
  if (value === promotionKey(discount) || value === fallbackPromotionKey(discount)) return true
  // Resolve previously shared JSON links, including after discount IDs deploy.
  try {
    const legacy = JSON.parse(value)
    if (!Array.isArray(legacy) || legacy.length !== 5) return false
    const [name, start_date, end_date, amount, type] = legacy
    return (
      JSON.stringify(promotionMetadata({ name, start_date, end_date, value: amount, type })) ===
      JSON.stringify(promotionMetadata(discount))
    )
  } catch {
    return false
  }
}

// Used to identify the offer; displayed and checkout prices still come from the API.
const offerPrice = (discount, price) => {
  const value = Number(discount.value)
  if (!Number.isFinite(value)) return Infinity
  const discounted = discount.type === 'percentage' ? price * (1 - value / 100) : price - value
  return Math.round((Math.max(0, discounted) + Number.EPSILON) * 100) / 100
}

export const activeDiscount = (product, variant = activeVariant(product)) => {
  const price = Number(variant?.price)
  const advertised = Number(variant?.discounted_price)
  if (!Number.isFinite(price) || !(advertised < price)) return null
  const best = activeDiscounts(product)
    .slice()
    .sort((a, b) => offerPrice(a, price) - offerPrice(b, price))[0]
  return best && Math.abs(offerPrice(best, price) - advertised) < 0.005 ? best : null
}

export const groupPromotions = (products) => {
  const groups = new Map()

  products.forEach((product) => {
    const discounts = activeDiscounts(product)
    ;(discounts.length ? discounts : [null]).forEach((discount) => {
      const key = discount ? promotionKey(discount) : 'no-discount'
      if (!groups.has(key)) groups.set(key, { key, discount, products: [] })
      if (!groups.get(key).products.some((item) => item.id === product.id)) {
        groups.get(key).products.push(product)
      }
    })
  })

  return Array.from(groups.values())
}

export const pricingFor = (product) => {
  const variant = activeVariant(product)
  const price = Number(variant?.price ?? 0)
  const advertised = Number(variant?.discounted_price ?? price)
  const hasDiscount = advertised < price
  const savings = hasDiscount ? price - advertised : 0

  return {
    variant,
    price,
    currentPrice: hasDiscount ? advertised : price,
    originalPrice: price,
    hasDiscount,
    savings,
    percentOff: hasDiscount && price > 0 ? Math.round((savings / price) * 100) : 0,
    discount: activeDiscount(product),
  }
}
