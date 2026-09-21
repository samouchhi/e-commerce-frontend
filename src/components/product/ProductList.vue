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
    class="grid grid-cols-3 gap-x-[0.55rem] gap-y-[clamp(0.9rem,2vw,1.5rem)] border-t border-line md:grid-cols-4"
  >
    <ProductCard v-for="product in products" :key="product.id" :product="product" />
  </div>
</template>
