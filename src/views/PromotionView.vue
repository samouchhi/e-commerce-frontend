<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ProductList from '../components/product/ProductList.vue'
import ProductGridSkeleton from '../components/product/ProductGridSkeleton.vue'
import PromotionHeading from '../components/product/PromotionHeading.vue'
import { Button } from '../components/ui/button.js'
import { Badge } from '../components/ui/badge.js'
import { Alert, AlertTitle, Empty, EmptyTitle } from '../components/ui/feedback.js'
import { getProducts } from '../services/productService'
import { groupPromotions, isOnPromotion } from '../utils/pricing'
import { t } from '../services/i18n'

const products = ref([])
const loading = ref(true)
const error = ref('')
const promotions = computed(() => products.value.filter(isOnPromotion))
const promoGroups = computed(() => groupPromotions(promotions.value))
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
onMounted(loadPromotions)
</script>

<template>
  <main class="mx-auto max-w-[1200px] px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
    <header class="mb-8 flex flex-wrap items-center justify-between gap-4 sm:mb-10">
      <div class="flex items-center gap-3">
        <h1 class="m-0">{{ t('promotions.title') }}</h1>
        <Badge
          v-if="!loading && !error && promotions.length"
          variant="secondary"
          :aria-label="t('products.resultCount').replace('{count}', promotions.length)"
          >{{ promotions.length }}</Badge
        >
      </div>
      <Button as-child variant="outline" class="min-h-11 rounded-full"
        ><RouterLink to="/products"
          >{{ t('products.title')
          }}<svg
            data-icon="inline-end"
            class="fill-none stroke-current stroke-[1.5]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M5 12h14m-6-6 6 6-6 6" /></svg></RouterLink
      ></Button>
    </header>
    <section aria-live="polite">
      <ProductGridSkeleton v-if="loading" />
      <Alert v-else-if="error" class="border-danger-line bg-danger-soft"
        ><AlertTitle>{{ error }}</AlertTitle
        ><Button variant="outline" type="button" class="mt-4" @click="loadPromotions">{{
          t('productDetail.retry')
        }}</Button></Alert
      >
      <Empty v-else-if="!promotions.length" class="min-h-72 rounded-2xl">
        <svg
          class="size-10 fill-none stroke-muted stroke-[1.3]"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M3 3h8l10 10-8 8L3 11Z" />
          <circle cx="7.5" cy="7.5" r="1" />
        </svg>
        <EmptyTitle>{{ t('promotions.empty') }}</EmptyTitle>
        <Button as-child class="mt-2 rounded-full"
          ><RouterLink to="/products">{{ t('orders.shopProducts') }}</RouterLink></Button
        >
      </Empty>
      <div v-else class="grid gap-10 sm:gap-14">
        <section v-for="group in promoGroups" :key="group.key">
          <PromotionHeading :discount="group.discount" />
          <ProductList :products="group.products" />
        </section>
      </div>
    </section>
  </main>
</template>
