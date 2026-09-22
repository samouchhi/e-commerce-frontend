<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { assetUrl } from '../../services/api'
import { formatPrice, pricingFor } from '../../utils/pricing'
import { productSlug } from '../../utils/slug'

const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
})

const imageUrl = (product) => {
  const image = product.images?.slice().sort((a, b) => a.sort_order - b.sort_order)[0]
  return image?.image_path ? assetUrl(`/storage/${image.image_path}`) : ''
}

const pricing = computed(() => pricingFor(props.product))
</script>

<template>
  <RouterLink
    :to="`/products/${productSlug(product)}`"
    class="group block min-w-0 text-inherit no-underline focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent"
  >
    <div
      class="relative aspect-square overflow-hidden rounded-[0.2rem] bg-white shadow-[0_2px_8px_rgba(32,35,33,0.1)]"
    >
      <span
        v-if="pricing.hasDiscount"
        class="absolute top-[0.35rem] left-[0.35rem] z-[2] bg-sale px-[0.32rem] py-[0.2rem] text-[clamp(0.44rem,1.5vw,0.6rem)] font-bold tracking-[0.06em] text-white uppercase"
      >
        -{{ pricing.percentOff }}%
      </span>
      <img
        v-if="imageUrl(product)"
        :src="imageUrl(product)"
        :alt="product.name"
        class="rounded m-0 block h-full w-full object-cover"
        loading="lazy"
      />
      <div
        v-else
        class="flex h-full items-center justify-center text-[0.7rem] text-muted uppercase"
        aria-hidden="true"
      >
        No image
      </div>
    </div>
    <div class="flex flex-col gap-[0.28rem] px-[0.45rem] pt-[0.55rem]">
      <h3
        class="line-clamp-2 text-[clamp(0.72rem,1.25vw,0.9rem)] leading-[1.2] font-semibold text-ink"
      >
        {{ product.name }}
      </h3>
      <div class="order-1 flex flex-wrap items-baseline gap-[0.3rem]">
        <span class="text-[clamp(0.75rem,1.35vw,1rem)] font-bold text-sale">{{
          formatPrice(pricing.currentPrice)
        }}</span>
        <s
          v-if="pricing.hasDiscount"
          class="text-[clamp(0.65rem,1.1vw,0.9rem)] font-normal text-muted line-through"
        >
          {{ formatPrice(pricing.originalPrice) }}
        </s>
      </div>
    </div>
  </RouterLink>
</template>
