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
  <div
    class="grid grid-cols-2 gap-x-[0.7rem] gap-y-[clamp(1rem,2vw,1.5rem)] md:grid-cols-3 lg:grid-cols-4"
  >
    <ProductCard v-for="product in products" :key="product.id" :product="product" />
  </div>
</template>
