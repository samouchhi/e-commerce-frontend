<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
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
import ShoppingBag from './components/ShoppingBag.vue'
import BottomNav from './components/layout/BottomNav.vue'
import MobileMenu from './components/layout/MobileMenu.vue'
import CountryFlag from './components/icons/CountryFlag.vue'
import StoreFooter from './components/layout/StoreFooter.vue'
import StoreIcon from './components/icons/StoreIcon.vue'
import { productSlug } from './utils/slug'
import { pageTitle } from './utils/pageTitle'

const navType =
  'text-sm leading-normal font-medium no-underline focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent'

const cart = ref([])
const products = ref([])
const categories = ref([])
const siteSettings = ref({})
const router = useRouter()
const route = useRoute()
const headerSearch = ref(String(route.query.q || ''))
watch(
  () => route.query.q,
  (value) => {
    headerSearch.value = String(value || '')
  },
)
const searchProducts = () =>
  router.push({
    path: '/products',
    query: headerSearch.value.trim() ? { q: headerSearch.value.trim() } : {},
  })
const warnings = ref({})
const itemPendingRemoval = ref(null)
const isBagOpen = ref(false)
const isBagLoading = ref(false)
const bagError = ref('')
let bagReturnFocus
const restoreBagFocus = (event) => {
  event.preventDefault()
  const target = bagReturnFocus?.isConnected
    ? bagReturnFocus
    : document.querySelector('[aria-controls="bag-drawer"]')
  target?.focus()
}
const isProfileOpen = ref(false)
const isCategoryOpen = ref(false)
const isLocaleOpen = ref(false)
const isLoggedIn = ref(isAuthenticated())
const user = ref(getUser())
const refreshCart = () => (cart.value = getCart())
const cartCount = computed(() => cart.value.reduce((total, item) => total + item.quantity, 0))
const cartSubtotal = computed(() =>
  cart.value.reduce(
    (total, item) => total + (item.unavailable ? 0 : item.price * item.quantity),
    0,
  ),
)
const canCheckout = computed(() => cart.value.every((item) => !item.unavailable))
const productFor = (item) => products.value.find((product) => product.id === item.productId)
const productPageName = computed(
  () =>
    products.value.find((product) => productSlug(product) === route.params.slug)?.name ||
    String(route.params.slug || '')
      .replace(/-/g, ' ')
      .replace(/\b[a-z]/g, (letter) => letter.toUpperCase()),
)
const updateDocumentTitle = () => {
  document.title = pageTitle({
    route,
    storeName: siteSettings.value.site_name || 'MongKol',
    productName: productPageName.value,
    translate: t,
  })
}
watch(
  [() => route.path, locale, () => siteSettings.value.site_name, productPageName],
  updateDocumentTitle,
  {
    immediate: true,
  },
)
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
  const stock = Number(item.stockQty ?? variantFor(item)?.stock_qty ?? Infinity)
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
  const variantUpdates = {
    variantId: variant.id,
    variantName: variant.name,
    price: Number(variant.discounted_price ?? variant.price),
    originalPrice:
      Number(variant.price) > Number(variant.discounted_price ?? variant.price)
        ? Number(variant.price)
        : null,
    stockQty: Number(variant.stock_qty),
  }
  const existing = cart.value.find((cartItem) => cartItem.variantId === variant.id)
  if (existing && existing.variantId !== item.variantId) {
    if (!mergeCartItem(item.variantId, variantUpdates, Number(variant.stock_qty))) {
      setWarning(item.variantId, withStock('cart.variantOnlyAvailable', variant.stock_qty))
    }
    return
  }
  updateCartItem(item.variantId, {
    ...variantUpdates,
    quantity: Math.min(item.quantity, Number(variant.stock_qty)),
  })
}
const closeBag = () => {
  isBagOpen.value = false
  itemPendingRemoval.value = null
}
const openBag = async () => {
  if (!isBagOpen.value) bagReturnFocus = document.activeElement
  isBagOpen.value = true
  if (isBagLoading.value) return
  isBagLoading.value = true
  bagError.value = ''
  try {
    await resolveCart()
  } catch {
    bagError.value = t('cart.refreshError')
  } finally {
    isBagLoading.value = false
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
    const favicon = document.querySelector('link[rel="icon"]')
    if (siteSettings.value.site_favicon) {
      const faviconLink = favicon || document.createElement('link')
      faviconLink.rel = 'icon'
      faviconLink.href = assetUrl(siteSettings.value.site_favicon)
      if (!favicon) document.head.appendChild(faviconLink)
    } else {
      if (favicon) favicon.href = '/favicon.svg'
    }
  } catch {
    updateDocumentTitle()
  }
  window.addEventListener('cart-updated', refreshCart)
  window.addEventListener('cart-item-added', openBag)
  window.addEventListener('shopping-bag-open', openBag)
  window.addEventListener('auth-updated', handleAuthUpdate)
  window.addEventListener('keydown', handleEscape)
  document.addEventListener('click', handleDocumentClick)
})
onUnmounted(() => {
  window.removeEventListener('cart-updated', refreshCart)
  window.removeEventListener('cart-item-added', openBag)
  window.removeEventListener('shopping-bag-open', openBag)
  window.removeEventListener('auth-updated', handleAuthUpdate)
  window.removeEventListener('keydown', handleEscape)
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <a
    href="#main-content"
    class="sr-only fixed left-4 top-4 z-50 rounded-lg bg-accent px-5 py-3 text-white focus:not-sr-only"
    >{{ t('store.skip') }}</a
  >
  <header class="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur-lg">
    <div class="store-container store-header-inner">
      <RouterLink
        to="/"
        :class="['flex items-center gap-[0.7rem] text-ink', navType]"
        :aria-label="`${siteSettings.site_name || ''} home`"
      >
        <img
          v-if="siteSettings.site_logo"
          class="size-12 shrink-0 rounded-full object-contain md:size-14"
          :src="assetUrl(siteSettings.site_logo)"
          :alt="siteSettings.site_name || ''"
        />
        <span class="text-base font-extrabold tracking-tight md:text-lg">{{
          siteSettings.site_name
        }}</span>
      </RouterLink>
      <form
        class="store-header-search flex min-w-0 items-center overflow-hidden rounded-lg border border-line bg-accent-soft"
        role="search"
        @submit.prevent="searchProducts"
      >
        <label for="header-search" class="sr-only">{{ t('products.search') }}</label>
        <svg
          class="ml-4 size-4 shrink-0 fill-none stroke-muted stroke-[1.6]"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <input
          id="header-search"
          v-model="headerSearch"
          type="search"
          :placeholder="t('store.searchPlaceholder')"
          class="min-h-11 w-full min-w-0 bg-transparent px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent md:text-sm"
        />
        <button
          type="submit"
          :aria-label="t('products.search')"
          class="flex size-11 shrink-0 items-center justify-center bg-accent text-white hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
        >
          <svg
            class="size-5 fill-none stroke-current stroke-[1.6]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
        </button>
      </form>
      <nav class="store-nav flex items-center gap-3 max-md:hidden" :aria-label="t('nav.more')">
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
            @click.stop="isCategoryOpen = !isCategoryOpen"
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
      <div class="store-header-actions flex items-center gap-1 max-md:gap-0">
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
        <MobileMenu :is-logged-in="isLoggedIn" @logout="signOut" />
        <div class="profile-menu relative order-1 hidden md:block">
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
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-ink"
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
                <RouterLink
                  to="/change-password"
                  class="flex min-h-11 items-center gap-3 px-3 text-sm font-bold text-ink uppercase no-underline hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent"
                  role="menuitem"
                  @click="closeProfile"
                >
                  <svg
                    class="size-5 fill-none stroke-current stroke-[1.7]"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <rect x="5" y="10" width="14" height="11" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
                  </svg>
                  {{ t('changePassword.title') }}
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
            'relative order-2 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center border-0 bg-transparent p-2 text-ink',
            navType,
          ]"
          type="button"
          :aria-expanded="isBagOpen"
          aria-controls="bag-drawer"
          :aria-label="`${t('cart.title')}, ${t(cartCount === 1 ? 'cart.itemCount' : 'cart.itemsCount').replace('{count}', cartCount)}`"
          @click="openBag"
        >
          <StoreIcon name="bag" class="size-6" />
          <span
            v-if="cartCount"
            class="absolute right-0 top-0 flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-accent p-[0.15rem] text-[0.6rem] leading-none font-bold text-white"
          >
            {{ cartCount }}
          </span>
        </button>
      </div>
    </div>
  </header>
  <RouterView />

  <StoreFooter :settings="siteSettings" />

  <BottomNav :is-logged-in="isLoggedIn" />

  <ShoppingBag
    :open="isBagOpen"
    :items="cart"
    :products="products"
    :warnings="warnings"
    :pending-removal="itemPendingRemoval"
    :subtotal="cartSubtotal"
    :can-checkout="canCheckout"
    :is-logged-in="isLoggedIn"
    :loading="isBagLoading"
    :error="bagError"
    :image-url="imageUrl"
    @update:open="!$event && closeBag()"
    @close-auto-focus="restoreBagFocus"
    @quantity="changeQuantity"
    @variant="changeVariant"
    @remove="requestRemoval"
    @confirm-removal="confirmRemoval"
    @cancel-removal="itemPendingRemoval = null"
    @clear="clearBag"
    @retry="openBag"
  />
</template>
