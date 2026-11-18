<script setup>
import ProductCard from './ProductCard.vue'

defineProps({
  products: {
    type: Array,
    required: true,
  },
  showDescription: Boolean,
})
</script>

<template>
  <div class="store-product-grid">
    <ProductCard
      v-for="product in products"
      :key="product.id"
      :product="product"
      :show-description="showDescription"
    />
  </div>
</template>
