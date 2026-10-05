export const availableVariant = (variant) =>
  Boolean(variant?.is_active) && Number(variant.stock_qty) > 0

const attributesFor = (variant) => {
  if (Array.isArray(variant.attribute_values)) {
    return Object.fromEntries(
      variant.attribute_values
        .filter((item) => item.attribute?.name && item.value != null)
        .map((item) => [item.attribute.name, String(item.value)]),
    )
  }
  return Object.fromEntries(
    Object.entries(variant.attributes || {})
      .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
      .map(([key, value]) => [key, String(value)]),
  )
}

export const optionGroups = (product) => {
  const variants = product?.variants || []
  if (variants.length < 2) return []
  const keys = Object.keys(attributesFor(variants[0]))
  const structured =
    keys.length &&
    variants.every((variant) => {
      const attributes = attributesFor(variant)
      return (
        Object.keys(attributes).length === keys.length && keys.every((key) => key in attributes)
      )
    })
  if (!structured)
    return [
      {
        key: 'variant',
        label: null,
        values: variants.map((variant) => ({ value: String(variant.id), label: variant.name })),
      },
    ]
  return keys.map((key) => ({
    key,
    label: key.replaceAll('_', ' '),
    values: [...new Set(variants.map((variant) => attributesFor(variant)[key]))].map((value) => ({
      value,
      label: value,
    })),
  }))
}

const matches = (variant, selections) =>
  Object.entries(selections).every(([key, value]) =>
    key === 'variant' ? String(variant.id) === value : attributesFor(variant)[key] === value,
  )

export const resolveVariant = (product, selections) => {
  const variants = product?.variants || []
  if (variants.length === 1) return variants[0]
  const groups = optionGroups(product)
  if (!groups.length || !groups.every((group) => selections[group.key])) return undefined
  return variants.find((variant) => matches(variant, selections))
}

export const optionAvailable = (product, selections, key, value) =>
  (product?.variants || []).some(
    (variant) => availableVariant(variant) && matches(variant, { ...selections, [key]: value }),
  )

export const variantPrice = (variant) => {
  const original = variant?.price == null ? NaN : Number(variant.price)
  const sale = variant?.discounted_price == null ? original : Number(variant.discounted_price)
  const discounted = Number.isFinite(sale) && sale >= 0 && sale < original
  return { current: discounted ? sale : original, original, discounted }
}

export const galleryImages = (product, variant) => {
  const images = [...(product?.images || [])].sort(
    (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0),
  )
  if (variant?.images?.length) return [...variant.images, ...images]
  if (variant?.image_path || variant?.image_url) return [variant, ...images]
  if (variant?.image_id != null)
    images.sort((a, b) => Number(b.id === variant.image_id) - Number(a.id === variant.image_id))
  return images
}
