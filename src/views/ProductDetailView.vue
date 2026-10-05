<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import ProductList from '../components/product/ProductList.vue'
import DetailIcon from '../components/product/ProductDetailIcon.vue'
import { addToCart as addItemToCart, getCart } from '../services/cartService'
import { assetUrl } from '../services/api'
import { getProducts } from '../services/productService'
import { getSettings } from '../services/settingsService'
import { t } from '../services/i18n'
import { formatPrice } from '../utils/pricing'
import { productSlug } from '../utils/slug'
import {
  availableVariant,
  optionGroups,
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
const price = computed(() => {
  const candidate =
    selectedVariant.value ||
    [...(availableVariants.value.length ? availableVariants.value : variants.value)].sort(
      (a, b) => variantPrice(a).current - variantPrice(b).current,
    )[0]
  return variantPrice(candidate)
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
const summary = computed(() => {
  if (product.value?.short_description) return product.value.short_description
  if (!product.value?.description) return ''
  const content = new DOMParser().parseFromString(product.value.description, 'text/html')
  return (content.querySelector('p')?.textContent || content.body.textContent || '').trim()
})
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
    { key: 'description', icon: 'list', html: product.value?.description },
    {
      key: 'specifications',
      icon: 'info',
      entries: specifications.value,
      text: typeof product.value?.specifications === 'string' ? product.value.specifications : '',
    },
    {
      key: 'included',
      icon: 'package',
      list: Array.isArray(product.value?.whats_included) ? product.value.whats_included : [],
      text: typeof product.value?.whats_included === 'string' ? product.value.whats_included : '',
    },
    {
      key: 'shippingReturns',
      icon: 'truck',
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
  <main class="mx-auto max-w-[1240px] px-5 pt-6 pb-24 sm:px-8 md:pt-8 md:pb-14 lg:px-12">
    <nav
      class="mb-7 flex min-w-0 items-center gap-2 text-xs text-muted sm:mb-9"
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
      class="grid gap-8 md:grid-cols-[1.1fr_1fr] md:gap-12"
      aria-busy="true"
      :aria-label="t('productDetail.loading')"
    >
      <div class="skeleton aspect-square rounded-lg motion-safe:animate-shimmer"></div>
      <div class="grid content-start gap-5 pt-5">
        <div class="skeleton h-10 w-4/5 motion-safe:animate-shimmer"></div>
        <div class="skeleton h-6 w-1/3 motion-safe:animate-shimmer"></div>
        <div class="skeleton mt-8 h-14 motion-safe:animate-shimmer"></div>
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
        class="grid items-start gap-8 md:grid-cols-[1.1fr_1fr] md:gap-12 lg:gap-16"
        aria-labelledby="product-title"
      >
        <div class="min-w-0">
          <div
            class="relative aspect-square overflow-hidden rounded-lg border border-line/70 bg-[#f7f7f7]"
          >
            <button
              v-if="imageAvailable"
              type="button"
              class="h-full w-full cursor-zoom-in p-4 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-accent sm:p-6"
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
              class="absolute right-4 bottom-4 flex size-11 cursor-zoom-in items-center justify-center rounded-full border border-line bg-white hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent"
              :aria-label="t('productDetail.zoom')"
              @click="galleryDialog.showModal()"
            >
              <DetailIcon name="zoom" class="size-5" />
            </button>
          </div>
          <div
            v-if="images.length > 1"
            class="mt-4 flex max-w-full gap-3 overflow-x-auto py-1"
            :aria-label="t('productDetail.productImages')"
          >
            <button
              v-for="(image, index) in images"
              :key="`${imageUrl(image)}-${index}`"
              type="button"
              class="flex size-[4.5rem] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 bg-[#f7f7f7] p-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-20"
              :class="
                index === selectedImage ? 'border-ink' : 'border-transparent hover:border-line'
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
        <div class="min-w-0 md:pt-1">
          <p
            v-if="product.category?.name"
            class="mb-3 text-xs font-semibold tracking-[0.12em] text-muted uppercase"
          >
            {{ product.category.name }}
          </p>
          <h1
            id="product-title"
            class="!mt-0 !mb-4 !text-[clamp(1.7rem,3vw,2.35rem)] !leading-[1.2]"
          >
            {{ product.name }}
          </h1>
          <p v-if="summary" class="mb-5 line-clamp-3 text-sm leading-7 text-muted sm:text-base">
            {{ summary }}
          </p>
          <div class="flex flex-wrap items-baseline gap-3" aria-live="polite">
            <span v-if="priceRange" class="text-sm text-muted">{{ t('productDetail.from') }}</span>
            <p
              class="text-[1.8rem] font-semibold tabular-nums"
              :class="price.discounted ? 'text-sale' : 'text-ink'"
            >
              {{ priceLabel }}
            </p>
            <s v-if="price.discounted" class="text-base tabular-nums text-muted">{{
              formatPrice(price.original)
            }}</s>
          </div>
          <p
            class="mt-3 inline-flex items-center gap-2 text-xs font-semibold"
            :class="availableVariants.length ? 'text-success' : 'text-danger'"
            role="status"
          >
            <span class="size-1.5 rounded-full bg-current" aria-hidden="true"></span
            >{{ stockLabel }}
          </p>
          <div
            v-if="groups.length"
            ref="optionControls"
            class="mt-7 space-y-6 border-t border-line pt-6"
          >
            <button
              v-if="Object.keys(selections).length && groups.length > 1"
              type="button"
              class="flex min-h-11 items-center gap-2 text-xs font-semibold text-muted underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              @click="resetOptions"
            >
              {{ t('productDetail.resetOptions') }}
            </button>
            <fieldset
              v-for="group in groups"
              :key="group.key"
              class="min-w-0"
              :aria-describedby="feedbackError && feedback ? 'purchase-feedback' : undefined"
            >
              <legend class="mb-3 text-sm font-semibold text-ink">
                {{ group.label || t('productDetail.options')
                }}<span v-if="selections[group.key]" class="ml-2 font-normal text-muted">{{
                  group.values.find((option) => option.value === selections[group.key])?.label
                }}</span>
              </legend>
              <div class="flex flex-wrap gap-2.5">
                <button
                  v-for="option in group.values"
                  :key="option.value"
                  type="button"
                  class="inline-flex min-h-12 min-w-14 max-w-full cursor-pointer items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:border-line disabled:bg-accent-soft disabled:text-muted disabled:line-through"
                  :class="
                    selections[group.key] === option.value
                      ? 'border-ink bg-ink text-white'
                      : 'border-line bg-white text-ink hover:border-ink'
                  "
                  :disabled="
                    purchasing || !optionAvailable(product, selections, group.key, option.value)
                  "
                  :aria-pressed="selections[group.key] === option.value"
                  @click="selectOption(group, option.value)"
                >
                  <span class="break-words">{{ option.label }}</span
                  ><DetailIcon
                    v-if="selections[group.key] === option.value"
                    name="check"
                    class="size-4 shrink-0"
                  />
                </button>
              </div>
            </fieldset>
          </div>
          <div class="mt-7 border-t border-line pt-6" :aria-busy="purchasing">
            <p class="mb-3 text-xs font-semibold text-muted">{{ t('cart.quantity') }}</p>
            <div class="flex items-stretch gap-3">
              <div
                class="flex h-14 shrink-0 items-center overflow-hidden rounded-md border border-line"
                role="group"
                :aria-label="t('cart.quantity')"
              >
                <button
                  type="button"
                  class="flex h-full w-10 items-center justify-center hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent disabled:text-muted/50"
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
                  class="flex h-full w-10 items-center justify-center hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent disabled:text-muted/50"
                  :aria-label="t('cart.increaseQuantity')"
                  :disabled="!purchasable || purchasing || quantity >= remainingStock"
                  @click="changeQuantity(1)"
                >
                  <DetailIcon name="plus" class="size-4" />
                </button>
              </div>
              <button
                type="button"
                class="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-md bg-ink px-3 py-3 text-sm font-semibold text-white hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
                :disabled="
                  purchasing || !availableVariants.length || (!!selectedVariant && !purchasable)
                "
                @click="purchase()"
              >
                <DetailIcon
                  :name="feedback === 'productDetail.addedToCart' ? 'check' : 'bag'"
                  class="size-5 shrink-0"
                />{{ purchasing ? t('productDetail.working') : t('productDetail.addToCart') }}
              </button>
            </div>
            <button
              type="button"
              class="mt-3 flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-md border border-ink bg-white px-5 py-3 text-sm font-semibold text-ink hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent disabled:cursor-not-allowed disabled:border-line disabled:text-muted"
              :disabled="
                purchasing || !availableVariants.length || (!!selectedVariant && !purchasable)
              "
              @click="purchase(true)"
            >
              {{ t('productDetail.buyNow') }}<DetailIcon name="arrow" class="size-5" />
            </button>
            <p
              v-if="feedback"
              id="purchase-feedback"
              class="mt-4 flex items-start gap-2 rounded-md px-3 py-2.5 text-sm leading-relaxed"
              :class="feedbackError ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'"
              :role="feedbackError ? 'alert' : 'status'"
            >
              <DetailIcon
                :name="feedbackError ? 'info' : 'check'"
                class="mt-0.5 size-4 shrink-0"
              />{{ t(feedback) }}
            </p>
          </div>
          <div v-if="sections.length" class="mt-7 border-t border-line">
            <details
              v-for="section in sections"
              :key="section.key"
              class="group border-b border-line"
              :open="section.key === 'description'"
            >
              <summary
                class="flex min-h-16 cursor-pointer list-none items-center gap-3 py-4 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden"
              >
                <DetailIcon :name="section.icon" class="size-5 shrink-0 text-muted" />{{
                  t(`productDetail.${section.key}`)
                }}<DetailIcon name="plus" class="ml-auto size-4 group-open:hidden" /><DetailIcon
                  name="minus"
                  class="ml-auto hidden size-4 group-open:block"
                />
              </summary>
              <div class="pb-5 pl-8 text-sm leading-7 text-muted">
                <div
                  v-if="section.html"
                  class="[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_img]:max-w-full"
                  v-html="section.html"
                ></div>
                <p v-if="section.text" class="whitespace-pre-line">{{ section.text }}</p>
                <ul v-if="section.list?.length" class="list-disc pl-4">
                  <li v-for="(item, index) in section.list" :key="index">{{ item }}</li>
                </ul>
                <dl v-if="section.entries?.length" class="space-y-3">
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
            </details>
          </div>
        </div>
      </section>
      <section
        v-if="relatedProducts.length"
        class="mt-14 border-t border-line pt-9 sm:mt-20"
        aria-labelledby="related-title"
      >
        <h2 id="related-title" class="mb-6 text-xl font-semibold text-ink">
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
        class="absolute top-3 right-3 z-10 flex size-11 items-center justify-center rounded-full border border-line bg-white focus-visible:outline-2 focus-visible:outline-accent"
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
