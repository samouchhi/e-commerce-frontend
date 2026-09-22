import api from './api'

const CART_KEY = 'cart'

const readCart = () => {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]')
  } catch {
    return []
  }
}

const saveCart = (cart) => {
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
  window.dispatchEvent(new Event('cart-updated'))
}

export const getCart = () => readCart()

export const resolveCart = async () => {
  const cart = readCart()
  if (!cart.length) return { items: [], can_checkout: true, total: '0.00' }

  const resolved = await api.request('/api/cart/resolve', {
    method: 'POST',
    body: JSON.stringify({
      items: cart.map((item) => ({
        product_variant_id: Number(item.variantId),
        quantity: Number(item.quantity),
      })),
    }),
  })
  const itemsByVariantId = new Map(
    resolved.items.map((item) => [item.product_variant_id, item]),
  )

  saveCart(
    cart.map((item) => {
      const current = itemsByVariantId.get(item.variantId)
      if (!current) return item

      const price = current.unit_price === undefined ? item.price : Number(current.unit_price)
      const originalPrice = Number(current.original_unit_price)

      return {
        ...item,
        productId: current.product_id ?? item.productId,
        productName: current.name ?? item.productName,
        variantName: current.variant_name ?? item.variantName,
        price,
        originalPrice: originalPrice > price ? originalPrice : null,
        quantity: current.available ? current.quantity : item.quantity,
        stockQty: current.stock_qty ?? 0,
        unavailable: !current.available,
        cartMessage: '',
      }
    }),
  )

  return resolved
}

export const clearCart = () => saveCart([])

export const addToCart = (item) => {
  const cart = readCart()
  const existing = cart.find((cartItem) => cartItem.variantId === item.variantId)
  const quantity =
    Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0 ? Number(item.quantity) : 1
  if (existing) existing.quantity += quantity
  else cart.push({ ...item, quantity })
  saveCart(cart)
  window.dispatchEvent(new Event('cart-item-added'))
}

export const updateCartQuantity = (variantId, quantity, maxStock = Infinity) => {
  const cart = readCart()
  const item = cart.find((cartItem) => cartItem.variantId === variantId)
  const nextQuantity = Number(quantity)
  if (!item || !Number.isInteger(nextQuantity) || nextQuantity < 1 || nextQuantity > maxStock)
    return false
  item.quantity = nextQuantity
  saveCart(cart)
  return true
}

export const updateCartItem = (variantId, updates) => {
  const cart = readCart()
  const item = cart.find((cartItem) => cartItem.variantId === variantId)
  if (!item) return false
  Object.assign(item, updates)
  saveCart(cart)
  return true
}

export const mergeCartItem = (fromVariantId, toItem, maxStock) => {
  const cart = readCart()
  const fromItem = cart.find((item) => item.variantId === fromVariantId)
  const toItemInCart = cart.find((item) => item.variantId === toItem.variantId)
  if (!fromItem || !toItemInCart || fromVariantId === toItem.variantId) return false

  const combinedQuantity = fromItem.quantity + toItemInCart.quantity
  if (combinedQuantity > maxStock) return false

  toItemInCart.quantity = combinedQuantity
  toItemInCart.variantName = toItem.variantName
  toItemInCart.price = toItem.price
  cart.splice(cart.indexOf(fromItem), 1)
  saveCart(cart)
  return true
}

export const removeFromCart = (variantId) =>
  saveCart(readCart().filter((item) => item.variantId !== variantId))
