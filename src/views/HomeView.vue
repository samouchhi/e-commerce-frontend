<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BannerCarousel from '../components/home/BannerCarousel.vue'
import ProductList from '../components/product/ProductList.vue'
import ProductGridSkeleton from '../components/product/ProductGridSkeleton.vue'
import PromotionHeading from '../components/product/PromotionHeading.vue'
import { Button } from '../components/ui/button.js'
import { Alert, AlertTitle, Empty, EmptyTitle } from '../components/ui/feedback.js'
import { getBanners } from '../services/bannerService'
import { getProducts } from '../services/productService'
import { groupPromotions, isOnPromotion } from '../utils/pricing'
import { t } from '../services/i18n'

const banners = ref([])
const products = ref([])
const loading = ref(true)
const error = ref('')
const promotions = computed(() => products.value.filter(isOnPromotion))
const promoGroups = computed(() => groupPromotions(promotions.value))
const mostPopular = computed(() => {
  const bestSellers = products.value.filter((product) => product.is_best_seller)
  return (bestSellers.length ? bestSellers : products.value).slice(0, 8)
})
const newArrivals = computed(() => products.value.slice(0, 8))
const sections = computed(() =>
  [
    { key: 'popular', title: t('home.popular'), products: mostPopular.value, to: '/products' },
    ...(promoGroups.value.length
      ? [
          {
            key: 'promotions',
            title: t('home.promotions'),
            groups: promoGroups.value,
            to: '/promotion',
          },
        ]
      : []),
    { key: 'new', title: t('home.newArrivals'), products: newArrivals.value, to: '/products' },
  ].filter((section) => section.groups || section.products.length),
)

const loadHome = async () => {
  loading.value = true
  error.value = ''
  const [bannerResult, productResult] = await Promise.allSettled([getBanners(), getProducts()])
  if (bannerResult.status === 'fulfilled') banners.value = bannerResult.value
  if (productResult.status === 'fulfilled') products.value = productResult.value
  else error.value = t('home.loadError')
  loading.value = false
}
onMounted(loadHome)
</script>

<template>
  <main class="mx-auto max-w-[1200px] px-5 pb-16 sm:px-8 lg:px-12">
    <h1 class="sr-only">MONGKOL</h1>
    <section
      v-if="banners.length"
      class="mt-5 overflow-hidden rounded-2xl border border-line sm:mt-8"
      :aria-label="t('home.featuredPromotions')"
    >
      <BannerCarousel :banners="banners" @empty="banners = []" />
    </section>
    <section v-if="loading" class="pt-10 sm:pt-12"><ProductGridSkeleton /></section>
    <Alert v-else-if="error" class="mt-10 border-danger-line bg-danger-soft">
      <AlertTitle>{{ error }}</AlertTitle>
      <Button type="button" variant="outline" class="mt-4" @click="loadHome">{{
        t('productDetail.retry')
      }}</Button>
    </Alert>
    <Empty v-else-if="!products.length" class="mt-10 min-h-64"
      ><EmptyTitle>{{ t('products.empty') }}</EmptyTitle></Empty
    >
    <template v-else>
      <section
        v-for="section in sections"
        :key="section.key"
        class="pt-10 sm:pt-14"
        :aria-labelledby="`home-${section.key}`"
      >
        <div class="mb-6 flex items-center justify-between gap-4">
          <h2
            :id="`home-${section.key}`"
            class="m-0 text-xl font-semibold leading-snug tracking-tight sm:text-2xl"
          >
            {{ section.title }}
          </h2>
          <Button as-child variant="outline" class="min-h-11 shrink-0 rounded-full px-4">
            <RouterLink :to="section.to"
              >{{ t('home.viewAll')
              }}<svg
                data-icon="inline-end"
                class="fill-none stroke-current stroke-[1.5]"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M5 12h14m-6-6 6 6-6 6" /></svg
            ></RouterLink>
          </Button>
        </div>
        <div v-if="section.groups" class="grid gap-10">
          <div v-for="group in section.groups" :key="group.key">
            <PromotionHeading :discount="group.discount" level="h3" />
            <ProductList :products="group.products" />
          </div>
        </div>
        <ProductList v-else :products="section.products" />
      </section>
    </template>
  </main>
</template>
