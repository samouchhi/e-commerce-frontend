<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import {
  getCart,
  mergeCartItem,
  removeFromCart,
  updateCartItem,
  updateCartQuantity,
} from './services/cartService'
import { getUser, isAuthenticated, logout } from './services/authService'
import { getProducts } from './services/productService'

const cart = ref([])
const products = ref([])
const router = useRouter()
const warnings = ref({})
const isBagOpen = ref(false)
const isProfileOpen = ref(false)
const isLoggedIn = ref(isAuthenticated())
const user = ref(getUser())
const refreshCart = () => (cart.value = getCart())
const cartCount = computed(() => cart.value.reduce((total, item) => total + item.quantity, 0))
const cartSubtotal = computed(() =>
  cart.value.reduce((total, item) => total + item.price * item.quantity, 0),
)
const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
const productFor = (item) => products.value.find((product) => product.id === item.productId)
const variantFor = (item) =>
  productFor(item)?.variants?.find((variant) => variant.id === item.variantId)
const imageUrl = (item) => {
  const image = productFor(item)
    ?.images?.slice()
    .sort((a, b) => a.sort_order - b.sort_order)[0]
  return image?.image_path ? `/storage/${image.image_path}` : item.imageUrl || ''
}
const setWarning = (variantId, message) => {
  warnings.value = { ...warnings.value, [variantId]: message }
}
const changeQuantity = (item, value) => {
  const stock = Number(variantFor(item)?.stock_qty ?? Infinity)
  if (Number(value) > stock) {
    setWarning(item.variantId, `Only ${stock} available.`)
    return
  }
  if (updateCartQuantity(item.variantId, value, stock)) setWarning(item.variantId, '')
}
const changeVariant = (item, variantId) => {
  const variant = productFor(item)?.variants?.find(
    (candidate) => candidate.id === Number(variantId),
  )
  if (!variant || !variant.is_active || Number(variant.stock_qty) <= 0) return
  const existing = cart.value.find((cartItem) => cartItem.variantId === variant.id)
  if (existing && existing.variantId !== item.variantId) {
    if (
      !mergeCartItem(
        item.variantId,
        { variantId: variant.id, variantName: variant.name, price: Number(variant.price) },
        Number(variant.stock_qty),
      )
    ) {
      setWarning(item.variantId, `Only ${variant.stock_qty} available for this variant.`)
    }
    return
  }
  updateCartItem(item.variantId, {
    variantId: variant.id,
    variantName: variant.name,
    price: Number(variant.price),
    quantity: Math.min(item.quantity, Number(variant.stock_qty)),
  })
}
const closeBag = () => (isBagOpen.value = false)
const openBag = () => (isBagOpen.value = true)
const closeProfile = () => (isProfileOpen.value = false)
const handleAuthUpdate = () => {
  isLoggedIn.value = isAuthenticated()
  user.value = getUser()
}
const userName = computed(() => user.value?.name || user.value?.email || 'Your account')
const handleEscape = (event) => {
  if (event.key === 'Escape') {
    closeBag()
    closeProfile()
  }
}
const handleDocumentClick = (event) => {
  if (!event.target.closest('.profile-menu')) closeProfile()
}
const signOut = async () => {
  await logout()
  closeProfile()
  router.push('/')
}

onMounted(async () => {
  refreshCart()
  try {
    products.value = await getProducts()
  } catch {
    products.value = []
  }
  window.addEventListener('cart-updated', refreshCart)
  window.addEventListener('cart-item-added', openBag)
  window.addEventListener('auth-updated', handleAuthUpdate)
  window.addEventListener('keydown', handleEscape)
  document.addEventListener('click', handleDocumentClick)
})
onUnmounted(() => {
  window.removeEventListener('cart-updated', refreshCart)
  window.removeEventListener('cart-item-added', openBag)
  window.removeEventListener('auth-updated', handleAuthUpdate)
  window.removeEventListener('keydown', handleEscape)
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <header class="site-header">
    <RouterLink to="/" class="brand" aria-label="ZANDO home">
      <span class="brand__mark">Z</span>
      <span>ZANDO</span>
    </RouterLink>
    <nav class="site-nav" aria-label="Main navigation">
      <RouterLink to="/">Shop</RouterLink>
      <RouterLink to="/about">About</RouterLink>
    </nav>
    <div class="header-actions">
      <div class="profile-menu">
        <button
          class="profile-button"
          type="button"
          aria-label="Open profile menu"
          :aria-expanded="isProfileOpen"
          aria-haspopup="menu"
          @click.stop="isProfileOpen = !isProfileOpen"
        >
          <svg class="profile-button__icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5" />
          </svg>
        </button>
        <div v-if="isProfileOpen" class="profile-dropdown" role="menu">
          <template v-if="isLoggedIn">
            <strong>{{ userName }}</strong>
            <button type="button" role="menuitem" @click="signOut">Log out</button>
          </template>
          <template v-else>
            <RouterLink to="/login" role="menuitem" @click="closeProfile">Login</RouterLink>
            <RouterLink to="/login?mode=register" role="menuitem" @click="closeProfile">
              Sign up
            </RouterLink>
          </template>
        </div>
      </div>
      <button
        class="bag-button"
        type="button"
        :aria-expanded="isBagOpen"
        aria-controls="bag-drawer"
        :aria-label="`Shopping bag, ${cartCount} items`"
        @click="isBagOpen = true"
      >
        <svg class="bag-button__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 8h14l-1 13H6L5 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
        <span>{{ cartCount }}</span>
      </button>
    </div>
  </header>
  <RouterView />

  <Transition name="bag-fade">
    <div v-if="isBagOpen" class="bag-overlay" @click.self="closeBag">
      <aside
        id="bag-drawer"
        class="bag-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bag-title"
      >
        <div class="bag-drawer__header">
          <h2 id="bag-title">
            Your bag <span>{{ cartCount }}</span>
          </h2>
          <button class="bag-drawer__close" type="button" aria-label="Close bag" @click="closeBag">
            ×
          </button>
        </div>
        <p v-if="!cart.length" class="bag-empty">Your bag is empty.</p>
        <div v-else class="bag-drawer__items">
          <article v-for="item in cart" :key="item.variantId" class="bag-item">
            <div class="bag-item__image">
              <img v-if="imageUrl(item)" :src="imageUrl(item)" :alt="item.productName" />
              <span v-else>No image</span>
            </div>
            <div class="bag-item__details">
              <strong>{{ item.productName }}</strong>
              <label>
                Size:
                <select
                  :value="item.variantId"
                  :style="{
                    width: `min(${Math.min(Math.max((item.variantName || '').length + 5, 9), 18)}ch, 100%)`,
                  }"
                  @change="changeVariant(item, $event.target.value)"
                >
                  <option
                    v-for="variant in productFor(item)?.variants || [
                      { id: item.variantId, name: item.variantName },
                    ]"
                    :key="variant.id"
                    :value="variant.id"
                    :disabled="!variant.is_active || Number(variant.stock_qty) <= 0"
                  >
                    {{ variant.name }}{{ Number(variant.stock_qty) <= 0 ? ' (out of stock)' : '' }}
                  </option>
                </select>
              </label>
              <span>{{ formatPrice(item.price) }}</span>
              <div class="bag-item__controls">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  :disabled="item.quantity <= 1"
                  @click="changeQuantity(item, item.quantity - 1)"
                >
                  −
                </button>
                <span>{{ item.quantity }}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  @click="changeQuantity(item, item.quantity + 1)"
                >
                  +
                </button>
                <button
                  class="bag-item__remove"
                  type="button"
                  aria-label="Remove item from bag"
                  title="Remove item from bag"
                  @click="removeFromCart(item.variantId)"
                >
                  🗑
                </button>
              </div>
              <small v-if="warnings[item.variantId]" class="bag-item__warning">{{
                warnings[item.variantId]
              }}</small>
            </div>
          </article>
        </div>
        <div v-if="cart.length" class="bag-drawer__footer">
          <div>
            <span>Subtotal</span><strong>{{ formatPrice(cartSubtotal) }}</strong>
          </div>
          <RouterLink to="/checkout" class="checkout-button" @click="closeBag">Checkout</RouterLink>
        </div>
      </aside>
    </div>
  </Transition>
</template>
