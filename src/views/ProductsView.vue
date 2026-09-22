<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProductList from '../components/product/ProductList.vue'
import { getCategories } from '../services/categoryService'
import { getProducts } from '../services/productService'
import { t } from '../services/i18n'

const catalogClass =
  'mx-auto max-w-[1200px] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(2rem,4vw,3.5rem)]'
const skeletonGridClass =
  'grid grid-cols-2 items-start gap-x-[0.7rem] gap-y-[clamp(1rem,2vw,1.5rem)] md:grid-cols-3 lg:grid-cols-4'
const statusClass = 'col-span-full py-8 text-[0.9rem] text-muted'
const categoryButtonBase =
  'shrink-0 cursor-pointer border border-accent px-3 py-1.5 text-[0.78rem] leading-none transition-colors focus-visible:outline-solid focus-visible:outline-[2px] focus-visible:outline-offset-2 focus-visible:outline-accent'
const categoryButtonClass = `${categoryButtonBase} bg-paper text-accent hover:bg-accent-soft`
const categoryButtonActiveClass = `${categoryButtonBase} bg-accent font-semibold text-white hover:bg-accent`

const route = useRoute()
const router = useRouter()

const products = ref([])
const categories = ref([])
const loading = ref(true)
const error = ref('')
const searchQuery = ref('')
const sortBy = ref('best-seller')
const isSortOpen = ref(false)
const sortMenu = ref(null)
const sortOptions = computed(() => [
  { value: 'name-asc', label: t('products.nameAsc') },
  { value: 'name-desc', label: t('products.nameDesc') },
  { value: 'best-seller', label: t('products.bestSeller') },
  { value: 'new-arrival', label: t('products.newArrival') },
])

const selectedCategory = computed(() =>
  route.query.category ? Number(route.query.category) : null,
)

const activeSortLabel = computed(
  () => sortOptions.value.find((option) => option.value === sortBy.value)?.label || t('products.bestSeller'),
)

const filteredProducts = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  const visibleProducts = products.value.filter((product) => {
    const belongsToCategory =
      selectedCategory.value === null || product.category?.id === selectedCategory.value
    const matchesSearch = !query || product.name.toLocaleLowerCase().includes(query)

    return belongsToCategory && matchesSearch
  })

  if (sortBy.value === 'new-arrival') {
    return visibleProducts
  }

  return [...visibleProducts].sort((firstProduct, secondProduct) => {
    if (sortBy.value === 'name-desc') {
      return secondProduct.name.localeCompare(firstProduct.name)
    }

    if (sortBy.value === 'best-seller') {
      return Number(secondProduct.is_best_seller) - Number(firstProduct.is_best_seller)
    }

    return firstProduct.name.localeCompare(secondProduct.name)
  })
})

const selectCategory = (categoryId) => {
  router.replace({
    path: '/products',
    query: categoryId === null ? {} : { category: String(categoryId) },
  })
}

const selectSort = (value) => {
  sortBy.value = value
  isSortOpen.value = false
}

const closeSortOnOutsideClick = (event) => {
  if (!sortMenu.value?.contains(event.target)) {
    isSortOpen.value = false
  }
}

onMounted(async () => {
  window.scrollTo(0, 0)
  document.addEventListener('click', closeSortOnOutsideClick)
  try {
    ;[products.value, categories.value] = await Promise.all([getProducts(), getCategories()])
  } catch (requestError) {
    error.value = requestError.message || 'Unable to load the collection.'
  } finally {
    loading.value = false
  }
})

onUnmounted(() => document.removeEventListener('click', closeSortOnOutsideClick))
</script>

<template>
  <main :class="catalogClass">
    <div class="mb-[clamp(1.5rem,3vw,2.5rem)] justify-items-center">
      <h1 class="mt-6 text-[clamp(1.8rem,4vw,2.7rem)] font-medium tracking-[-0.04em] uppercase">
        {{ t('products.title') }}
      </h1>
    </div>
    <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <label class="relative block w-full sm:max-w-[12.6rem]">
        <span class="sr-only">{{ t('products.search') }}</span>
        <svg
          class="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <input
          v-model="searchQuery"
          class="h-10 w-full border border-line bg-paper pr-3 pl-10 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
          type="search"
          :placeholder="t('products.search')"
        />
      </label>

      <div ref="sortMenu" class="relative w-full sm:w-[11.75rem]">
        <button
          class="flex h-10 w-full cursor-pointer items-center justify-between bg-accent-soft px-3 text-left text-sm text-ink transition-colors hover:bg-line focus-visible:outline-solid focus-visible:outline-[2px] focus-visible:outline-offset-2 focus-visible:outline-accent"
          type="button"
          aria-haspopup="listbox"
          :aria-expanded="isSortOpen"
          aria-controls="product-sort-options"
          @click="isSortOpen = !isSortOpen"
        >
          {{ activeSortLabel }}
          <svg
            :class="[
              'h-4 w-4 shrink-0 fill-none stroke-current stroke-[2] transition-transform duration-150 [stroke-linecap:round] [stroke-linejoin:round] motion-reduce:transition-none',
              isSortOpen ? 'rotate-180' : '',
            ]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <div
          v-if="isSortOpen"
          id="product-sort-options"
          class="absolute top-[calc(100%+0.5rem)] right-0 z-20 w-full overflow-hidden border border-line bg-paper py-1 shadow-[0_10px_24px_rgba(32,35,33,0.14)]"
          role="listbox"
          :aria-label="t('products.sort')"
        >
          <button
            v-for="option in sortOptions"
            :key="option.value"
            class="flex min-h-9 w-full cursor-pointer items-center gap-2 px-3 text-left text-sm text-ink transition-colors hover:bg-accent-soft focus-visible:bg-accent-soft focus-visible:outline-none"
            type="button"
            role="option"
            :aria-selected="sortBy === option.value"
            @click="selectSort(option.value)"
          >
            <svg
              v-if="sortBy === option.value"
              class="h-4 w-4 shrink-0 fill-none stroke-current stroke-[2] text-muted [stroke-linecap:round] [stroke-linejoin:round]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="m5 12 4 4L19 6" />
            </svg>
            <span v-else class="h-4 w-4 shrink-0" aria-hidden="true"></span>
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>

    <nav
      v-if="!loading && !error && categories.length"
      class="mb-[clamp(1rem,2vw,1.5rem)] flex gap-2 overflow-x-auto border-y border-line py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Shop by category"
    >
      <button
        type="button"
        :class="selectedCategory === null ? categoryButtonActiveClass : categoryButtonClass"
        :aria-pressed="selectedCategory === null"
        @click="selectCategory(null)"
      >
        {{ t('products.all') }}
      </button>
      <button
        v-for="category in categories"
        :key="category.id"
        type="button"
        :class="selectedCategory === category.id ? categoryButtonActiveClass : categoryButtonClass"
        :aria-pressed="selectedCategory === category.id"
        @click="selectCategory(category.id)"
      >
        {{ category.name }}
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
      <p v-else-if="!filteredProducts.length" :class="statusClass">
        {{ t('products.noMatch') }}
      </p>
      <ProductList v-else :products="filteredProducts" />
    </section>
  </main>
</template>
