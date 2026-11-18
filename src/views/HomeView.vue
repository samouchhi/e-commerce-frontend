<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BannerCarousel from '../components/home/BannerCarousel.vue'
import ProductList from '../components/product/ProductList.vue'
import CategoryCard from '../components/product/CategoryCard.vue'
import ProductGridSkeleton from '../components/product/ProductGridSkeleton.vue'
import { Button } from '../components/ui/button.js'
import { Alert, AlertTitle, Empty, EmptyTitle, Skeleton } from '../components/ui/feedback.js'
import { getBanners } from '../services/bannerService'
import { getCategories } from '../services/categoryService'
import { getProducts } from '../services/productService'
import { isOnPromotion } from '../utils/pricing'
import { filterCatalog } from '../utils/catalogue'
import { t } from '../services/i18n'
import StoreIcon from '../components/icons/StoreIcon.vue'

const banners = ref([])
const products = ref([])
const categories = ref([])
const loading = ref(true)
const error = ref('')
const promotions = computed(() => products.value.filter(isOnPromotion))
const mostPopular = computed(() =>
  filterCatalog(products.value, { sort: 'best-seller' }).slice(0, 8),
)
const loadHome = async () => {
  loading.value = true
  error.value = ''
  const results = await Promise.allSettled([getBanners(), getProducts(), getCategories()])
  if (results[0].status === 'fulfilled') banners.value = results[0].value
  if (results[1].status === 'fulfilled') products.value = results[1].value
  else error.value = t('home.loadError')
  if (results[2].status === 'fulfilled') categories.value = results[2].value
  loading.value = false
}
onMounted(loadHome)
</script>

<template>
  <main id="main-content" tabindex="-1" class="store-container store-home pb-12 md:pb-16">
    <h1 class="sr-only">MONGKOL</h1>
    <div v-if="loading || banners.length" class="mt-4 md:mt-6">
      <Skeleton v-if="loading && !banners.length" class="aspect-video rounded-2xl" />
      <section
        v-if="banners.length"
        class="min-w-0 overflow-hidden rounded-2xl"
        :aria-label="t('home.featuredPromotions')"
      >
        <BannerCarousel :banners="banners" @empty="banners = []" />
      </section>
    </div>
    <section v-if="loading" class="pt-7 md:pt-12"><ProductGridSkeleton /></section>
    <Alert v-else-if="error" class="mt-10 border-danger-line bg-danger-soft"
      ><AlertTitle>{{ error }}</AlertTitle
      ><Button variant="outline" class="mt-4" @click="loadHome">{{
        t('productDetail.retry')
      }}</Button></Alert
    >
    <Empty v-else-if="!products.length" class="mt-10 min-h-64"
      ><EmptyTitle>{{ t('products.empty') }}</EmptyTitle></Empty
    >
    <template v-else>
      <section v-if="categories.length" class="pt-6 md:pt-12" aria-labelledby="home-categories">
        <div class="mb-3 flex items-center justify-between gap-3 md:mb-5">
          <h2 id="home-categories" class="store-section-title">
            {{ t('products.shopByCategory') }}
          </h2>
          <RouterLink to="/categories" class="store-section-link"
            >{{ t('home.viewAll') }} <StoreIcon name="arrow" class="size-4"
          /></RouterLink>
        </div>
        <div class="store-category-grid">
          <CategoryCard
            v-for="category in categories"
            :key="category.id"
            :category="category"
            :products="products"
          />
        </div>
      </section>
      <section class="pt-7 md:pt-12" aria-labelledby="home-popular">
        <div class="mb-3 flex items-center justify-between gap-3 md:mb-5">
          <h2 id="home-popular" class="store-section-title">
            {{ t('home.popular') }}
          </h2>
          <RouterLink to="/products" class="store-section-link"
            >{{ t('home.viewAll') }} <StoreIcon name="arrow" class="size-4"
          /></RouterLink>
        </div>
        <ProductList :products="mostPopular" />
      </section>
      <section v-if="promotions.length" class="pt-7 md:pt-12" aria-labelledby="home-promotions">
        <div class="mb-3 flex items-center justify-between gap-3 md:mb-5">
          <h2 id="home-promotions" class="store-section-title">
            {{ t('home.promotions') }}
          </h2>
          <RouterLink to="/promotion" class="store-section-link"
            >{{ t('home.viewAll') }} <StoreIcon name="arrow" class="size-4"
          /></RouterLink>
        </div>
        <ProductList :products="promotions.slice(0, 8)" />
      </section>
    </template>
  </main>
</template>
