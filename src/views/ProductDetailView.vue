<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ProductList from '../components/product/ProductList.vue'
import { addToCart as addItemToCart } from '../services/cartService'
import { assetUrl } from '../services/api'
import { getProducts } from '../services/productService'
import { formatPrice } from '../utils/pricing'
import { productSlug } from '../utils/slug'

const shimmerClass = 'skeleton animate-shimmer motion-reduce:animate-none'
const variantBase = 'flex flex-col gap-[0.35rem] border px-[0.9rem] py-[0.8rem] text-left'
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

const variantUnavailable = (variant) =>
  !variant.is_active || Number(variant.stock_qty) <= 0

const variantClassFor = (variant) =>
  variantUnavailable(variant)
    ? variantOutClass
    : selectedVariant.value?.id === variant.id
      ? variantSelectedClass
      : variantClass

const selectVariant = (variant) => {
  selectedVariantId.value = variant.id
  addedVariantId.value = null
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
  try {
    if (!allProducts.value.length) allProducts.value = await getProducts()
    product.value = allProducts.value.find((item) => productSlug(item) === route.params.slug)
    if (!product.value) error.value = 'Product not found.'
  } catch (requestError) {
    error.value = requestError.message || 'Unable to load product.'
  } finally {
    loading.value = false
  }
}

onMounted(loadProduct)
watch(() => route.params.slug, loadProduct)
</script>

<template>
  <main class="mx-auto max-w-[1100px] px-[clamp(1.25rem,4vw,4.5rem)] pt-4 pb-10">
    <RouterLink to="/" class="back-link">← Back to shop</RouterLink>
    <div
      v-if="loading"
      class="grid grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)] gap-[clamp(1.5rem,3vw,2.5rem)] max-md:grid-cols-1"
      aria-busy="true"
      aria-label="Loading product"
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
        <div class="relative aspect-[4/5] max-h-[600px] overflow-hidden bg-accent-soft">
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
              No image
            </div>
          </Transition>
          <template v-if="images.length > 1">
            <button
              class="absolute top-1/2 left-4 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center border border-ink bg-paper text-[1.25rem] text-ink hover:bg-accent hover:text-white focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-accent"
              type="button"
              aria-label="Previous image"
              @click="previousImage"
            >
              ←
            </button>
            <button
              class="absolute top-1/2 right-4 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center border border-ink bg-paper text-[1.25rem] text-ink hover:bg-accent hover:text-white focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-accent"
              type="button"
              aria-label="Next image"
              @click="nextImage"
            >
              →
            </button>
          </template>
        </div>
        <div v-if="images.length > 1" class="flex gap-[0.65rem]" aria-label="Product images">
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
        <p class="eyebrow">{{ product.category?.name || 'Collection' }}</p>
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
          Please select one size
        </h2>
        <div class="mt-5 flex flex-wrap gap-[0.65rem]" role="group" aria-label="Choose a product variant">
          <button
            v-for="variant in variants"
            :key="variant.id"
            :class="variantClassFor(variant)"
            type="button"
            :disabled="variantUnavailable(variant)"
            :aria-pressed="selectedVariant?.id === variant.id"
            :aria-label="`${variant.name}${variantUnavailable(variant) ? ', unavailable' : ''}`"
            @click="selectVariant(variant)"
          >
            <span>{{ variant.name }}</span>
          </button>
        </div>
        <div v-if="selectedVariant" class="mt-4 flex items-center justify-between gap-4">
          <button
            class="min-h-11 cursor-pointer border-0 bg-accent px-[0.8rem] py-[0.6rem] text-[0.62rem] font-bold text-white uppercase hover:bg-accent-hover focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
            type="button"
            :disabled="variantUnavailable(selectedVariant)"
            @click="addToCart"
          >
            {{ addedVariantId === selectedVariant.id ? 'Added to cart' : 'Add to cart' }}
          </button>
        </div>
        <details
          v-if="product.description"
          open
          class="mt-4 max-w-[420px] border-t border-line pt-[0.7rem] text-muted"
        >
          <summary class="cursor-pointer text-[0.68rem] font-bold text-ink uppercase">Description</summary>
          <p class="mt-4 text-base text-muted uppercase">Product code: {{ product.product_code }}</p>

          <p class="mt-4">{{ product.description }}</p>
        </details>
      </div>
    </section>
    <section
      v-if="!loading && !error && similarProducts.length"
      class="mt-[clamp(2rem,4vw,3rem)] border-t border-line pt-5"
    >
      <h3 class="my-4 text-[1.17em] font-bold text-ink">Similar items</h3>
      <ProductList :products="similarProducts" />
    </section>
  </main>
</template>
