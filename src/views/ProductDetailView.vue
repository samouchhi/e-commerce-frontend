<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ProductList from '../components/product/ProductList.vue'
import { addToCart as addItemToCart } from '../services/cartService'
import { assetUrl } from '../services/api'
import { getProducts } from '../services/productService'

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

const selectVariant = (variant) => {
  selectedVariantId.value = variant.id
  addedVariantId.value = null
}

const addToCart = () => {
  const variant = selectedVariant.value
  if (!variant?.is_active || Number(variant.stock_qty) <= 0) return

  addItemToCart({
    productId: product.value.id,
    variantId: variant.id,
    productName: product.value.name,
    variantName: variant.name,
    imageUrl: imageUrl(images.value[0]),
    price: Number(variant.price),
  })
  addedVariantId.value = variant.id
}

const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(price || 0))

const loadProduct = async () => {
  window.scrollTo(0, 0)
  loading.value = true
  error.value = ''
  selectedImage.value = 0
  selectedVariantId.value = null
  addedVariantId.value = null
  try {
    if (!allProducts.value.length) allProducts.value = await getProducts()
    product.value = allProducts.value.find((item) => String(item.id) === route.params.id)
    if (!product.value) error.value = 'Product not found.'
  } catch (requestError) {
    error.value = requestError.message || 'Unable to load product.'
  } finally {
    loading.value = false
  }
}

onMounted(loadProduct)
watch(() => route.params.id, loadProduct)
</script>

<template>
  <main class="product-detail">
    <RouterLink to="/" class="back-link">← Back to shop</RouterLink>
    <div
      v-if="loading"
      class="product-detail__loading"
      aria-busy="true"
      aria-label="Loading product"
    >
      <div class="product-detail__loading-image"></div>
      <div class="product-detail__loading-info">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
    <p v-else-if="error" class="status status--error">{{ error }}</p>
    <section v-else class="product-detail__layout">
      <div class="product-detail__gallery">
        <div class="product-detail__image-wrap">
          <Transition name="gallery-image">
            <img
              v-if="imageUrl(images[selectedImage])"
              :key="selectedImage"
              :src="imageUrl(images[selectedImage])"
              :alt="`${product.name} image ${selectedImage + 1}`"
              class="product-detail__image"
            />
            <div v-else key="no-image" class="product-card__placeholder">No image</div>
          </Transition>
          <template v-if="images.length > 1">
            <button
              class="gallery-button gallery-button--previous"
              type="button"
              aria-label="Previous image"
              @click="previousImage"
            >
              ←
            </button>
            <button
              class="gallery-button gallery-button--next"
              type="button"
              aria-label="Next image"
              @click="nextImage"
            >
              →
            </button>
          </template>
        </div>
        <div v-if="images.length > 1" class="gallery-thumbnails" aria-label="Product images">
          <button
            v-for="(image, index) in images"
            :key="image.id || image.image_path"
            class="gallery-thumbnail"
            :class="{ 'gallery-thumbnail--active': selectedImage === index }"
            type="button"
            :aria-label="`Show image ${index + 1}`"
            :aria-pressed="selectedImage === index"
            @click="selectImage(index)"
          >
            <img :src="imageUrl(image)" :alt="`${product.name} thumbnail ${index + 1}`" />
          </button>
        </div>
      </div>
      <div class="product-detail__info">
        <p class="eyebrow">{{ product.category?.name || 'Collection' }}</p>
        <h2>{{ product.name }}</h2>
        <h2 class="selected-price">{{ formatPrice(selectedVariant.price) }}</h2>

        <h2 class="variants-heading">Please select one size</h2>
        <div class="variant-selector" role="group" aria-label="Choose a product variant">
          <button
            v-for="variant in variants"
            :key="variant.id"
            class="variant-option"
            :class="{
              'variant-option--selected': selectedVariant?.id === variant.id,
              'variant-option--out': Number(variant.stock_qty) <= 0,
            }"
            type="button"
            :disabled="!variant.is_active || Number(variant.stock_qty) <= 0"
            :aria-pressed="selectedVariant?.id === variant.id"
            :aria-label="`${variant.name}${!variant.is_active || Number(variant.stock_qty) <= 0 ? ', unavailable' : ''}`"
            @click="selectVariant(variant)"
          >
            <span>{{ variant.name }}</span>
          </button>
        </div>
        <div v-if="selectedVariant" class="selected-purchase">
          <button
            class="add-cart-button"
            type="button"
            :disabled="!selectedVariant.is_active || Number(selectedVariant.stock_qty) <= 0"
            @click="addToCart"
          >
            {{ addedVariantId === selectedVariant.id ? 'Added to cart' : 'Add to cart' }}
          </button>
        </div>
        <details v-if="product.description" open class="product-detail__description">
          <summary>Description</summary>
          <p class="product-card__code">Product code: {{ product.product_code }}</p>

          <p>{{ product.description }}</p>
        </details>
      </div>
    </section>
    <section v-if="!loading && !error && similarProducts.length" class="similar-products">
      <h3>Similar items</h3>
      <ProductList :products="similarProducts" />
    </section>
  </main>
</template>
