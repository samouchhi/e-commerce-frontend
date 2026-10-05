<script setup>
import ProductCard from './ProductCard.vue'

defineProps({
  products: {
    type: Array,
    required: true,
  },
})
</script>

<template>
  <div class="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
    <ProductCard v-for="product in products" :key="product.id" :product="product" />
  </div>
</template>
