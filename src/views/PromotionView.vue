<script setup>
import { computed, onMounted, ref } from 'vue'
import ProductList from '../components/product/ProductList.vue'
import { getProducts } from '../services/productService'
import { formatExpiry, groupPromotions, isOnPromotion } from '../utils/pricing'
import { t } from '../services/i18n'

const catalogClass =
  'mx-auto max-w-[1200px] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(2rem,4vw,3.5rem)]'
const skeletonGridClass =
  'grid grid-cols-2 items-start gap-x-[0.7rem] gap-y-[clamp(1rem,2vw,1.5rem)] md:grid-cols-3 lg:grid-cols-4'
const statusClass = 'col-span-full py-8 text-[0.9rem] text-muted'
const promoNameClass =
  "m-0 flex w-full items-center gap-[0.9rem] text-[clamp(1.1rem,4vw,1.5rem)] leading-[1.25] font-semibold text-ink before:min-w-4 before:flex-1 before:border-t before:border-ink before:content-[''] after:min-w-4 after:flex-1 after:border-t after:border-ink after:content-['']"

const products = ref([])
const loading = ref(true)
const error = ref('')

const promotions = computed(() => products.value.filter(isOnPromotion))
const promoGroups = computed(() => groupPromotions(promotions.value))

onMounted(async () => {
  try {
    products.value = await getProducts()
  } catch (requestError) {
    error.value = requestError.message || 'Unable to load the promotions.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main :class="catalogClass">
    <div class="mb-[clamp(1.5rem,3vw,2.5rem)] justify-items-center">
      <h1 class="mt-6 text-[clamp(1.8rem,4vw,2.7rem)] font-medium tracking-[-0.04em] uppercase">
        {{ t('promotions.title') }}
      </h1>
    </div>

    <section aria-live="polite">
      <div
        v-if="loading"
        :class="skeletonGridClass"
        aria-busy="true"
        aria-label="Loading promotions"
      >
        <div v-for="placeholder in 8" :key="placeholder" class="min-w-0">
          <div class="aspect-square bg-accent-soft"></div>
          <div class="grid gap-2 pt-4">
            <span class="block h-[0.9rem] w-[70%] bg-accent-soft"></span>
            <span class="block h-[0.7rem] w-[35%] bg-accent-soft"></span>
          </div>
        </div>
      </div>

      <p v-else-if="error" :class="[statusClass, 'text-danger']">{{ error }}</p>
      <p v-else-if="!promotions.length" :class="statusClass">{{ t('promotions.empty') }}</p>

      <div v-else>
        <div
          v-for="group in promoGroups"
          :key="group.key"
          class="mt-[clamp(1.5rem,3vw,2.5rem)] first:mt-0"
        >
          <div
            v-if="group.discount"
            class="mb-[clamp(1.75rem,4vw,2.75rem)] grid justify-items-center gap-[0.45rem] text-center"
          >
            <h2 :class="promoNameClass">{{ group.discount.name }}</h2>
            <p
              v-if="group.discount.description"
              class="m-0 max-w-[62ch] text-[0.88rem] leading-[1.6] text-muted"
            >
              {{ group.discount.description }}
            </p>
            <p v-if="group.discount.end_date" class="text-[0.88rem] font-normal text-muted">
              {{ t('promotions.expireOn') }} {{ formatExpiry(group.discount.end_date) }}
            </p>
          </div>
          <ProductList :products="group.products" />
        </div>
      </div>
    </section>
  </main>
</template>
