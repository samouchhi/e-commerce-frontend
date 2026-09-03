<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  product: {
    type: Object,
    required: true,
  },
})

const imageUrl = (product) => {
  const image = product.images?.slice().sort((a, b) => a.sort_order - b.sort_order)[0]
  return image?.image_path ? `/storage/${image.image_path}` : ''
}

const activeVariant = (product) =>
  product.variants?.find((variant) => variant.is_active) || product.variants?.[0]

const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(price || 0))
</script>

<template>
  <RouterLink :to="`/products/${product.id}`" class="product-card">
    <div class="product-card__image-wrap">
      <img
        v-if="imageUrl(product)"
        :src="imageUrl(product)"
        :alt="product.name"
        class="product-card__image"
        loading="lazy"
      />
      <div v-else class="product-card__placeholder" aria-hidden="true">No image</div>
    </div>
    <div class="product-card__content">
      <div>
        <h3>{{ product.name }}</h3>
      </div>
      <strong>{{ formatPrice(activeVariant(product)?.price) }}</strong>
      <!-- <p class="product-card__stock">
        {{
          activeVariant(product)?.stock_qty > 0
            ? `${activeVariant(product).stock_qty} in stock`
            : 'Currently unavailable'
        }}
      </p> -->
    </div>
  </RouterLink>
</template>
