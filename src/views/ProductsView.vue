<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import StoreHero from '../components/layout/StoreHero.vue'
import ProductCatalogue from '../components/product/ProductCatalogue.vue'
import ProductGridSkeleton from '../components/product/ProductGridSkeleton.vue'
import { Button } from '../components/ui/button'
import { Alert, AlertTitle, Skeleton } from '../components/ui/feedback'
import { getCategories } from '../services/categoryService'
import { getProducts } from '../services/productService'
import { getBanners } from '../services/bannerService'
import { t } from '../services/i18n'
import StoreIcon from '../components/icons/StoreIcon.vue'

const products = ref([])
const categories = ref([])
const banners = ref([])
const bannersLoading = ref(true)
const loading = ref(true)
const error = ref('')
const heroImage = computed(() => banners.value[0]?.image)
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
  getBanners()
    .then((value) => {
      banners.value = value
    })
    .catch(() => {})
    .finally(() => {
      bannersLoading.value = false
    })
})
</script>

<template>
  <main
    id="main-content"
    tabindex="-1"
    class="store-container pb-16 pt-6"
    :aria-busy="loading || bannersLoading"
  >
    <div
      class="grid items-center gap-5 rounded-2xl bg-paper p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
    >
      <div>
        <h1 class="!mt-0 !mb-5">{{ t('store.productsTitle') }}</h1>
        <nav class="flex flex-wrap gap-3" :aria-label="t('store.quickLinks')">
          <RouterLink to="/categories" class="store-section-link"
            ><StoreIcon name="grid" class="size-4" />{{ t('nav.category') }}</RouterLink
          >
          <RouterLink to="/promotion" class="store-section-link"
            ><StoreIcon name="tag" class="size-4" />{{ t('nav.promotions') }}</RouterLink
          >
        </nav>
      </div>
      <div
        v-if="bannersLoading"
        role="status"
        :aria-label="t('productDetail.loading')"
        aria-busy="true"
      >
        <Skeleton class="aspect-video rounded-xl" />
      </div>
      <StoreHero v-else :image="heroImage" :alt="banners[0]?.title || t('store.productsTitle')" />
    </div>
    <nav
      class="mt-4 flex items-center gap-3 text-xs text-muted"
      :aria-label="t('productDetail.breadcrumbs')"
    >
      <RouterLink
        to="/"
        class="inline-flex min-h-11 items-center text-accent focus-visible:outline-2 focus-visible:outline-accent"
        :aria-label="t('nav.home')"
        :title="t('nav.home')"
        ><StoreIcon name="home" class="size-4" /></RouterLink
      ><span aria-hidden="true">›</span><span aria-current="page">{{ t('nav.products') }}</span>
    </nav>
    <ProductGridSkeleton v-if="loading" class="mt-6" />
    <Alert v-else-if="error" class="mt-6 border-danger-line bg-danger-soft"
      ><AlertTitle>{{ error }}</AlertTitle
      ><Button variant="outline" class="mt-4" @click="loadProducts">{{
        t('productDetail.retry')
      }}</Button></Alert
    >
    <ProductCatalogue v-else :products="products" :categories="categories" />
  </main>
</template>
