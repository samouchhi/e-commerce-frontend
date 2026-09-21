<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BannerCarousel from '../components/home/BannerCarousel.vue'
import ProductList from '../components/product/ProductList.vue'
import { getBanners } from '../services/bannerService'
import { getProducts } from '../services/productService'
import { formatExpiry, groupPromotions, isOnPromotion } from '../utils/pricing'

const sectionClass =
  'mx-auto max-w-[1200px] px-[clamp(1.25rem,4vw,4.5rem)] pt-[clamp(1.25rem,2.5vw,2rem)] last:pb-[clamp(1.5rem,3vw,2.5rem)]'
const sectionHeadClass =
  'mb-[clamp(0.8rem,1.6vw,1.15rem)] flex items-baseline justify-between gap-4 border-b border-line pb-[0.55rem]'
const sectionTitleClass =
  'm-0 text-[clamp(1.05rem,2vw,1.4rem)] leading-[1.2] font-semibold tracking-[-0.01em] text-ink'
const sectionLinkClass =
  'text-[0.66rem] font-bold tracking-[0.08em] text-accent uppercase whitespace-nowrap no-underline hover:text-accent-strong focus-visible:text-accent-strong focus-visible:outline-solid focus-visible:outline-[2px] focus-visible:outline-offset-4 focus-visible:outline-accent'
const skeletonGridClass =
  'grid grid-cols-3 items-start gap-x-[0.55rem] gap-y-[clamp(0.9rem,2vw,1.5rem)] border-t border-line md:grid-cols-4'
const statusClass = 'col-span-full py-8 text-[0.9rem] text-muted'

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

onMounted(async () => {
  const [bannerResult, productResult] = await Promise.allSettled([getBanners(), getProducts()])

  if (bannerResult.status === 'fulfilled') banners.value = bannerResult.value

  if (productResult.status === 'fulfilled') {
    products.value = productResult.value
  } else {
    error.value = productResult.reason?.message || 'Unable to load the collection.'
  }

  loading.value = false
})
</script>

<template>
  <main>
    <section class="border-b border-line">
      <BannerCarousel v-if="banners.length" :banners="banners" />
    </section>

    <section v-if="loading" :class="sectionClass">
      <div :class="skeletonGridClass" aria-busy="true" aria-label="Loading products">
        <div v-for="placeholder in 8" :key="placeholder" class="min-w-0">
          <div class="aspect-square bg-accent-soft"></div>
          <div class="grid gap-2 pt-4">
            <span class="block h-[0.9rem] w-[70%] bg-accent-soft"></span>
            <span class="block h-[0.7rem] w-[35%] bg-accent-soft"></span>
          </div>
        </div>
      </div>
    </section>

    <section v-else-if="error" :class="sectionClass">
      <p :class="[statusClass, 'text-danger']">{{ error }}</p>
    </section>

    <template v-else>
      <section v-if="mostPopular.length" :class="sectionClass">
        <div :class="sectionHeadClass">
          <h2 :class="sectionTitleClass">Most Popular Products</h2>
          <RouterLink :class="sectionLinkClass" to="/products">View All</RouterLink>
        </div>
        <ProductList :products="mostPopular" />
      </section>

      <section v-if="promoGroups.length" :class="sectionClass">
        <div :class="sectionHeadClass">
          <h2 :class="sectionTitleClass">Promotions</h2>
          <RouterLink :class="sectionLinkClass" to="/promotion">View All</RouterLink>
        </div>
        <div
          v-for="group in promoGroups"
          :key="group.key"
          class="mt-[clamp(1.5rem,3vw,2.5rem)] first:mt-0"
        >
          <div
            v-if="group.discount"
            class="mb-[clamp(1.75rem,4vw,2.75rem)] grid justify-items-center gap-[0.45rem] text-center"
          >
            <h3
              class="m-0 flex w-full items-center gap-[0.9rem] text-[clamp(1.1rem,4vw,1.5rem)] leading-[1.25] font-semibold text-ink before:min-w-4 before:flex-1 before:border-t before:border-ink before:content-[''] after:min-w-4 after:flex-1 after:border-t after:border-ink after:content-['']"
            >
              {{ group.discount.name }}
            </h3>
            <p
              v-if="group.discount.description"
              class="m-0 max-w-[62ch] text-[1.2rem] leading-[1.6] text-muted"
            >
              {{ group.discount.description }}
            </p>
            <p v-if="group.discount.end_date" class="text-[1.2rem] font-normal text-muted">
              Expire on {{ formatExpiry(group.discount.end_date) }}
            </p>
          </div>
          <ProductList :products="group.products" />
        </div>
      </section>

      <section v-if="newArrivals.length" :class="sectionClass">
        <div :class="sectionHeadClass">
          <h2 :class="sectionTitleClass">New Arrivals</h2>
          <RouterLink :class="sectionLinkClass" to="/products">View All</RouterLink>
        </div>
        <ProductList :products="newArrivals" />
      </section>
    </template>
  </main>
</template>
