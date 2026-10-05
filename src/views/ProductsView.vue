<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import ProductList from '../components/product/ProductList.vue'
import ProductGridSkeleton from '../components/product/ProductGridSkeleton.vue'
import { Button } from '../components/ui/button.js'
import { Badge } from '../components/ui/badge.js'
import { Field, FieldGroup, FieldLabel } from '../components/ui/field.js'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  NativeSelect,
} from '../components/ui/input.js'
import { Alert, AlertTitle, Empty, EmptyTitle } from '../components/ui/feedback.js'
import { getCategories } from '../services/categoryService'
import { getProducts } from '../services/productService'
import { t } from '../services/i18n'

const route = useRoute()
const router = useRouter()
const products = ref([])
const categories = ref([])
const loading = ref(true)
const error = ref('')
const searchQuery = ref('')
const sortBy = ref('best-seller')
const sortOptions = computed(() => [
  { value: 'best-seller', label: t('products.bestSeller') },
  { value: 'new-arrival', label: t('products.newArrival') },
  { value: 'name-asc', label: t('products.nameAsc') },
  { value: 'name-desc', label: t('products.nameDesc') },
])
const selectedCategory = computed(() =>
  route.query.category ? Number(route.query.category) : null,
)
const filteredProducts = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  const visibleProducts = products.value.filter(
    (product) =>
      (selectedCategory.value === null || product.category?.id === selectedCategory.value) &&
      (!query || product.name.toLocaleLowerCase().includes(query)),
  )
  if (sortBy.value === 'new-arrival') return visibleProducts
  return [...visibleProducts].sort((first, second) => {
    if (sortBy.value === 'name-desc') return second.name.localeCompare(first.name)
    if (sortBy.value === 'best-seller')
      return Number(second.is_best_seller) - Number(first.is_best_seller)
    return first.name.localeCompare(second.name)
  })
})
const clearFilters = () => {
  searchQuery.value = ''
  sortBy.value = 'best-seller'
  router.replace('/products')
}
const loadProducts = async () => {
  loading.value = true
  error.value = ''
  try {
    ;[products.value, categories.value] = await Promise.all([getProducts(), getCategories()])
  } catch {
    error.value = t('home.loadError')
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  window.scrollTo(0, 0)
  loadProducts()
})
</script>

<template>
  <main class="mx-auto max-w-[1200px] px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
    <header class="mb-8 flex flex-wrap items-center gap-3 sm:mb-10">
      <h1 class="m-0">{{ t('products.title') }}</h1>
      <Badge v-if="!loading && !error" variant="secondary" role="status">{{
        t('products.resultCount').replace('{count}', filteredProducts.length)
      }}</Badge>
    </header>
    <FieldGroup class="mb-5 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,15rem)]">
      <Field>
        <FieldLabel for="product-search" class="sr-only">{{ t('products.search') }}</FieldLabel>
        <InputGroup>
          <InputGroupAddon
            ><svg
              class="size-5 fill-none stroke-current stroke-[1.5]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 4.5 4.5" /></svg
          ></InputGroupAddon>
          <InputGroupInput
            id="product-search"
            v-model="searchQuery"
            type="search"
            :placeholder="t('products.search')"
          />
        </InputGroup>
      </Field>
      <Field>
        <FieldLabel for="product-sort" class="sr-only">{{ t('products.sort') }}</FieldLabel>
        <NativeSelect id="product-sort" v-model="sortBy"
          ><option v-for="option in sortOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option></NativeSelect
        >
      </Field>
    </FieldGroup>
    <nav
      v-if="!loading && !error && categories.length"
      class="mb-8 flex flex-wrap gap-2"
      :aria-label="t('products.shopByCategory')"
    >
      <Button
        as-child
        :variant="selectedCategory === null ? 'default' : 'outline'"
        class="min-h-11 rounded-full"
      >
        <RouterLink
          to="/products"
          replace
          :aria-current="selectedCategory === null ? 'page' : undefined"
          >{{ t('products.all') }}</RouterLink
        >
      </Button>
      <Button
        v-for="category in categories"
        :key="category.id"
        as-child
        :variant="selectedCategory === category.id ? 'default' : 'outline'"
        class="h-auto min-h-11 max-w-full rounded-full whitespace-normal text-left"
      >
        <RouterLink
          :to="{ path: '/products', query: { category: String(category.id) } }"
          replace
          :aria-current="selectedCategory === category.id ? 'page' : undefined"
          >{{ category.name }}</RouterLink
        >
      </Button>
    </nav>
    <section aria-live="polite">
      <ProductGridSkeleton v-if="loading" />
      <Alert v-else-if="error" class="border-danger-line bg-danger-soft"
        ><AlertTitle>{{ error }}</AlertTitle
        ><Button type="button" variant="outline" class="mt-4" @click="loadProducts">{{
          t('productDetail.retry')
        }}</Button></Alert
      >
      <Empty v-else-if="!filteredProducts.length" class="min-h-64 rounded-2xl">
        <EmptyTitle>{{ products.length ? t('products.noMatch') : t('products.empty') }}</EmptyTitle>
        <Button
          v-if="products.length"
          variant="outline"
          class="mt-2 rounded-full"
          @click="clearFilters"
          >{{ t('products.clearFilters') }}</Button
        >
      </Empty>
      <ProductList v-else :products="filteredProducts" />
    </section>
  </main>
</template>
