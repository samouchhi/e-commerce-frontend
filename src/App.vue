<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import {
  clearCart,
  getCart,
  mergeCartItem,
  removeFromCart,
  resolveCart,
  updateCartItem,
  updateCartQuantity,
} from './services/cartService'
import { getUser, isAuthenticated, logout } from './services/authService'
import { getProducts } from './services/productService'
import { getCategories } from './services/categoryService'
import { getSettings } from './services/settingsService'
import { assetUrl } from './services/api'
import { locale, setLocale, t } from './services/i18n'
import BottomNav from './components/layout/BottomNav.vue'
import CountryFlag from './components/icons/CountryFlag.vue'

const navType =
  'text-[1rem]  leading-none font-semibold  uppercase no-underline focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[5px] focus-visible:outline-accent'

const cart = ref([])
const products = ref([])
const categories = ref([])
const siteSettings = ref({})
const router = useRouter()
const warnings = ref({})
const itemPendingRemoval = ref(null)
const isBagOpen = ref(false)
const isProfileOpen = ref(false)
const isCategoryOpen = ref(false)
const isLocaleOpen = ref(false)
const isLoggedIn = ref(isAuthenticated())
const user = ref(getUser())
const refreshCart = () => (cart.value = getCart())
const cartCount = computed(() => cart.value.reduce((total, item) => total + item.quantity, 0))
const cartItemSummary = computed(() => t('cart.itemCount').replace('{count}', cartCount.value))
const cartSubtotal = computed(() =>
  cart.value.reduce(
    (total, item) => total + (item.unavailable ? 0 : item.price * item.quantity),
    0,
  ),
)
const canCheckout = computed(() => cart.value.every((item) => !item.unavailable))
const unavailableItems = computed(() => cart.value.filter((item) => item.unavailable))
const unavailableSummary = computed(() => {
  const count = unavailableItems.value.length
  const key = count === 1 ? 'cart.oneItemNeedsRemoval' : 'cart.manyItemsNeedRemoval'

  return t(key).replace('{count}', count)
})
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
const withStock = (key, stock) => t(key).replace('{stock}', stock)
const requestRemoval = (item) => (itemPendingRemoval.value = item)
const confirmRemoval = () => {
  if (!itemPendingRemoval.value) return
  removeFromCart(itemPendingRemoval.value.variantId)
  itemPendingRemoval.value = null
}
const clearBag = () => {
  clearCart()
  itemPendingRemoval.value = null
}
const changeQuantity = (item, value) => {
  const stock = Number(variantFor(item)?.stock_qty ?? Infinity)
  if (Number(value) > stock) {
    setWarning(item.variantId, withStock('cart.onlyAvailable', stock))
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
        {
          variantId: variant.id,
          variantName: variant.name,
          price: Number(variant.discounted_price ?? variant.price),
        },
        Number(variant.stock_qty),
      )
    ) {
      setWarning(item.variantId, withStock('cart.variantOnlyAvailable', variant.stock_qty))
    }
    return
  }
  updateCartItem(item.variantId, {
    variantId: variant.id,
    variantName: variant.name,
    price: Number(variant.discounted_price ?? variant.price),
    quantity: Math.min(item.quantity, Number(variant.stock_qty)),
  })
}
const closeBag = () => (isBagOpen.value = false)
const openBag = async () => {
  isBagOpen.value = true
  try {
    await resolveCart()
  } catch {
    // Keep the saved cart visible while the connection is unavailable.
  }
}
const closeProfile = () => (isProfileOpen.value = false)
const closeCategory = () => (isCategoryOpen.value = false)
const closeLocale = () => (isLocaleOpen.value = false)
const selectLocale = (nextLocale) => {
  setLocale(nextLocale)
  closeLocale()
}
const handleAuthUpdate = () => {
  isLoggedIn.value = isAuthenticated()
  user.value = getUser()
}
const userName = computed(() => user.value?.name || user.value?.email || t('profile.account'))
const handleEscape = (event) => {
  if (event.key === 'Escape') {
    closeBag()
    closeProfile()
    closeCategory()
    closeLocale()
  }
}
const handleDocumentClick = (event) => {
  if (!event.target.closest('.profile-menu')) closeProfile()
  if (!event.target.closest('.category-menu')) closeCategory()
  if (!event.target.closest('.locale-menu')) closeLocale()
}
const signOut = async () => {
  await logout()
  closeProfile()
  router.push('/')
}

onMounted(async () => {
  refreshCart()
  try {
    ;[products.value, categories.value] = await Promise.all([getProducts(), getCategories()])
  } catch {
    products.value = []
    categories.value = []
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
  <header class="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur-[12px]">
    <div
      class="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-[clamp(1.25rem,4vw,4.5rem)] py-[0.85rem] max-md:gap-4 max-md:px-5 max-md:py-4"
    >
      <RouterLink
        to="/"
        :class="['flex items-center gap-[0.7rem] text-ink', navType]"
        :aria-label="`${siteSettings.site_name || ''} home`"
      >
        <img
          v-if="siteSettings.site_logo"
          class="h-8 w-8 object-contain"
          :src="assetUrl(siteSettings.site_logo)"
          :alt="siteSettings.site_name || ''"
        />
        <span class="max-md:hidden">{{ siteSettings.site_name }}</span>
      </RouterLink>
      <nav class="flex items-center gap-2 max-md:hidden" aria-label="Main navigation">
        <RouterLink
          to="/"
          :class="[
            'inline-flex min-h-11 items-center gap-1.5 rounded-[0.2rem] px-2 text-muted transition-colors hover:bg-accent-soft hover:text-ink',
            navType,
          ]"
          exact-active-class="text-ink"
        >
          <svg
            class="h-4 w-4 fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="m3.5 10 8.5-7 8.5 7" />
            <path d="M5.5 9.5V21h13V9.5M9.5 21v-6h5v6" />
          </svg>
          {{ t('nav.home') }}
        </RouterLink>
        <RouterLink
          to="/products"
          :class="[
            'inline-flex min-h-11 items-center gap-1.5 rounded-[0.2rem] px-2 text-muted transition-colors hover:bg-accent-soft hover:text-ink',
            navType,
          ]"
          exact-active-class="text-ink"
        >
          <svg
            class="h-4 w-4 fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <rect x="4" y="4" width="6" height="6" rx="1" />
            <rect x="14" y="4" width="6" height="6" rx="1" />
            <rect x="4" y="14" width="6" height="6" rx="1" />
            <rect x="14" y="14" width="6" height="6" rx="1" />
          </svg>
          {{ t('nav.products') }}
        </RouterLink>
        <RouterLink
          to="/promotion"
          :class="[
            'inline-flex min-h-11 items-center gap-1.5 rounded-[0.2rem] px-2 text-muted transition-colors hover:bg-accent-soft hover:text-ink',
            navType,
          ]"
          exact-active-class="text-ink"
        >
          <svg
            class="h-4 w-4 fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M4 12V5h7l9 9-7 7-9-9Z" />
            <circle cx="8.5" cy="8.5" r="1" />
          </svg>
          {{ t('nav.promotions') }}
        </RouterLink>
        <div
          class="category-menu relative"
          @mouseenter="isCategoryOpen = true"
          @mouseleave="closeCategory"
          @focusin="isCategoryOpen = true"
          @focusout="!$event.currentTarget.contains($event.relatedTarget) && closeCategory()"
        >
          <button
            :class="[
              'flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[0.2rem] border-0 bg-transparent px-2 text-muted transition-colors hover:bg-accent-soft hover:text-ink focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[5px] focus-visible:outline-accent',
              navType,
              isCategoryOpen ? 'text-ink' : '',
            ]"
            type="button"
            :aria-expanded="isCategoryOpen"
            aria-haspopup="menu"
          >
            <svg
              class="h-4 w-4 fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z" />
            </svg>
            {{ t('nav.category') }}
            <svg
              :class="[
                'h-3 w-3 fill-none stroke-current stroke-[2] transition-transform duration-150 [stroke-linecap:round] [stroke-linejoin:round] motion-reduce:transition-none',
                isCategoryOpen ? 'rotate-180' : '',
              ]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div
            v-if="isCategoryOpen"
            class="absolute left-0 top-full z-30 min-w-52 overflow-hidden border border-line bg-paper shadow-[0_18px_40px_rgba(32,35,33,0.14)]"
            role="menu"
            aria-label="Categories"
          >
            <RouterLink
              v-for="category in categories"
              :key="category.id"
              :to="{ path: '/products', query: { category: category.id } }"
              class="block min-h-11 border-t border-line px-4 py-3 text-[0.7rem] font-bold tracking-[0.08em] text-muted uppercase no-underline transition-colors hover:bg-accent-soft hover:text-ink focus-visible:bg-accent-soft focus-visible:text-ink focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-accent"
              role="menuitem"
              @click="closeCategory"
            >
              {{ category.name }}
            </RouterLink>
          </div>
        </div>
      </nav>
      <div class="flex items-center gap-[0.8rem]">
        <div class="locale-menu relative order-0">
          <button
            :class="[
              'flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 border-0 px-2 text-ink transition-colors duration-150 hover:bg-accent-soft focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none',
              isLocaleOpen ? 'bg-accent-soft' : 'bg-transparent',
            ]"
            type="button"
            :aria-label="`${t('language.english')} / ${t('language.khmer')}`"
            :aria-expanded="isLocaleOpen"
            aria-controls="locale-menu"
            aria-haspopup="menu"
            @click.stop="isLocaleOpen = !isLocaleOpen"
          >
            <CountryFlag :country="locale === 'km' ? 'kh' : 'us'" class="h-5" />
            <svg
              :class="[
                'h-3 w-3 fill-none stroke-current stroke-[2] transition-transform duration-150 [stroke-linecap:round] [stroke-linejoin:round] motion-reduce:transition-none',
                isLocaleOpen ? 'rotate-180' : '',
              ]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div
            v-if="isLocaleOpen"
            id="locale-menu"
            class="absolute top-[calc(100%+0.65rem)] right-0 z-30 w-56 overflow-hidden border border-line bg-paper p-1.5 shadow-[0_18px_40px_rgba(32,35,33,0.14)]"
            role="menu"
            aria-label="Language"
          >
            <button
              :class="[
                'flex min-h-14 w-full cursor-pointer items-center gap-4 border-0 px-4 text-left text-base text-ink transition-colors hover:bg-accent-soft focus-visible:bg-accent-soft focus-visible:outline-none',
                locale === 'en' ? 'bg-accent-soft font-semibold' : 'bg-transparent',
              ]"
              type="button"
              role="menuitemradio"
              :aria-checked="locale === 'en'"
              @click="selectLocale('en')"
            >
              <CountryFlag country="us" class="h-5 shrink-0" />
              {{ t('language.english') }}
            </button>
            <button
              :class="[
                'flex min-h-14 w-full cursor-pointer items-center gap-4 border-0 px-4 text-left text-base text-ink transition-colors hover:bg-accent-soft focus-visible:bg-accent-soft focus-visible:outline-none',
                locale === 'km' ? 'bg-accent-soft font-semibold' : 'bg-transparent',
              ]"
              type="button"
              role="menuitemradio"
              :aria-checked="locale === 'km'"
              @click="selectLocale('km')"
            >
              <CountryFlag country="kh" class="h-5 shrink-0" />
              {{ t('language.khmer') }}
            </button>
          </div>
        </div>
        <div class="profile-menu relative order-2">
          <button
            :class="[
              'flex min-h-11 min-w-11 cursor-pointer items-center justify-center border-0 p-2 text-ink transition-colors duration-150 hover:text-accent focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-accent motion-reduce:transition-none',
              isProfileOpen ? 'bg-accent-soft' : 'bg-transparent',
            ]"
            type="button"
            :aria-label="isProfileOpen ? t('profile.closeMenu') : t('profile.openMenu')"
            :aria-expanded="isProfileOpen"
            aria-haspopup="menu"
            @click.stop="isProfileOpen = !isProfileOpen"
          >
            <svg
              class="h-[1.55rem] w-[1.55rem] fill-none stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5" />
            </svg>
          </button>
          <div
            v-if="isProfileOpen"
            class="absolute right-0 top-[calc(100%+0.65rem)] z-30 w-[min(18rem,calc(100vw-2rem))] overflow-hidden border border-line bg-paper shadow-[0_18px_40px_rgba(32,35,33,0.14)]"
            role="menu"
            :aria-label="t('profile.menu')"
          >
            <template v-if="isLoggedIn">
              <div class="flex items-center gap-3 border-b border-line px-4 py-4">
                <span
                  class="flex h-10 w-10 shrink-0 items-center justify-center bg-accent-soft text-ink"
                  aria-hidden="true"
                >
                  <svg
                    class="h-5 w-5 fill-none stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5" />
                  </svg>
                </span>
                <div class="min-w-0">
                  <p class="m-0 text-[0.72rem] font-bold text-muted uppercase">
                    {{ t('profile.signedInAs') }}
                  </p>
                  <p
                    class="mt-1 truncate text-[0.95rem] leading-tight font-semibold text-ink"
                    :title="userName"
                  >
                    {{ userName }}
                  </p>
                </div>
              </div>
              <div class="grid gap-1 p-2">
                <RouterLink
                  to="/orders"
                  class="group flex min-h-11 items-center gap-3 px-3 text-left text-[0.7rem] font-bold text-ink uppercase no-underline transition-colors duration-150 hover:bg-accent-soft focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-accent motion-reduce:transition-none"
                  role="menuitem"
                  @click="closeProfile"
                >
                  <svg
                    class="h-[1.15rem] w-[1.15rem] shrink-0 fill-none stroke-current stroke-[1.7] text-muted transition-colors group-hover:text-ink [stroke-linecap:round] [stroke-linejoin:round] motion-reduce:transition-none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M6 3h9l3 3v15H6z" />
                    <path d="M15 3v4h4M9 12h6M9 16h6" />
                  </svg>
                  <span class="flex-1 text-[0.8rem]">{{ t('profile.myOrders') }}</span>
                  <svg
                    class="h-4 w-4 text-muted transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </RouterLink>
                <button
                  class="group flex min-h-11 w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-3 text-left text-[0.8rem] font-bold text-ink uppercase transition-colors duration-150 hover:bg-danger-soft hover:text-danger-strong focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-accent motion-reduce:transition-none"
                  type="button"
                  role="menuitem"
                  @click="signOut"
                >
                  <svg
                    class="h-[1.15rem] w-[1.15rem] shrink-0 fill-none stroke-current stroke-[1.7] text-muted transition-colors group-hover:text-danger-strong [stroke-linecap:round] [stroke-linejoin:round] motion-reduce:transition-none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M10 5H6v14h4M14 8l4 4-4 4M18 12H9" />
                  </svg>
                  <span class="flex-1">{{ t('profile.logOut') }}</span>
                </button>
              </div>
            </template>
            <template v-else>
              <div class="flex items-center gap-3 border-b border-line px-4 py-4">
                <span
                  class="flex h-10 w-10 shrink-0 items-center justify-center bg-accent-soft text-ink"
                  aria-hidden="true"
                >
                  <svg
                    class="h-5 w-5 fill-none stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5" />
                  </svg>
                </span>
                <div>
                  <p class="m-0 text-[0.95rem] font-semibold text-ink">
                    {{ t('profile.account') }}
                  </p>
                  <p class="mt-1 mb-0 text-[0.8rem] leading-tight text-muted">
                    {{ t('profile.signInToOrders') }}
                  </p>
                </div>
              </div>
              <div class="grid gap-1 p-2">
                <RouterLink
                  to="/login"
                  class="group flex min-h-11 items-center gap-3 px-3 text-left text-[0.8rem] font-bold text-ink uppercase no-underline transition-colors duration-150 hover:bg-accent-soft focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-accent motion-reduce:transition-none"
                  role="menuitem"
                  @click="closeProfile"
                >
                  <svg
                    class="h-[1.15rem] w-[1.15rem] shrink-0 fill-none stroke-current stroke-[1.7] text-muted group-hover:text-ink [stroke-linecap:round] [stroke-linejoin:round]"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M10 5H6v14h4M14 8l4 4-4 4M18 12H9" />
                  </svg>
                  <span class="flex-1">{{ t('profile.logIn') }}</span>
                  <svg
                    class="h-4 w-4 text-muted transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </RouterLink>
                <RouterLink
                  to="/login?mode=register"
                  class="group flex min-h-11 items-center gap-3 px-3 text-left text-[0.8rem] font-bold text-ink uppercase no-underline transition-colors duration-150 hover:bg-accent-soft focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-accent motion-reduce:transition-none"
                  role="menuitem"
                  @click="closeProfile"
                >
                  <svg
                    class="h-[1.15rem] w-[1.15rem] shrink-0 fill-none stroke-current stroke-[1.7] text-muted group-hover:text-ink [stroke-linecap:round] [stroke-linejoin:round]"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5M19 5v6M16 8h6" />
                  </svg>
                  <span class="flex-1">{{ t('profile.createAccount') }}</span>
                  <svg
                    class="h-4 w-4 text-muted transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </RouterLink>
              </div>
            </template>
          </div>
        </div>
        <button
          :class="[
            'relative order-1 inline-flex cursor-pointer items-center justify-center border-0 bg-transparent p-2 text-ink',
            navType,
          ]"
          type="button"
          :aria-expanded="isBagOpen"
          aria-controls="bag-drawer"
          :aria-label="`Shopping bag, ${cartCount} items`"
          @click="openBag"
        >
          <svg
            class="h-7 w-7 fill-none stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M5 8h14l-1 13H6L5 8Z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
          <span
            v-if="cartCount"
            class="absolute right-0 top-0 flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-red-500 p-[0.15rem] text-[0.55rem] leading-none font-bold text-white"
          >
            {{ cartCount }}
          </span>
        </button>
      </div>
    </div>
  </header>
  <RouterView />

  <footer
    class="mt-auto border-t-[3px] border-accent bg-accent-soft/55 px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(2rem,4vw,3.5rem)] max-md:px-5"
  >
    <div
      class="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-x-[clamp(1.5rem,3vw,3.5rem)] gap-y-9 sm:grid-cols-2 xl:grid-cols-12"
    >
      <div class="grid min-w-0 content-start gap-4 xl:col-span-4">
        <img
          v-if="siteSettings.site_logo"
          class="block h-auto max-h-14 max-w-52 object-contain object-left"
          :src="assetUrl(siteSettings.site_logo)"
          :alt="siteSettings.site_name || 'Store logo'"
        />
        <p
          v-if="siteSettings.site_description"
          class="m-0 max-w-[32rem] text-[1rem] leading-[1.65] text-muted not-italic text-pretty"
        >
          {{ siteSettings.site_description }}
        </p>
      </div>
      <div
        v-if="siteSettings.site_address || siteSettings.site_email || siteSettings.site_phone"
        class="grid min-w-0 content-start gap-4 xl:col-span-3"
      >
        <span class="text-[1rem] font-bold text-accent uppercase">{{ t('footer.contact') }}</span>
        <address
          class="m-0 grid max-w-[25rem] gap-3 text-[1rem] leading-[1.5] text-muted not-italic"
        >
          <span v-if="siteSettings.site_address" class="flex items-start gap-2.5">
            <svg
              class="mt-[0.1rem] h-4 w-4 shrink-0 fill-none stroke-current stroke-[1.8] text-ink [stroke-linecap:round] [stroke-linejoin:round]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M20 10.5C20 16 12 21 12 21S4 16 4 10.5a8 8 0 1 1 16 0Z" />
              <circle cx="12" cy="10.5" r="2.5" />
            </svg>
            <span>{{ siteSettings.site_address }}</span>
          </span>
          <a
            v-if="siteSettings.site_email"
            class="inline-flex min-h-6 items-center text-[1rem] gap-2.5 text-muted no-underline transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-solid focus-visible:outline-[2px] focus-visible:outline-offset-4 focus-visible:outline-accent"
            :href="`mailto:${siteSettings.site_email}`"
          >
            <svg
              class="h-4 w-4 shrink-0 fill-none stroke-current stroke-[1.8] text-ink [stroke-linecap:round] [stroke-linejoin:round]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m4 7 8 6 8-6" />
            </svg>
            {{ siteSettings.site_email }}
          </a>
          <a
            v-if="siteSettings.site_phone"
            class="inline-flex min-h-6 items-center text-[1rem] gap-2.5 text-muted no-underline transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-solid focus-visible:outline-[2px] focus-visible:outline-offset-4 focus-visible:outline-accent"
            :href="`tel:${siteSettings.site_phone}`"
          >
            <svg
              class="h-4 w-4 shrink-0 fill-none stroke-current stroke-[1.8] text-ink [stroke-linecap:round] [stroke-linejoin:round]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M5 4h3l2 5-2 1.5c1.2 2.5 3 4.3 5.5 5.5L15 14l5 2v3c0 1.1-.9 2-2 2C10.3 21 3 13.7 3 6c0-1.1.9-2 2-2Z"
              />
            </svg>
            {{ siteSettings.site_phone }}
          </a>
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
        class="grid min-w-0 content-start gap-4 xl:col-span-3"
        aria-label="Social links"
      >
        <span class="text-[1rem] font-bold text-accent uppercase">{{ t('footer.follow') }}</span>
        <div class="flex flex-wrap gap-2">
          <a
            v-if="siteSettings.site_facebook_url"
            class="social-label inline-flex min-h-11 items-center justify-start gap-[0.65rem] rounded-[0.2rem] bg-paper px-3 text-muted transition-[background-color,color,transform] duration-150 hover:bg-accent hover:text-white focus-visible:bg-accent focus-visible:text-white focus-visible:outline-solid focus-visible:outline-[2px] focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.96] motion-reduce:transition-none"
            :href="siteSettings.site_facebook_url"
            target="_blank"
            rel="noreferrer"
            aria-label="Facebook"
            title="Facebook"
          >
            <svg
              class="h-5 w-5 flex-[0_0_1.25rem] fill-current stroke-current stroke-[1.5]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M14 8h3V4h-3c-3.3 0-5 1.8-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9c0-.7.3-1 1-1Z" />
            </svg>
          </a>
          <a
            v-if="siteSettings.site_twitter_url"
            class="social-label inline-flex min-h-11 items-center justify-start gap-[0.65rem] rounded-[0.2rem] bg-paper px-3 text-muted transition-[background-color,color,transform] duration-150 hover:bg-accent hover:text-white focus-visible:bg-accent focus-visible:text-white focus-visible:outline-solid focus-visible:outline-[2px] focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.96] motion-reduce:transition-none"
            :href="siteSettings.site_twitter_url"
            target="_blank"
            rel="noreferrer"
            aria-label="Twitter"
            title="Twitter"
          >
            <svg
              class="h-5 w-5 flex-[0_0_1.25rem] fill-current stroke-current stroke-[1.5]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M18.2 3H21l-6.1 7 7.2 11h-5.6l-4.4-6.7L6.3 21H3.5l6.5-7.5L3 3h5.7l4 6.1L18.2 3Zm-1 16h1.6L7.8 4.9H6.1L17.2 19Z"
              />
            </svg>
          </a>
          <a
            v-if="siteSettings.site_instagram_url"
            class="social-label inline-flex min-h-11 items-center justify-start gap-[0.65rem] rounded-[0.2rem] bg-paper px-3 text-muted transition-[background-color,color,transform] duration-150 hover:bg-accent hover:text-white focus-visible:bg-accent focus-visible:text-white focus-visible:outline-solid focus-visible:outline-[2px] focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.96] motion-reduce:transition-none"
            :href="siteSettings.site_instagram_url"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            title="Instagram"
          >
            <svg
              class="h-5 w-5 flex-[0_0_1.25rem] fill-current stroke-current stroke-[1.5]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" />
            </svg>
          </a>
          <a
            v-if="siteSettings.site_linkedin_url"
            class="social-label inline-flex min-h-11 items-center justify-start gap-[0.65rem] rounded-[0.2rem] bg-paper px-3 text-muted transition-[background-color,color,transform] duration-150 hover:bg-accent hover:text-white focus-visible:bg-accent focus-visible:text-white focus-visible:outline-solid focus-visible:outline-[2px] focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.96] motion-reduce:transition-none"
            :href="siteSettings.site_linkedin_url"
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
            title="LinkedIn"
          >
            <svg
              class="h-5 w-5 flex-[0_0_1.25rem] fill-current stroke-current stroke-[1.5]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M5 8H2v13h3V8Zm.2-4.2C5.2 2.8 4.5 2 3.5 2S1.8 2.8 1.8 3.8s.7 1.8 1.7 1.8 1.7-.8 1.7-1.8ZM22 13.6c0-3.9-2.1-5.9-5-5.9-2.3 0-3.3 1.3-3.9 2.2V8H10v13h3v-6.7c0-1.8.3-3.5 2.5-3.5 2.1 0 2.2 2 2.2 3.6V21h3l.3-7.4Z"
              />
            </svg>
          </a>
          <a
            v-if="siteSettings.site_youtube_url"
            class="social-label inline-flex min-h-11 items-center justify-start gap-[0.65rem] rounded-[0.2rem] bg-paper px-3 text-muted transition-[background-color,color,transform] duration-150 hover:bg-accent hover:text-white focus-visible:bg-accent focus-visible:text-white focus-visible:outline-solid focus-visible:outline-[2px] focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.96] motion-reduce:transition-none"
            :href="siteSettings.site_youtube_url"
            target="_blank"
            rel="noreferrer"
            aria-label="YouTube"
            title="YouTube"
          >
            <svg
              class="h-5 w-5 flex-[0_0_1.25rem] fill-current stroke-current stroke-[1.5]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8C22 15.2 22 12 22 12s0-3.2-.4-4.8ZM10 15.5v-7l6 3.5-6 3.5Z"
              />
            </svg>
          </a>
          <a
            v-if="siteSettings.site_telegram_url"
            class="social-label inline-flex min-h-11 items-center justify-start gap-[0.65rem] rounded-[0.2rem] bg-paper px-3 text-muted transition-[background-color,color,transform] duration-150 hover:bg-accent hover:text-white focus-visible:bg-accent focus-visible:text-white focus-visible:outline-solid focus-visible:outline-[2px] focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.96] motion-reduce:transition-none"
            :href="siteSettings.site_telegram_url"
            target="_blank"
            rel="noreferrer"
            aria-label="Telegram"
            title="Telegram"
          >
            <svg
              class="h-5 w-5 flex-[0_0_1.25rem] fill-current stroke-current stroke-[1.5]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="m21.6 3.4-3 17.1c-.2 1.2-.9 1.5-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L6 14.1l-5-1.6c-1.1-.3-1.1-1 .2-1.5L20.7 3c.9-.3 1.5.2.9.4Z"
              />
            </svg>
          </a>
        </div>
      </nav>
      <div class="grid min-w-0 content-start gap-4 xl:col-span-2">
        <span class="text-[1rem] font-bold text-accent uppercase">{{ t('footer.payment') }}</span>
        <div
          class="flex h-16 w-32 items-center justify-center border border-line bg-paper p-2 shadow-[0_2px_8px_rgba(32,35,33,0.06)]"
        >
          <img
            class="block h-full max-w-full object-contain"
            src="/payment-abakhqr.webp"
            alt="Bakong payment"
          />
        </div>
      </div>
    </div>
  </footer>

  <BottomNav :is-logged-in="isLoggedIn" />

  <Transition name="bag-fade">
    <div
      v-if="isBagOpen"
      class="bag-overlay fixed inset-0 z-20 bg-[rgba(32,35,33,0.35)]"
      @click.self="closeBag"
    >
      <aside
        id="bag-drawer"
        class="bag-drawer ml-auto flex h-full w-[min(100%,430px)] max-w-[430px] flex-col bg-paper p-4 shadow-[-12px_0_35px_rgba(32,35,33,0.15)] sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bag-title"
      >
        <div class="flex items-center justify-between border-b border-line pb-3">
          <h2 id="bag-title" class="flex items-center gap-2 text-[1.1rem] font-semibold text-ink">
            <svg
              class="h-5 w-5 fill-none stroke-current stroke-[1.8]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M3 4h2l2 12h10l2-8H6" />
              <circle cx="9" cy="19" r="1" />
              <circle cx="17" cy="19" r="1" />
            </svg>
            {{ t('cart.title') }}
          </h2>
          <button
            class="flex size-9 cursor-pointer items-center justify-center rounded-md border border-line bg-paper text-[1.55rem] leading-none text-[#6c451a] transition-colors hover:bg-accent-soft focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#6c451a] active:scale-[0.96]"
            type="button"
            :aria-label="t('cart.closeBag')"
            @click="closeBag"
          >
            ×
          </button>
        </div>

        <div
          v-if="cart.length"
          class="flex items-center justify-between py-2 text-[0.82rem] text-muted"
        >
          <span class="tabular-nums">{{ cartItemSummary }}</span>
          <button
            class="flex min-h-9 cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[0.78rem] font-semibold text-sale hover:text-danger-strong focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-danger active:scale-[0.96]"
            type="button"
            @click="clearBag"
          >
            <svg
              class="size-4 fill-none stroke-current stroke-[1.8]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
            </svg>
            {{ t('cart.clearCart') }}
          </button>
        </div>
        <p v-if="!cart.length" class="py-8 text-[0.8rem] text-muted">{{ t('cart.empty') }}</p>
        <div
          v-if="unavailableItems.length"
          class="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-l-4 border-danger bg-danger-soft p-3 text-danger"
          role="alert"
        >
          <svg
            class="mt-0.5 h-4 w-4 shrink-0 fill-none stroke-current stroke-[2]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M12 8v5m0 4v.01M10.3 3.8 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"
            />
          </svg>
          <p class="m-0 text-[0.82rem] leading-[1.4]">
            <strong>{{ t('cart.checkoutPaused') }}.</strong> {{ unavailableSummary }}
          </p>
        </div>

        <div v-if="cart.length" class="scrollbar-none mt-2 flex-1 space-y-3 overflow-y-auto pb-4">
          <article
            v-for="item in cart"
            :key="item.variantId"
            :class="[
              'relative rounded-lg border border-line bg-paper p-3 shadow-[0_1px_2px_rgba(17,17,17,0.03)]',
              item.unavailable ? 'border-danger-line bg-danger-soft' : '',
            ]"
          >
            <div class="grid grid-cols-[5rem_minmax(0,1fr)_2rem] gap-3">
              <div
                class="flex size-20 items-center justify-center overflow-hidden rounded-md bg-accent-soft outline outline-black/10"
              >
                <img
                  v-if="imageUrl(item)"
                  class="h-full w-full object-cover"
                  :src="imageUrl(item)"
                  :alt="item.productName"
                />
                <span v-else class="text-center text-[0.55rem] text-muted">{{
                  t('cart.noImage')
                }}</span>
              </div>
              <div class="min-w-0">
                <strong
                  class="block text-[0.9rem] leading-[1.35] font-semibold text-ink [overflow-wrap:anywhere]"
                  >{{ item.productName }}</strong
                >
                <p
                  v-if="item.unavailable"
                  class="mt-1 mb-0 text-[0.72rem] leading-[1.35] text-danger"
                  role="alert"
                >
                  {{ t('cart.productUnavailable') }}
                </p>
                <div class="mt-2 flex items-baseline gap-2 tabular-nums">
                  <span
                    :class="
                      item.unavailable ? 'text-muted line-through' : 'font-semibold text-sale'
                    "
                    >{{ formatPrice(item.price) }}</span
                  >
                  <span v-if="item.originalPrice" class="text-[0.78rem] text-muted line-through">{{
                    formatPrice(item.originalPrice)
                  }}</span>
                </div>
                <select
                  v-if="!item.unavailable"
                  :aria-label="t('cart.size')"
                  class="select-chevron mt-2 min-h-8 max-w-full cursor-pointer rounded border border-line bg-paper py-1 pr-7 pl-2 text-[0.88rem] font-semibold text-ink transition-[border-color,background-color] duration-[160ms] focus-visible:border-accent focus-visible:outline-none"
                  :value="item.variantId"
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
                    {{ variant.name
                    }}{{ Number(variant.stock_qty) <= 0 ? ` (${t('cart.outOfStock')})` : '' }}
                  </option>
                </select>
              </div>
              <button
                class="flex size-8 cursor-pointer items-center justify-center self-start rounded text-sale transition-colors hover:bg-danger-soft focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-danger active:scale-[0.96]"
                type="button"
                :aria-label="t('cart.removeFromBag')"
                :title="t('cart.removeFromBag')"
                @click="requestRemoval(item)"
              >
                <svg
                  class="size-4 fill-none stroke-current stroke-[1.8]"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                </svg>
              </button>
            </div>
            <div class="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
              <div v-if="!item.unavailable" class="flex items-center gap-1">
                <button
                  class="flex size-9 cursor-pointer items-center justify-center border-0 bg-transparent text-[1.15rem] text-ink transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:text-line focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-accent active:scale-[0.96]"
                  type="button"
                  :aria-label="t('cart.decreaseQuantity')"
                  :disabled="item.quantity <= 1"
                  @click="changeQuantity(item, item.quantity - 1)"
                >
                  −
                </button>
                <span
                  class="flex h-9 min-w-9 items-center justify-center rounded bg-accent-soft px-2 text-[0.8rem] font-semibold text-ink tabular-nums"
                  >{{ item.quantity }}</span
                >
                <button
                  class="flex size-9 cursor-pointer items-center justify-center border-0 bg-transparent text-[1.15rem] text-ink transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:text-line focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-accent active:scale-[0.96]"
                  type="button"
                  :aria-label="t('cart.increaseQuantity')"
                  @click="changeQuantity(item, item.quantity + 1)"
                >
                  +
                </button>
              </div>
              <span v-else class="text-[0.72rem] font-semibold text-danger">{{
                t('cart.unavailable')
              }}</span>
              <p class="m-0 justify-self-end text-right text-[0.78rem] text-muted">
                {{ t('cart.total') }}:
                <strong
                  :class="[
                    'text-[0.9rem] tabular-nums',
                    item.unavailable ? 'text-muted line-through' : 'text-sale',
                  ]"
                  >{{ formatPrice(item.price * item.quantity) }}</strong
                >
              </p>
            </div>
            <small
              v-if="warnings[item.variantId]"
              class="mt-2 block text-[0.68rem] text-danger"
              role="status"
              >{{ warnings[item.variantId] }}</small
            >
            <button
              v-if="itemPendingRemoval?.variantId === item.variantId"
              class="rounded absolute top-[3.5rem] right-0 z-10 grid w-[min(19rem,calc(100%-0.5rem))] gap-4 border border-line bg-paper p-3 shadow-[0_12px_28px_rgba(32,35,33,0.2)]"
              role="dialog"
              :aria-label="t('cart.confirmRemoval')"
            >
              <p class="m-0 text-[1.05rem] font-semibold text-ink">{{ t('cart.confirmRemove') }}</p>
              <div class="flex justify-end gap-3">
                <button
                  class="min-h-8 px-4 text-[0.7rem] font-bold text-muted hover:text-ink hover:bg-accent-soft cursor-pointer"
                  type="button"
                  @click="itemPendingRemoval = null"
                >
                  {{ t('cart.no') }}
                </button>
                <button
                  class="min-h-8 rounded bg-accent px-3 text-[0.7rem] font-bold text-white active:scale-[0.96] cursor-pointer hover:bg-red-500"
                  type="button"
                  @click="confirmRemoval"
                >
                  {{ t('cart.yesRemove') }}
                </button>
              </div>
            </button>
          </article>
        </div>

        <div v-if="cart.length" class="mt-auto grid shrink-0 gap-3 border-t border-line pt-3">
          <div class="flex justify-between">
            <span class="text-[0.9rem] font-semibold text-muted">{{ t('cart.subtotal') }}:</span>
            <strong class="text-[1.4rem] font-bold text-sale tabular-nums">{{
              formatPrice(cartSubtotal)
            }}</strong>
          </div>
          <RouterLink
            v-if="canCheckout"
            to="/checkout"
            class="flex min-h-11 w-full items-center justify-center gap-2 rounded bg-accent px-4 py-3 text-center text-[0.88rem] font-bold text-white no-underline transition-colors focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#6c451a] active:scale-[0.96]"
            @click="closeBag"
            ><svg
              class="size-5 fill-none stroke-current stroke-[2]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="m5 12 4 4L19 6" /></svg
            >{{ t('checkout.title') }}</RouterLink
          >
          <button
            v-else
            class="min-h-11 w-full cursor-not-allowed rounded bg-muted px-4 py-3 text-center text-[0.88rem] font-bold text-white"
            type="button"
            disabled
          >
            {{ t('cart.fixCart') }}
          </button>
        </div>
      </aside>
    </div>
  </Transition>
</template>
