<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ProductList from '../components/product/ProductList.vue'
import { addToCart as addItemToCart } from '../services/cartService'
import { assetUrl } from '../services/api'
import { getProducts } from '../services/productService'
import { t } from '../services/i18n'
import { formatPrice } from '../utils/pricing'
import { productSlug } from '../utils/slug'

const shimmerClass = 'skeleton animate-shimmer motion-reduce:animate-none'
const variantBase = 'flex flex-col gap-[0.35rem] border px-[0.9rem] py-[0.2rem] text-left rounded'
const variantClass = `${variantBase} cursor-pointer border-line bg-transparent text-ink hover:border-accent`
const variantSelectedClass = `${variantBase} cursor-pointer border-accent bg-transparent text-ink hover:border-accent`
const variantOutClass = `${variantBase} cursor-not-allowed border-line bg-line text-muted italic opacity-75 hover:border-line`

const route = useRoute()
const product = ref(null)
const allProducts = ref([])
const loading = ref(true)
const error = ref('')
const selectedImage = ref(0)
const selectedVariantId = ref(null)
const addedVariantId = ref(null)
const quantity = ref(1)

const images = computed(
  () => product.value?.images?.slice().sort((a, b) => a.sort_order - b.sort_order) || [],
)

const imageUrl = (image) => (image?.image_path ? assetUrl(`/storage/${image.image_path}`) : '')

const selectImage = (index) => {
  selectedImage.value = (index + images.value.length) % images.value.length
}

const nextImage = () => selectImage(selectedImage.value + 1)
const previousImage = () => selectImage(selectedImage.value - 1)

const variants = computed(() => product.value?.variants || [])
const similarProducts = computed(() => {
  const categoryId = product.value?.category_id ?? product.value?.category?.id
  return allProducts.value.filter(
    (item) =>
      item.id !== product.value?.id &&
      (item.category_id === categoryId || item.category?.id === categoryId),
  )
})
const selectedVariant = computed(
  () =>
    variants.value.find((variant) => variant.id === selectedVariantId.value) ||
    variants.value.find((variant) => variant.is_active && Number(variant.stock_qty) > 0) ||
    variants.value[0],
)

const variantUnavailable = (variant) => !variant.is_active || Number(variant.stock_qty) <= 0

const variantClassFor = (variant) =>
  variantUnavailable(variant)
    ? variantOutClass
    : selectedVariant.value?.id === variant.id
      ? variantSelectedClass
      : variantClass

const selectVariant = (variant) => {
  selectedVariantId.value = variant.id
  addedVariantId.value = null
  quantity.value = 1
}

const decreaseQuantity = () => {
  quantity.value = Math.max(1, quantity.value - 1)
}

const increaseQuantity = () => {
  const stock = Number(selectedVariant.value?.stock_qty ?? 0)
  quantity.value = Math.min(stock, quantity.value + 1)
}

const selectedPricing = computed(() => {
  const price = Number(selectedVariant.value?.price ?? 0)
  const discounted = Number(selectedVariant.value?.discounted_price ?? price)
  const hasDiscount = discounted < price
  return {
    currentPrice: hasDiscount ? discounted : price,
    originalPrice: price,
    hasDiscount,
  }
})

const addToCart = () => {
  const variant = selectedVariant.value
  if (!variant?.is_active || Number(variant.stock_qty) <= 0) return

  addItemToCart({
    productId: product.value.id,
    variantId: variant.id,
    productName: product.value.name,
    variantName: variant.name,
    imageUrl: imageUrl(images.value[0]),
    price: selectedPricing.value.currentPrice,
    quantity: quantity.value,
  })
  addedVariantId.value = variant.id
}

const loadProduct = async () => {
  window.scrollTo(0, 0)
  loading.value = true
  error.value = ''
  selectedImage.value = 0
  selectedVariantId.value = null
  addedVariantId.value = null
  quantity.value = 1
  try {
    if (!allProducts.value.length) allProducts.value = await getProducts()
    product.value = allProducts.value.find((item) => productSlug(item) === route.params.slug)
    if (!product.value) error.value = t('productDetail.notFound')
  } catch (requestError) {
    error.value = requestError.message || t('productDetail.loadError')
  } finally {
    loading.value = false
  }
}

onMounted(loadProduct)
watch(() => route.params.slug, loadProduct)
</script>

<template>
  <main class="mx-auto max-w-[1100px] px-[clamp(1.25rem,4vw,4.5rem)] pt-4 pb-10">
    <RouterLink
      to="/"
      class="inline-flex size-10 items-center justify-center rounded-full text-ink bg-paper shadow-[0_18px_40px_rgba(32,35,33,0.14)] mb-5"
      aria-label="Go back"
    >
      <svg class="size-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 12H5m6 6-6-6 6-6" />
      </svg>
    </RouterLink>
    <div
      v-if="loading"
      class="grid grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)] gap-[clamp(1.5rem,3vw,2.5rem)] max-md:grid-cols-1"
      aria-busy="true"
      :aria-label="t('productDetail.loading')"
    >
      <div :class="[shimmerClass, 'aspect-[4/5] max-h-[600px]']"></div>
      <div class="flex flex-col gap-4 self-center">
        <span :class="[shimmerClass, 'block h-4 max-w-80']"></span>
        <span :class="[shimmerClass, 'block h-12 max-w-[26rem]']"></span>
        <span :class="[shimmerClass, 'block h-6 max-w-32']"></span>
        <span :class="[shimmerClass, 'block h-4 max-w-80']"></span>
      </div>
    </div>
    <p v-else-if="error" class="col-span-full py-8 text-[0.9rem] text-danger">{{ error }}</p>
    <section
      v-else
      class="grid grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)] gap-[clamp(1.5rem,3vw,2.5rem)] max-md:grid-cols-1"
    >
      <div class="min-w-0">
        <div class="relative object-cover overflow-hidden bg-accent-soft">
          <Transition name="gallery-image">
            <img
              v-if="imageUrl(images[selectedImage])"
              :key="selectedImage"
              :src="imageUrl(images[selectedImage])"
              :alt="`${product.name} image ${selectedImage + 1}`"
              class="absolute inset-0 h-full w-full object-cover"
            />
            <div
              v-else
              key="no-image"
              class="absolute inset-0 flex h-full items-center justify-center text-[0.7rem] text-muted uppercase"
            >
              {{ t('productDetail.noImage') }}
            </div>
          </Transition>
          <template v-if="images.length > 1">
            <button
              class="absolute top-1/2 left-4 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center border border-ink bg-paper text-[1.25rem] text-ink hover:bg-accent hover:text-white focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-accent"
              type="button"
              :aria-label="t('productDetail.previousImage')"
              @click="previousImage"
            >
              ←
            </button>
            <button
              class="absolute top-1/2 right-4 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center border border-ink bg-paper text-[1.25rem] text-ink hover:bg-accent hover:text-white focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-accent"
              type="button"
              :aria-label="t('productDetail.nextImage')"
              @click="nextImage"
            >
              →
            </button>
          </template>
        </div>
        <div
          v-if="images.length > 1"
          class="flex gap-[0.65rem]"
          :aria-label="t('productDetail.productImages')"
        >
          <button
            v-for="(image, index) in images"
            :key="image.id || image.image_path"
            class="h-[5.5rem] flex-[0_0_4.5rem] cursor-pointer border-2 border-solid bg-accent-soft p-0 focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-accent"
            :class="selectedImage === index ? 'border-accent' : 'border-transparent'"
            type="button"
            :aria-label="`Show image ${index + 1}`"
            :aria-pressed="selectedImage === index"
            @click="selectImage(index)"
          >
            <img
              class="h-full w-full object-cover"
              :src="imageUrl(image)"
              :alt="`${product.name} thumbnail ${index + 1}`"
            />
          </button>
        </div>
      </div>
      <div>
        <!-- <p class="eyebrow justify-center">{{ product.category?.name || t('productDetail.collection') }}</p> -->
        <h2 class="my-[0.83em] text-[1.5em] font-bold text-ink">{{ product.name }}</h2>
        <h2 class="my-[0.83em] text-2xl font-bold text-sale">
          {{ formatPrice(selectedPricing.currentPrice) }}
          <s
            v-if="selectedPricing.hasDiscount"
            class="ml-2 text-[0.95rem] font-normal text-muted line-through"
          >
            {{ formatPrice(selectedPricing.originalPrice) }}
          </s>
        </h2>

        <h2 class="mt-6 mb-0 border-b border-line pb-[0.7rem] text-2xl font-semibold text-ink">
          {{ t('productDetail.selectSize') }}
        </h2>
        <div
          class="mt-5 flex flex-wrap gap-[0.65rem]"
          role="group"
          :aria-label="t('productDetail.chooseVariant')"
        >
          <button
            v-for="variant in variants"
            :key="variant.id"
            :class="variantClassFor(variant)"
            type="button"
            class="rounded"
            :disabled="variantUnavailable(variant)"
            :aria-pressed="selectedVariant?.id === variant.id"
            :aria-label="`${variant.name}${variantUnavailable(variant) ? ', unavailable' : ''}`"
            @click="selectVariant(variant)"
          >
            <span>{{ variant.name }}</span>
          </button>
        </div>
        <div v-if="selectedVariant" class="mt-4 flex flex-wrap items-center gap-3">
          <div
            class="inline-flex min-h-10 items-center overflow-hidden rounded border border-line bg-paper"
            role="group"
            :aria-label="t('cart.quantity')"
          >
            <button
              class="flex size-10 cursor-pointer items-center justify-center text-lg text-ink hover:bg-accent-soft disabled:cursor-not-allowed disabled:text-muted"
              type="button"
              :aria-label="t('cart.decreaseQuantity')"
              :disabled="variantUnavailable(selectedVariant) || quantity <= 1"
              @click="decreaseQuantity"
            >
              −
            </button>
            <span
              class="flex min-w-10 justify-center px-2 text-sm font-semibold text-ink"
              aria-live="polite"
            >
              {{ quantity }}
            </span>
            <button
              class="flex size-10 cursor-pointer items-center justify-center text-lg text-ink hover:bg-accent-soft disabled:cursor-not-allowed disabled:text-muted"
              type="button"
              :aria-label="t('cart.increaseQuantity')"
              :disabled="
                variantUnavailable(selectedVariant) || quantity >= Number(selectedVariant.stock_qty)
              "
              @click="increaseQuantity"
            >
              +
            </button>
          </div>
          <button
            class="ml-auto inline-flex min-h-10 cursor-pointer items-center gap-2 rounded border-0 bg-accent px-[0.8rem] py-[0.6rem] text-[0.82rem] font-bold text-white uppercase hover:bg-accent-hover focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
            type="button"
            :disabled="variantUnavailable(selectedVariant)"
            @click="addToCart"
          >
            <svg
              class="size-4 fill-none stroke-current stroke-[1.8]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M3 4h2l2 12h10l2-8H6" />
              <circle cx="9" cy="19" r="1" />
              <circle cx="17" cy="19" r="1" />
            </svg>
            {{
              addedVariantId === selectedVariant.id
                ? t('productDetail.addedToCart')
                : t('productDetail.addToCart')
            }}
          </button>
        </div>

        <div class="mt-4" v-html="product.description"></div>
      </div>
    </section>
    <section
      v-if="!loading && !error && similarProducts.length"
      class="mt-[clamp(2rem,4vw,3rem)] border-t border-line pt-5"
    >
      <h3 class="my-4 text-[1.17em] font-bold text-ink">{{ t('productDetail.similarItems') }}</h3>
      <ProductList :products="similarProducts" />
    </section>
  </main>
</template>
