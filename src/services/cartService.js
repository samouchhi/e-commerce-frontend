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

export const addToCart = (item) => {
  const cart = readCart()
  const existing = cart.find((cartItem) => cartItem.variantId === item.variantId)
  if (existing) existing.quantity += 1
  else cart.push({ ...item, quantity: 1 })
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
