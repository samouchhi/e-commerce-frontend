<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import ProductCatalogue from '../components/product/ProductCatalogue.vue'
import ProductGridSkeleton from '../components/product/ProductGridSkeleton.vue'
import { Button } from '../components/ui/button'
import { Alert, AlertTitle, Empty, EmptyTitle } from '../components/ui/feedback'
import { formatExpiry, formatPrice, groupPromotions, isOnPromotion } from '../utils/pricing'
import { getProducts } from '../services/productService'
import { t } from '../services/i18n'
import StoreIcon from '../components/icons/StoreIcon.vue'

const products = ref([])
const loading = ref(true)
const error = ref('')
const route = useRoute()
const router = useRouter()
const promotions = computed(() => products.value.filter(isOnPromotion))
const offers = computed(() => groupPromotions(promotions.value).filter((group) => group.discount))
const categories = computed(() => [
  ...new Map(
    promotions.value
      .filter((product) => product.category)
      .map((product) => [product.category.id, product.category]),
  ).values(),
])
const offerAmount = (discount) =>
  discount.type === 'percentage' ? `${Number(discount.value)}%` : formatPrice(discount.value)
const loadPromotions = async () => {
  loading.value = true
  error.value = ''
  try {
    products.value = await getProducts()
  } catch {
    error.value = t('promotions.loadError')
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  window.scrollTo(0, 0)
  // Previously shared offer links now open the complete promotion collection.
  if (route.query.offer != null) {
    const query = { ...route.query }
    delete query.offer
    router.replace({ path: route.path, query })
  }
  loadPromotions()
})
</script>

<template>
  <main id="main-content" tabindex="-1" class="store-container pb-16">
    <nav
      class="flex items-center gap-3 py-3 text-xs text-muted"
      :aria-label="t('productDetail.breadcrumbs')"
    >
      <RouterLink
        to="/"
        class="inline-flex min-h-11 items-center text-accent focus-visible:outline-2 focus-visible:outline-accent"
        >{{ t('nav.home') }}</RouterLink
      ><span aria-hidden="true">›</span><span aria-current="page">{{ t('nav.promotions') }}</span>
    </nav>
    <header class="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 pb-5 pt-2">
      <div class="store-page-heading">
        <h1 class="!m-0">{{ t('promotions.title') }}</h1>
      </div>
      <RouterLink
        to="/products"
        class="inline-flex min-h-11 items-center gap-3 text-sm hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
      >
        <StoreIcon name="grid" class="size-4" />{{ t('products.title') }}
        <StoreIcon name="arrow" class="size-4" />
      </RouterLink>
    </header>
    <ProductGridSkeleton v-if="loading" class="mt-6" />
    <Alert v-else-if="error" class="mt-6 border-danger-line bg-danger-soft"
      ><AlertTitle>{{ error }}</AlertTitle
      ><Button variant="outline" class="mt-4" @click="loadPromotions">{{
        t('productDetail.retry')
      }}</Button></Alert
    >
    <Empty v-else-if="!promotions.length" class="mt-6 min-h-64 rounded-xl">
      <span class="store-icon-tile"><StoreIcon name="tag" class="size-5" /></span>
      <EmptyTitle>{{ t('promotions.empty') }}</EmptyTitle>
      <Button as-child class="mt-3">
        <RouterLink to="/products"
          ><StoreIcon name="grid" />{{ t('orders.shopProducts') }}</RouterLink
        >
      </Button>
    </Empty>
    <template v-else>
      <section v-if="offers.length" :aria-label="t('promotions.currentOffers')">
        <ul class="flex gap-3 overflow-x-auto pb-3">
          <li
            v-for="group in offers"
            :key="group.key"
            class="relative flex w-64 shrink-0 items-center gap-4 rounded-2xl bg-paper px-5 py-4 sm:w-80"
          >
            <div class="shrink-0 border-r border-line pr-4 text-center text-accent">
              <p class="text-2xl font-semibold tracking-tight tabular-nums">
                {{ offerAmount(group.discount) }}
              </p>
              <p class="text-xs">{{ t('promotions.off') }}</p>
            </div>
            <div class="min-w-0">
              <h2 class="text-sm font-semibold break-words">{{ group.discount.name }}</h2>
              <p
                v-if="group.discount.end_date"
                class="mt-2 flex items-center gap-1.5 text-xs text-muted"
              >
                <StoreIcon name="clock" class="size-3.5 shrink-0" /><span class="sr-only">{{
                  t('promotions.endsOn')
                }}</span>
                <time :datetime="group.discount.end_date">{{
                  formatExpiry(group.discount.end_date)
                }}</time>
              </p>
            </div>
          </li>
        </ul>
      </section>
      <ProductCatalogue :products="promotions" :categories="categories" promotions />
    </template>
  </main>
</template>
