<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getCategories } from '../services/categoryService'
import { getProducts } from '../services/productService'
import CategoryCard from '../components/product/CategoryCard.vue'
import { t } from '../services/i18n'
import { Button } from '../components/ui/button'
import { Alert, AlertTitle, Empty, EmptyTitle, Skeleton } from '../components/ui/feedback'
import StoreIcon from '../components/icons/StoreIcon.vue'

const categories = ref([])
const products = ref([])
const loading = ref(true)
const error = ref(false)
const load = async () => {
  loading.value = true
  error.value = false
  try {
    const [categoryResult, productResult] = await Promise.allSettled([
      getCategories(),
      getProducts(),
    ])
    if (categoryResult.status === 'rejected') throw categoryResult.reason
    categories.value = categoryResult.value
    products.value = productResult.status === 'fulfilled' ? productResult.value : []
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <main id="main-content" tabindex="-1" class="store-container py-8 pb-16 sm:py-12">
    <header class="mb-8 flex items-center justify-between gap-4">
      <div class="store-page-heading">
        <h1 class="!m-0">{{ t('products.shopByCategory') }}</h1>
      </div>
      <Button as-child variant="outline" size="icon" class="shrink-0">
        <RouterLink to="/products" :aria-label="t('nav.products')" :title="t('nav.products')"
          ><StoreIcon name="bag"
        /></RouterLink>
      </Button>
    </header>
    <section :aria-busy="loading" :aria-label="t('nav.category')">
      <div
        v-if="loading"
        class="store-category-grid"
        role="status"
        :aria-label="t('productDetail.loading')"
      >
        <Skeleton v-for="n in 4" :key="n" class="h-40 rounded-xl" />
      </div>
      <Alert v-else-if="error" variant="error">
        <AlertTitle>{{ t('categories.loadError') }}</AlertTitle>
        <Button variant="outline" class="mt-4" @click="load"
          ><StoreIcon name="refresh" />{{ t('productDetail.retry') }}</Button
        >
      </Alert>
      <Empty v-else-if="!categories.length" class="min-h-64">
        <span class="store-icon-tile"><StoreIcon name="grid" class="size-5" /></span>
        <EmptyTitle>{{ t('categories.empty') }}</EmptyTitle>
      </Empty>
      <div v-else class="store-category-grid">
        <CategoryCard
          v-for="category in categories"
          :key="category.id"
          :category="category"
          :products="products"
        />
      </div>
    </section>
  </main>
</template>
