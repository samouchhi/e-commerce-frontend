<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '../ui/card.js'
import { Badge } from '../ui/badge.js'
import { assetUrl } from '../../services/api'
import { formatPrice, pricingFor } from '../../utils/pricing'
import { productSlug } from '../../utils/slug'
import { t } from '../../services/i18n'

const props = defineProps({ product: { type: Object, required: true } })
const imageUrl = computed(() => {
  const image = props.product.images?.slice().sort((a, b) => a.sort_order - b.sort_order)[0]
  return image?.image_path ? assetUrl(`/storage/${image.image_path}`) : ''
})
const imageFailed = ref(false)
watch(imageUrl, () => {
  imageFailed.value = false
})
const pricing = computed(() => pricingFor(props.product))
</script>

<template>
  <RouterLink
    :to="`/products/${productSlug(product)}`"
    class="group block min-w-0 rounded-2xl text-inherit no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4"
  >
    <Card class="border-0 bg-transparent">
      <CardContent
        class="relative aspect-square overflow-hidden rounded-2xl border border-line/60 bg-accent-soft/40 p-0 sm:p-0"
      >
        <Badge v-if="pricing.hasDiscount" variant="sale" class="absolute top-3 left-3 z-10 px-2.5"
          >−{{ pricing.percentOff }}%</Badge
        >
        <img
          v-if="imageUrl && !imageFailed"
          :src="imageUrl"
          :alt="product.name"
          class="block size-full object-contain transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
          loading="lazy"
          @error="imageFailed = true"
        />
        <div v-else class="flex size-full flex-col items-center justify-center gap-2 text-muted">
          <svg
            class="size-8 fill-none stroke-current stroke-[1]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8" cy="8" r="1.5" />
            <path d="m3 17 6-6 4 4 3-3 5 5" />
          </svg>
          <span class="text-xs">{{ t('productDetail.noImage') }}</span>
        </div>
      </CardContent>
      <CardHeader class="gap-1.5 px-0 pt-4 pb-2 sm:px-0 sm:pt-4 sm:pb-2">
        <CardDescription v-if="product.category?.name" class="truncate text-xs">{{
          product.category.name
        }}</CardDescription>
        <CardTitle as="h3" class="line-clamp-2 text-sm leading-relaxed sm:text-base">{{
          product.name
        }}</CardTitle>
      </CardHeader>
      <CardFooter class="flex-wrap gap-x-2 gap-y-1 px-0 pb-0 sm:px-0 sm:pb-0">
        <span class="text-base font-semibold text-sale tabular-nums">{{
          formatPrice(pricing.currentPrice)
        }}</span>
        <s v-if="pricing.hasDiscount" class="text-sm text-muted">{{
          formatPrice(pricing.originalPrice)
        }}</s>
      </CardFooter>
    </Card>
  </RouterLink>
</template>
