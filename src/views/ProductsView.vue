<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProductList from '../components/product/ProductList.vue'
import { getCategories } from '../services/categoryService'
import { getProducts } from '../services/productService'

const catalogClass =
  'mx-auto max-w-[1200px] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(1.25rem,2.5vw,2rem)]'
const introClass = 'max-w-[680px] pb-[clamp(1.25rem,2.5vw,2rem)]'
const leadClass = 'mb-[0.35rem] max-w-[370px] text-[1.05rem] text-muted'
const skeletonGridClass =
  'grid grid-cols-3 items-start gap-x-[0.55rem] gap-y-[clamp(0.9rem,2vw,1.5rem)] border-t border-line md:grid-cols-4'
const statusClass = 'col-span-full py-8 text-[0.9rem] text-muted'
const linkBase =
  'cursor-pointer border-0 bg-transparent p-0 text-[0.68rem] font-bold uppercase no-underline hover:text-accent focus-visible:outline-solid focus-visible:outline-[2px] focus-visible:outline-offset-4 focus-visible:outline-accent'
const linkClass = `${linkBase} text-ink`
const linkActiveClass = `${linkBase} text-accent`

const route = useRoute()
const router = useRouter()

const products = ref([])
const categories = ref([])
const loading = ref(true)
const error = ref('')

const selectedCategory = computed(() =>
  route.query.category ? Number(route.query.category) : null,
)

const filteredProducts = computed(() =>
  selectedCategory.value === null
    ? products.value
    : products.value.filter((product) => product.category?.id === selectedCategory.value),
)

const selectCategory = (categoryId) => {
  router.replace({
    path: '/products',
    query: categoryId === null ? {} : { category: String(categoryId) },
  })
}

onMounted(async () => {
  window.scrollTo(0, 0)
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
  <main :class="catalogClass">
    <nav
      v-if="!loading && !error && categories.length"
      class="mb-[clamp(1rem,2vw,1.5rem)] flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-line py-3"
      aria-label="Shop by category"
    >
      <span class="mr-2 text-[0.62rem] font-bold text-muted uppercase">Browse by</span>
      <button
        type="button"
        :class="selectedCategory === null ? linkActiveClass : linkClass"
        :aria-pressed="selectedCategory === null"
        @click="selectCategory(null)"
      >
        All products
      </button>
      <button
        v-for="category in categories"
        :key="category.id"
        type="button"
        :class="selectedCategory === category.id ? linkActiveClass : linkClass"
        :aria-pressed="selectedCategory === category.id"
        @click="selectCategory(category.id)"
      >
        {{ category.name }}
        <span class="ml-[0.2rem] text-[0.58rem] text-muted">{{
          category.products?.length || 0
        }}</span>
      </button>
    </nav>

    <section aria-live="polite">
      <div v-if="loading" :class="skeletonGridClass" aria-busy="true" aria-label="Loading products">
        <div v-for="placeholder in 8" :key="placeholder" class="min-w-0">
          <div class="aspect-square bg-accent-soft"></div>
          <div class="grid gap-2 pt-4">
            <span class="block h-[0.9rem] w-[70%] bg-accent-soft"></span>
            <span class="block h-[0.7rem] w-[35%] bg-accent-soft"></span>
          </div>
        </div>
      </div>
      <p v-else-if="error" :class="[statusClass, 'text-danger']">{{ error }}</p>
      <p v-else-if="!filteredProducts.length" :class="statusClass">No products in this category.</p>
      <ProductList v-else :products="filteredProducts" />
    </section>
  </main>
</template>
