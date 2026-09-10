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
import { getSettings } from './services/settingsService'
import { assetUrl } from './services/api'

const cart = ref([])
const products = ref([])
const siteSettings = ref({})
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
  return image?.image_path ? assetUrl(`/storage/${image.image_path}`) : assetUrl(item.imageUrl)
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
  try {
    siteSettings.value = await getSettings()
    document.title = siteSettings.value.site_name || ''
    const favicon = document.querySelector('link[rel="icon"]')
    if (siteSettings.value.site_favicon) {
      const faviconLink = favicon || document.createElement('link')
      faviconLink.rel = 'icon'
      faviconLink.href = assetUrl(siteSettings.value.site_favicon)
      if (!favicon) document.head.appendChild(faviconLink)
    } else {
      favicon?.remove()
    }
  } catch {
    document.title = siteSettings.value.site_name || ''
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
    <RouterLink to="/" class="brand" :aria-label="`${siteSettings.site_name || ''} home`">
      <img
        v-if="siteSettings.site_logo"
        class="brand__logo"
        :src="assetUrl(siteSettings.site_logo)"
        :alt="siteSettings.site_name || ''"
      />
      <span>{{ siteSettings.site_name }}</span>
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

  <footer class="site-footer">
    <div class="site-footer__inner">
      <div class="site-footer__identity">
        <img
          v-if="siteSettings.site_logo"
          class="site-footer__logo"
          :src="assetUrl(siteSettings.site_logo)"
          :alt="siteSettings.site_name || 'Store logo'"
        />
        <p v-if="siteSettings.site_description" class="site-footer__description">
          {{ siteSettings.site_description }}
        </p>
      </div>
      <div
        v-if="siteSettings.site_address || siteSettings.site_email || siteSettings.site_phone"
        class="site-footer__contact"
      >
        <span class="site-footer__label">Contact</span>
        <address>
          <span v-if="siteSettings.site_address">{{ siteSettings.site_address }}</span>
          <a v-if="siteSettings.site_email" :href="`mailto:${siteSettings.site_email}`">{{
            siteSettings.site_email
          }}</a>
          <a v-if="siteSettings.site_phone" :href="`tel:${siteSettings.site_phone}`">{{
            siteSettings.site_phone
          }}</a>
        </address>
      </div>
      <nav
        v-if="
          siteSettings.site_facebook_url ||
          siteSettings.site_twitter_url ||
          siteSettings.site_instagram_url ||
          siteSettings.site_linkedin_url ||
          siteSettings.site_youtube_url ||
          siteSettings.site_telegram_url
        "
        class="site-footer__socials"
        aria-label="Social links"
      >
        <span class="site-footer__label">Follow</span>
        <div>
          <a
            v-if="siteSettings.site_facebook_url"
            class="site-footer__social-link"
            :href="siteSettings.site_facebook_url"
            target="_blank"
            rel="noreferrer"
            aria-label="Facebook"
            title="Facebook"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 8h3V4h-3c-3.3 0-5 1.8-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9c0-.7.3-1 1-1Z" />
            </svg>
          </a>
          <a
            v-if="siteSettings.site_twitter_url"
            class="site-footer__social-link"
            :href="siteSettings.site_twitter_url"
            target="_blank"
            rel="noreferrer"
            aria-label="Twitter"
            title="Twitter"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M18.2 3H21l-6.1 7 7.2 11h-5.6l-4.4-6.7L6.3 21H3.5l6.5-7.5L3 3h5.7l4 6.1L18.2 3Zm-1 16h1.6L7.8 4.9H6.1L17.2 19Z"
              />
            </svg>
          </a>
          <a
            v-if="siteSettings.site_instagram_url"
            class="site-footer__social-link"
            :href="siteSettings.site_instagram_url"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            title="Instagram"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" />
            </svg>
          </a>
          <a
            v-if="siteSettings.site_linkedin_url"
            class="site-footer__social-link"
            :href="siteSettings.site_linkedin_url"
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
            title="LinkedIn"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 8H2v13h3V8Zm.2-4.2C5.2 2.8 4.5 2 3.5 2S1.8 2.8 1.8 3.8s.7 1.8 1.7 1.8 1.7-.8 1.7-1.8ZM22 13.6c0-3.9-2.1-5.9-5-5.9-2.3 0-3.3 1.3-3.9 2.2V8H10v13h3v-6.7c0-1.8.3-3.5 2.5-3.5 2.1 0 2.2 2 2.2 3.6V21h3l.3-7.4Z"
              />
            </svg>
          </a>
          <a
            v-if="siteSettings.site_youtube_url"
            class="site-footer__social-link"
            :href="siteSettings.site_youtube_url"
            target="_blank"
            rel="noreferrer"
            aria-label="YouTube"
            title="YouTube"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8C22 15.2 22 12 22 12s0-3.2-.4-4.8ZM10 15.5v-7l6 3.5-6 3.5Z"
              />
            </svg>
          </a>
          <a
            v-if="siteSettings.site_telegram_url"
            class="site-footer__social-link"
            :href="siteSettings.site_telegram_url"
            target="_blank"
            rel="noreferrer"
            aria-label="Telegram"
            title="Telegram"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="m21.6 3.4-3 17.1c-.2 1.2-.9 1.5-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L6 14.1l-5-1.6c-1.1-.3-1.1-1 .2-1.5L20.7 3c.9-.3 1.5.2.9.4Z"
              />
            </svg>
          </a>
        </div>
      </nav>
      <div class="site-footer__payment">
        <span class="site-footer__label">We Accept</span>
        <img class="site-footer__payment-icon" src="/payment-abakhqr.webp" alt="Bakong payment" />
      </div>
    </div>
  </footer>

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
