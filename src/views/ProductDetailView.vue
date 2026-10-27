<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import ProductList from '../components/product/ProductList.vue'
import DetailIcon from '../components/icons/StoreIcon.vue'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/feedback'
import { Badge } from '../components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '../components/ui/toggle-group'
import { FieldSet, FieldLegend, Separator } from '../components/ui/field'
import { addToCart as addItemToCart, getCart } from '../services/cartService'
import { assetUrl } from '../services/api'
import { getProducts } from '../services/productService'
import { getSettings } from '../services/settingsService'
import { t } from '../services/i18n'
import {
  activeDiscount,
  activeDiscounts,
  formatExpiry,
  formatPrice,
  promotionKey,
} from '../utils/pricing'
import { productSlug } from '../utils/slug'
import {
  availableVariant,
  optionGroups,
  optionLabel,
  resolveVariant,
  optionAvailable,
  variantPrice,
  galleryImages,
} from '../utils/productDetail'

const route = useRoute()
const router = useRouter()
const product = ref(null)
const products = ref([])
const settings = ref({})
const loading = ref(true)
const error = ref('')
const selections = ref({})
const quantity = ref(1)
const selectedImage = ref(0)
const failedImages = ref(new Set())
const galleryDialog = ref(null)
const optionControls = ref(null)
const cart = ref(getCart())
const purchasing = ref(false)
const feedback = ref('')
const feedbackError = ref(false)
let loadVersion = 0

const variants = computed(() => product.value?.variants || [])
const groups = computed(() => optionGroups(product.value))
const selectedVariant = computed(() => resolveVariant(product.value, selections.value))
const availableVariants = computed(() => variants.value.filter(availableVariant))
const optionPrices = computed(() =>
  Object.fromEntries(
    variants.value.map((variant) => [
      String(variant.id),
      Number.isFinite(variantPrice(variant).current)
        ? formatPrice(variantPrice(variant).current)
        : '—',
    ]),
  ),
)
const remainingStock = computed(() =>
  Math.max(
    0,
    Number(selectedVariant.value?.stock_qty || 0) -
      Number(
        cart.value.find((item) => item.variantId === selectedVariant.value?.id)?.quantity || 0,
      ),
  ),
)
const purchasable = computed(
  () =>
    availableVariant(selectedVariant.value) &&
    remainingStock.value > 0 &&
    Number.isFinite(variantPrice(selectedVariant.value).current),
)
const displayVariant = computed(
  () =>
    selectedVariant.value ||
    [...(availableVariants.value.length ? availableVariants.value : variants.value)].sort(
      (a, b) => variantPrice(a).current - variantPrice(b).current,
    )[0],
)
const price = computed(() => variantPrice(displayVariant.value))
const appliedOffer = computed(() => activeDiscount(product.value, displayVariant.value))
const productOffers = computed(() => {
  const offers = activeDiscounts(product.value)
  const applied = appliedOffer.value && promotionKey(appliedOffer.value)
  return offers
    .slice()
    .sort((a, b) => Number(promotionKey(b) === applied) - Number(promotionKey(a) === applied))
})
const priceRange = computed(
  () =>
    !selectedVariant.value &&
    new Set(availableVariants.value.map((variant) => variantPrice(variant).current)).size > 1,
)
const priceLabel = computed(() =>
  Number.isFinite(price.value.current) ? formatPrice(price.value.current) : '—',
)
const images = computed(() => galleryImages(product.value, selectedVariant.value))
const imageUrl = (image) =>
  image?.image_path ? assetUrl(`/storage/${image.image_path}`) : image?.image_url || ''
const activeImage = computed(() => imageUrl(images.value[selectedImage.value]))
const imageAvailable = computed(
  () => activeImage.value && !failedImages.value.has(activeImage.value),
)
const imageFailed = (image) => {
  failedImages.value = new Set([...failedImages.value, imageUrl(image)])
}
const chooseImage = (index) => {
  selectedImage.value = (index + images.value.length) % images.value.length
}
const stockLabel = computed(() =>
  !availableVariants.value.length
    ? t('cart.outOfStock')
    : selectedVariant.value && remainingStock.value === 0
      ? t('productDetail.alreadyInBag')
      : selectedVariant.value
        ? t('productDetail.inStock')
        : t('productDetail.availableOptions'),
)
const relatedProducts = computed(() => {
  const categoryId = product.value?.category?.id ?? product.value?.category_id
  return categoryId == null
    ? []
    : products.value
        .filter(
          (item) =>
            item.id !== product.value.id && (item.category?.id ?? item.category_id) === categoryId,
        )
        .slice(0, 4)
})
const specifications = computed(() => {
  const values = product.value?.specifications
  const entries =
    values && typeof values === 'object' && !Array.isArray(values) ? Object.entries(values) : []
  if (product.value?.product_code)
    entries.push([t('productDetail.productCode'), product.value.product_code])
  if (product.value?.unit?.name) entries.push([t('productDetail.unit'), product.value.unit.name])
  return entries.filter(([, value]) => value != null && value !== '')
})
const sections = computed(() =>
  [
    {
      key: 'description',
      html: product.value?.description,
      text: product.value?.short_description,
    },
    {
      key: 'specifications',
      entries: specifications.value,
      text: typeof product.value?.specifications === 'string' ? product.value.specifications : '',
    },
    {
      key: 'included',
      list: Array.isArray(product.value?.whats_included) ? product.value.whats_included : [],
      text: typeof product.value?.whats_included === 'string' ? product.value.whats_included : '',
    },
    {
      key: 'shippingReturns',
      entries: [
        [t('productDetail.shipping'), settings.value.shipping_information],
        [t('productDetail.returns'), settings.value.returns_information],
      ].filter(([, value]) => value),
    },
  ].filter(
    (section) =>
      section.html?.replace(/<[^>]*>/g, '').trim() ||
      section.text ||
      section.list?.length ||
      section.entries?.length,
  ),
)

const selectOption = (group, value) => {
  if (!optionAvailable(product.value, selections.value, group.key, value)) return
  selections.value = { ...selections.value, [group.key]: value }
  quantity.value = 1
  feedback.value = ''
}
const resetOptions = () => {
  selections.value = {}
  feedback.value = ''
  quantity.value = 1
}
watch(
  () => selectedVariant.value?.id,
  () => {
    selectedImage.value = 0
    quantity.value = 1
    feedback.value = ''
  },
)
const refreshCart = () => {
  cart.value = getCart()
}
const changeQuantity = (delta) => {
  quantity.value = Math.max(1, Math.min(remainingStock.value, quantity.value + delta))
  feedback.value = ''
}
const purchase = async (buyNow = false) => {
  if (purchasing.value) return
  feedback.value = ''
  feedbackError.value = true
  refreshCart()
  if (!selectedVariant.value) {
    feedback.value = 'productDetail.selectOptions'
    optionControls.value?.scrollIntoView({ block: 'center' })
    optionControls.value?.querySelector('button:not(:disabled)')?.focus({ preventScroll: true })
    return
  }
  if (!purchasable.value || quantity.value > remainingStock.value) {
    feedback.value = 'productDetail.stockLimit'
    quantity.value = Math.max(1, remainingStock.value)
    return
  }
  purchasing.value = true
  try {
    await nextTick()
    const variant = selectedVariant.value
    addItemToCart(
      {
        productId: product.value.id,
        variantId: variant.id,
        productName: product.value.name,
        variantName: variant.name,
        imageUrl: activeImage.value,
        price: price.value.current,
        quantity: quantity.value,
      },
      { openBag: !buyNow },
    )
    refreshCart()
    feedbackError.value = false
    feedback.value = 'productDetail.addedToCart'
    quantity.value = Math.max(1, Math.min(quantity.value, remainingStock.value))
    if (buyNow) await router.push('/checkout')
  } catch {
    feedback.value = 'productDetail.cartError'
    feedbackError.value = true
  } finally {
    purchasing.value = false
  }
}
const loadProduct = async () => {
  const version = ++loadVersion
  loading.value = true
  error.value = ''
  selections.value = {}
  quantity.value = 1
  selectedImage.value = 0
  failedImages.value = new Set()
  feedback.value = ''
  galleryDialog.value?.close()
  window.scrollTo(0, 0)
  try {
    const catalog = products.value.length ? products.value : await getProducts()
    if (version !== loadVersion) return
    products.value = catalog
    product.value = catalog.find((item) => productSlug(item) === route.params.slug) || null
    error.value = product.value ? '' : 'productDetail.notFound'
  } catch {
    if (version === loadVersion) error.value = 'productDetail.loadError'
  } finally {
    if (version === loadVersion) loading.value = false
  }
}
onMounted(() => {
  loadProduct()
  getSettings()
    .then((value) => {
      settings.value = value
    })
    .catch(() => {})
  window.addEventListener('cart-updated', refreshCart)
})
onUnmounted(() => {
  loadVersion++
  window.removeEventListener('cart-updated', refreshCart)
})
watch(() => route.params.slug, loadProduct)
</script>

<template>
  <main
    id="main-content"
    tabindex="-1"
    class="store-container store-product-detail pt-3 pb-12 md:pt-5 md:pb-16"
  >
    <nav
      class="mb-4 flex min-w-0 items-center gap-2 text-xs text-muted sm:mb-6"
      :aria-label="t('productDetail.breadcrumbs')"
    >
      <RouterLink
        to="/"
        class="shrink-0 py-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >{{ t('nav.home') }}</RouterLink
      >
      <DetailIcon name="chevron" class="size-3 shrink-0" />
      <RouterLink
        :to="{
          path: '/products',
          query: product?.category?.id ? { category: product.category.id } : {},
        }"
        class="shrink-0 py-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >{{ product?.category?.name || t('nav.products') }}</RouterLink
      >
      <DetailIcon v-if="product" name="chevron" class="size-3 shrink-0" />
      <span v-if="product" class="truncate text-ink" aria-current="page">{{ product.name }}</span>
    </nav>
    <div
      v-if="loading"
      class="grid gap-7 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-16"
      aria-busy="true"
      role="status"
      :aria-label="t('productDetail.loading')"
    >
      <Skeleton class="aspect-[6/5] md:aspect-square" />
      <div class="grid content-start gap-5 pt-5">
        <Skeleton class="h-10 w-4/5" />
        <Skeleton class="h-6 w-1/3" />
        <Skeleton class="mt-8 h-14" />
      </div>
    </div>
    <div v-else-if="error" class="py-16 text-center">
      <DetailIcon name="package" class="mx-auto mb-4 size-10 text-muted" />
      <p class="text-muted" role="alert">
        {{ t(error) }}
      </p>
      <button
        type="button"
        class="mt-5 min-h-11 rounded border border-line px-6 font-semibold focus-visible:outline-2 focus-visible:outline-accent"
        @click="loadProduct"
      >
        {{ t('productDetail.retry') }}
      </button>
    </div>
    <template v-else-if="product">
      <section
        class="grid items-start gap-7 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-8 lg:gap-10"
        aria-labelledby="product-title"
      >
        <div class="grid min-w-0 gap-3 md:sticky md:top-40">
          <div
            class="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-white sm:aspect-square"
          >
            <Badge v-if="price.discounted" variant="sale" class="absolute left-4 top-4 z-10"
              >−{{ Math.round(((price.original - price.current) / price.original) * 100) }}%</Badge
            >
            <button
              v-if="imageAvailable"
              type="button"
              class="h-full w-full cursor-zoom-in p-2 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-accent sm:p-3"
              :aria-label="t('productDetail.zoom')"
              @click="galleryDialog.showModal()"
            >
              <img
                :key="activeImage"
                class="h-full w-full object-contain"
                :src="activeImage"
                :alt="product.name"
                @error="imageFailed(images[selectedImage])"
              />
            </button>
            <div
              v-else
              class="flex h-full flex-col items-center justify-center gap-3 text-muted"
              role="img"
              :aria-label="t('productDetail.noImage')"
            >
              <DetailIcon name="image" class="size-12" /><span class="text-sm">{{
                t('productDetail.noImage')
              }}</span>
            </div>
            <button
              v-if="imageAvailable"
              type="button"
              class="absolute right-3 bottom-3 flex size-11 cursor-zoom-in items-center justify-center rounded-full bg-paper hover:bg-white focus-visible:outline-2 focus-visible:outline-accent"
              :aria-label="t('productDetail.zoom')"
              @click="galleryDialog.showModal()"
            >
              <DetailIcon name="zoom" class="size-5" />
            </button>
            <template v-if="images.length > 1">
              <button
                type="button"
                class="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-paper hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
                :aria-label="t('productDetail.previousImage')"
                @click="chooseImage(selectedImage - 1)"
              >
                <DetailIcon name="chevron" class="size-5 rotate-180" />
              </button>
              <button
                type="button"
                class="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-paper hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
                :aria-label="t('productDetail.nextImage')"
                @click="chooseImage(selectedImage + 1)"
              >
                <DetailIcon name="chevron" class="size-5" />
              </button>
            </template>
          </div>
          <div
            v-if="images.length > 1"
            class="flex max-w-full gap-2 overflow-x-auto py-1"
            :aria-label="t('productDetail.productImages')"
          >
            <button
              v-for="(image, index) in images"
              :key="`${imageUrl(image)}-${index}`"
              type="button"
              class="flex size-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border bg-white p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:size-[4.5rem]"
              :class="
                index === selectedImage
                  ? 'border-accent ring-1 ring-accent'
                  : 'border-line hover:border-accent'
              "
              :aria-pressed="index === selectedImage"
              :aria-label="`${t('productDetail.productImages')} ${index + 1}`"
              @click="chooseImage(index)"
            >
              <img
                v-if="imageUrl(image) && !failedImages.has(imageUrl(image))"
                class="h-full w-full object-contain"
                :src="imageUrl(image)"
                :alt="`${product.name} ${index + 1}`"
                @error="imageFailed(image)"
              />
              <DetailIcon v-else name="image" class="size-6 text-muted" />
            </button>
          </div>
        </div>
        <div class="min-w-0 bg-white md:rounded-2xl md:border md:border-line md:p-6 lg:p-8">
          <Badge
            v-if="product.is_best_seller"
            variant="outline"
            class="mb-3 rounded-full border-accent bg-white px-3 py-1 text-accent"
            >{{ t('products.bestSeller') }}</Badge
          >
          <h1
            id="product-title"
            class="!mt-0 !mb-4 !text-[clamp(1.5rem,2.5vw,2rem)] !leading-[1.4] text-balance break-words"
          >
            {{ product.name }}
          </h1>
          <div class="flex flex-wrap items-baseline gap-x-3 gap-y-2" aria-live="polite">
            <span v-if="priceRange" class="text-sm text-muted">{{ t('productDetail.from') }}</span>
            <p class="text-3xl font-semibold text-sale tabular-nums">
              {{ priceLabel }}
            </p>
            <s v-if="price.discounted" class="text-base tabular-nums text-muted">{{
              formatPrice(price.original)
            }}</s>
          </div>
          <details
            v-if="productOffers.length"
            :key="product.id"
            class="group mt-4 rounded-xl border border-line"
            aria-labelledby="product-offers"
          >
            <summary
              class="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden"
            >
              <svg
                class="size-5 shrink-0 fill-none stroke-current stroke-[1.5] text-accent"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M3 3h8l10 10-8 8L3 11V3Z" />
                <circle cx="7.5" cy="7.5" r="1" />
              </svg>
              <span class="grid min-w-0 flex-1 gap-1">
                <span id="product-offers" class="text-sm font-semibold break-words">
                  {{ appliedOffer?.name || t('promotions.availableOffers') }}
                </span>
                <span class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <span v-if="appliedOffer" class="inline-flex items-center gap-1 text-accent">
                    <DetailIcon name="check" class="size-3" />{{ t('promotions.applied') }}
                  </span>
                  <span>{{ t('promotions.offerDetails') }}</span>
                  <span v-if="productOffers.length > 1">{{
                    t('promotions.moreOffers').replace('{count}', productOffers.length - 1)
                  }}</span>
                </span>
              </span>
              <DetailIcon name="down" class="size-4 shrink-0 text-muted group-open:rotate-180" />
            </summary>
            <ul class="mx-3 divide-y divide-line border-t border-line">
              <li
                v-for="offer in productOffers"
                :key="promotionKey(offer)"
                class="py-3"
                :data-applied="
                  appliedOffer && promotionKey(appliedOffer) === promotionKey(offer)
                    ? 'true'
                    : 'false'
                "
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <RouterLink
                    to="/promotion"
                    class="inline-flex min-h-11 min-w-0 items-center gap-2 text-sm font-medium text-ink underline-offset-4 hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <span class="break-words">{{ offer.name }}</span
                    ><span aria-hidden="true">↗</span>
                  </RouterLink>
                  <DetailIcon
                    v-if="appliedOffer && promotionKey(appliedOffer) === promotionKey(offer)"
                    name="check"
                    class="size-4 shrink-0 text-accent"
                  />
                </div>
                <p class="text-xs font-medium text-accent">
                  {{
                    offer.type === 'percentage'
                      ? t('promotions.percentOff').replace('{value}', Number(offer.value))
                      : t('promotions.amountOff').replace('{value}', formatPrice(offer.value))
                  }}
                </p>
                <p
                  v-if="offer.description"
                  class="mt-1 text-xs leading-relaxed text-muted break-words"
                >
                  {{ offer.description }}
                </p>
                <p v-if="offer.end_date" class="mt-1 text-xs text-muted">
                  {{ t('promotions.endsOn') }}
                  <time :datetime="offer.end_date">{{ formatExpiry(offer.end_date) }}</time>
                </p>
              </li>
            </ul>
            <p class="border-t border-line px-3 py-3 text-xs leading-relaxed text-muted">
              {{ t('promotions.bestOfferHelp') }}
            </p>
          </details>
          <p
            v-if="product.short_description"
            class="mt-4 line-clamp-3 text-sm leading-7 text-muted"
          >
            {{ product.short_description }}
          </p>
          <p class="mt-3 text-sm text-muted" role="status">
            {{ stockLabel }}
          </p>
          <div
            v-if="groups.length"
            ref="optionControls"
            class="mt-6 flex scroll-mt-44 flex-col gap-5"
          >
            <button
              v-if="Object.keys(selections).length && groups.length > 1"
              type="button"
              class="flex min-h-11 items-center gap-2 text-xs font-semibold text-muted underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              @click="resetOptions"
            >
              <DetailIcon name="refresh" class="size-4" />
              {{ t('productDetail.resetOptions') }}
            </button>
            <FieldSet
              v-for="group in groups"
              :key="group.key"
              class="min-w-0"
              :aria-describedby="feedbackError && feedback ? 'purchase-feedback' : undefined"
            >
              <FieldLegend class="mb-3 text-sm">{{
                group.label || t('productDetail.options')
              }}</FieldLegend>
              <ToggleGroup
                class="grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-2.5"
                :model-value="selections[group.key] || ''"
                :aria-label="group.label || t('productDetail.options')"
                :disabled="purchasing"
                @update:model-value="(value) => value && selectOption(group, value)"
              >
                <ToggleGroupItem
                  v-for="option in group.values"
                  :key="option.value"
                  :value="option.value"
                  :disabled="!optionAvailable(product, selections, group.key, option.value)"
                  class="store-detail-option min-h-16 flex-col gap-1 rounded-xl px-3 py-3 text-center hover:border-accent hover:bg-white hover:text-accent data-[state=on]:border-accent data-[state=on]:bg-accent data-[state=on]:text-white"
                >
                  <span class="break-words">{{ option.label }}</span>
                  <span v-if="group.key === 'variant'" class="text-xs font-medium">{{
                    optionPrices[option.value]
                  }}</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </FieldSet>
          </div>
          <Separator class="mt-6" />
          <div class="store-detail-purchase mt-5" :aria-busy="purchasing">
            <div class="flex items-center justify-between gap-3">
              <span class="hidden text-sm text-muted md:inline">{{ t('cart.quantity') }}</span>
              <div class="grid min-w-0 flex-1 gap-0.5 md:hidden">
                <span class="text-xl font-semibold text-accent tabular-nums">{{ priceLabel }}</span>
                <span class="truncate text-xs text-muted">{{
                  selectedVariant
                    ? optionLabel(product, selectedVariant.name)
                    : t('store.chooseOptions')
                }}</span>
              </div>
              <div
                class="flex h-12 shrink-0 items-center overflow-hidden rounded-xl border border-line"
                role="group"
                :aria-label="t('cart.quantity')"
              >
                <button
                  type="button"
                  class="flex h-full w-11 items-center justify-center text-accent hover:bg-accent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent disabled:text-muted/50"
                  :aria-label="t('cart.decreaseQuantity')"
                  :disabled="!purchasable || purchasing || quantity <= 1"
                  @click="changeQuantity(-1)"
                >
                  <DetailIcon name="minus" class="size-4" />
                </button>
                <span
                  class="w-7 text-center text-sm font-semibold tabular-nums"
                  aria-live="polite"
                  >{{ quantity }}</span
                >
                <button
                  type="button"
                  class="flex h-full w-11 items-center justify-center text-accent hover:bg-accent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent disabled:text-muted/50"
                  :aria-label="t('cart.increaseQuantity')"
                  :disabled="!purchasable || purchasing || quantity >= remainingStock"
                  @click="changeQuantity(1)"
                >
                  <DetailIcon name="plus" class="size-4" />
                </button>
              </div>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 md:mt-5 md:gap-3">
              <Button
                type="button"
                size="lg"
                class="h-auto min-h-12 w-full min-w-0 rounded-xl px-3 text-sm whitespace-normal"
                :disabled="
                  purchasing || !availableVariants.length || (!!selectedVariant && !purchasable)
                "
                @click="purchase()"
              >
                <DetailIcon
                  :name="feedback === 'productDetail.addedToCart' ? 'check' : 'bag'"
                  data-icon="inline-start"
                />
                {{
                  purchasing
                    ? t('productDetail.working')
                    : !availableVariants.length
                      ? t('cart.outOfStock')
                      : !selectedVariant
                        ? t('store.chooseOptions')
                        : t('productDetail.addToCart')
                }}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                class="h-auto min-h-12 w-full min-w-0 rounded-xl border-accent bg-white px-3 text-sm text-accent whitespace-normal hover:bg-accent hover:text-white"
                :disabled="
                  purchasing || !availableVariants.length || (!!selectedVariant && !purchasable)
                "
                @click="purchase(true)"
              >
                {{ t('productDetail.buyNow') }}<DetailIcon name="arrow" />
              </Button>
            </div>
          </div>
          <p
            v-if="feedback"
            id="purchase-feedback"
            class="mt-4 flex items-start gap-2 rounded-xl border border-accent bg-white px-3 py-3 text-sm leading-relaxed text-accent"
            :role="feedbackError ? 'alert' : 'status'"
          >
            <DetailIcon :name="feedbackError ? 'info' : 'check'" class="mt-0.5 size-4 shrink-0" />{{
              t(feedback)
            }}
          </p>
        </div>
      </section>
      <section v-if="sections.length" class="mt-12" :aria-label="t('productDetail.description')">
        <Tabs :key="product.id" :default-value="sections[0].key">
          <TabsList
            class="flex w-full flex-wrap justify-start gap-0 rounded-none border-b border-line bg-transparent p-0"
          >
            <TabsTrigger
              v-for="section in sections"
              :key="section.key"
              :value="section.key"
              class="min-h-12 rounded-none border-b-2 border-transparent px-5 py-3 data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-accent data-[state=active]:shadow-none"
              >{{ t(`productDetail.${section.key}`) }}</TabsTrigger
            >
          </TabsList>
          <TabsContent
            v-for="section in sections"
            :key="section.key"
            :value="section.key"
            class="mt-6"
          >
            <h2 class="sr-only">{{ t(`productDetail.${section.key}`) }}</h2>
            <div class="max-w-prose pb-5 text-sm leading-7 text-muted">
              <div
                v-if="section.html"
                class="[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_img]:max-w-full"
                v-html="section.html"
              ></div>
              <p v-if="section.text" class="whitespace-pre-line">{{ section.text }}</p>
              <ul v-if="section.list?.length" class="list-disc pl-4">
                <li v-for="(item, index) in section.list" :key="index">{{ item }}</li>
              </ul>
              <dl v-if="section.entries?.length" class="flex flex-col gap-3">
                <div
                  v-for="[label, value] in section.entries"
                  :key="label"
                  class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3"
                >
                  <dt class="font-medium text-ink">{{ label }}</dt>
                  <dd class="break-words whitespace-pre-line">{{ value }}</dd>
                </div>
              </dl>
            </div>
          </TabsContent>
        </Tabs>
      </section>
      <section
        v-if="relatedProducts.length"
        class="mt-12 border-t border-line pt-7 sm:mt-16"
        aria-labelledby="related-title"
      >
        <h2 id="related-title" class="store-section-title mb-5">
          {{ t('productDetail.similarItems') }}
        </h2>
        <ProductList :products="relatedProducts" />
      </section>
    </template>
    <dialog
      ref="galleryDialog"
      class="fixed inset-0 m-auto h-[min(90dvh,900px)] w-[min(94vw,1100px)] max-w-none rounded-lg bg-white p-5 backdrop:bg-black/70"
      :aria-label="t('productDetail.zoom')"
      @click="$event.target === galleryDialog && galleryDialog.close()"
    >
      <button
        type="button"
        class="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full border border-line bg-white focus-visible:outline-2 focus-visible:outline-accent"
        :aria-label="t('productDetail.closeZoom')"
        @click="galleryDialog.close()"
      >
        <DetailIcon name="close" class="size-5" />
      </button>
      <img
        v-if="imageAvailable"
        class="h-full w-full object-contain"
        :src="activeImage"
        :alt="product?.name"
      />
      <div
        v-if="images.length > 1"
        class="absolute inset-x-5 bottom-5 flex items-center justify-between"
      >
        <button
          type="button"
          class="flex size-11 items-center justify-center rounded-full border border-line bg-white"
          :aria-label="t('productDetail.previousImage')"
          @click="chooseImage(selectedImage - 1)"
        >
          <DetailIcon name="chevron" class="size-5 rotate-180" /></button
        ><span class="rounded-full bg-white px-3 py-1 text-sm tabular-nums"
          >{{ selectedImage + 1 }} / {{ images.length }}</span
        ><button
          type="button"
          class="flex size-11 items-center justify-center rounded-full border border-line bg-white"
          :aria-label="t('productDetail.nextImage')"
          @click="chooseImage(selectedImage + 1)"
        >
          <DetailIcon name="chevron" class="size-5" />
        </button>
      </div>
    </dialog>
  </main>
</template>

<style scoped>
.store-detail-option,
.store-detail-purchase button {
  touch-action: manipulation;
  user-select: none;
}
@media (max-width: 767px) {
  .store-detail-purchase {
    position: fixed;
    inset: auto 0 0;
    z-index: 20;
    margin: 0;
    padding: 0.75rem max(1rem, env(safe-area-inset-right))
      calc(0.75rem + env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
    border-top: 1px solid var(--color-line);
    background: white;
  }
}
</style>
