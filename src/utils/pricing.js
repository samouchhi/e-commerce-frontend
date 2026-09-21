export const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(price || 0))

export const formatExpiry = (date) => (date ? String(date).slice(0, 10) : '')

const activeVariant = (product) =>
  product?.variants?.find((variant) => variant.is_active && Number(variant.stock_qty) > 0) ||
  product?.variants?.find((variant) => variant.is_active) ||
  product?.variants?.[0] ||
  null

export const isOnPromotion = (product) =>
  (product?.variants || []).some(
    (variant) => Number(variant.discounted_price) < Number(variant.price),
  )

export const activeDiscount = (product) =>
  product?.discounts?.find((discount) => discount.is_current) || null

export const groupPromotions = (products) => {
  const groups = new Map()

  products.forEach((product) => {
    const discount = activeDiscount(product)
    const key = discount
      ? `${discount.name}|${discount.end_date}|${discount.value}|${discount.type}`
      : 'no-discount'

    if (!groups.has(key)) groups.set(key, { key, discount, products: [] })
    groups.get(key).products.push(product)
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
