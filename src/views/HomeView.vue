<script setup>
import { computed, onMounted, ref } from 'vue'
import ProductList from '../components/product/ProductList.vue'
import { getCategories } from '../services/categoryService'
import { getProducts } from '../services/productService'

const products = ref([])
const categories = ref([])
const selectedCategory = ref(null)
const loading = ref(true)
const error = ref('')
const filteredProducts = computed(() =>
  selectedCategory.value === null
    ? products.value
    : products.value.filter(
        (product) =>
          product.category_id === selectedCategory.value ||
          product.category?.id === selectedCategory.value,
      ),
)
const selectCategory = (categoryId) => {
  selectedCategory.value = categoryId
}

onMounted(async () => {
  try {
    ;[products.value, categories.value] = await Promise.all([getProducts(), getCategories()])
  } catch (requestError) {
    error.value = requestError.message || 'Unable to load the collection.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="catalog">
    <section class="catalog__intro">
      <p class="eyebrow">New arrivals</p>
      <h1>Find your next favorite.</h1>
      <p class="catalog__lead">Thoughtfully selected pieces, ready for your everyday rotation.</p>
      <!-- <span class="catalog__count" v-if="!loading && !error">
        {{ filteredProducts.length }} products
      </span> -->
    </section>

    <nav
      v-if="!loading && !error && categories.length"
      class="category-list"
      aria-label="Shop by category"
    >
      <span class="category-list__label">Browse by</span>
      <button
        type="button"
        class="category-list__link"
        :class="{ 'category-list__link--active': selectedCategory === null }"
        :aria-pressed="selectedCategory === null"
        @click="selectCategory(null)"
      >
        All products
      </button>
      <button
        v-for="category in categories"
        :key="category.id"
        type="button"
        class="category-list__link"
        :class="{ 'category-list__link--active': selectedCategory === category.id }"
        :aria-pressed="selectedCategory === category.id"
        @click="selectCategory(category.id)"
      >
        {{ category.name }} <span>{{ category.products?.length || 0 }}</span>
      </button>
    </nav>

    <section id="collection" aria-live="polite">
      <div
        v-if="loading"
        class="product-grid product-grid--loading"
        aria-busy="true"
        aria-label="Loading products"
      >
        <div v-for="placeholder in 4" :key="placeholder" class="product-card-skeleton">
          <div class="product-card-skeleton__image"></div>
          <div class="product-card-skeleton__content">
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
      <p v-else-if="error" class="status status--error">{{ error }}</p>
      <p v-else-if="!filteredProducts.length" class="status">No products in this category.</p>
      <ProductList v-else :products="filteredProducts" />
    </section>
  </main>
</template>
