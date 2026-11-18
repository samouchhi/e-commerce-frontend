<script setup>
import { Badge } from '../ui/badge.js'
import { formatExpiry, formatPrice } from '../../utils/pricing'
import { t } from '../../services/i18n'
defineProps({ discount: Object, level: { type: String, default: 'h2' } })
</script>

<template>
  <div
    v-if="discount"
    class="grid min-w-0 content-center gap-4 py-3"
  >
    <div class="grid min-w-0 gap-2">
      <component
        :is="level"
        class="m-0 text-2xl font-semibold leading-snug tracking-tight wrap-anywhere sm:text-3xl"
        >{{ discount.name }}</component
      >
      <p v-if="discount.description" class="m-0 max-w-2xl text-sm leading-relaxed text-muted">
        {{ discount.description }}
      </p>
      <p
        v-if="discount.type === 'fixed' && Number(discount.value) > 0"
        class="text-lg font-semibold text-accent"
      >
        {{ t('promotions.amountOff').replace('{value}', formatPrice(discount.value)) }}
      </p>
      <p
        v-if="discount.type === 'percentage' && Number(discount.value) > 0"
        class="text-lg font-semibold text-accent"
      >
        {{ t('store.discountOffer').replace('{value}', Number(discount.value)) }}
      </p>
    </div>
    <Badge v-if="discount.end_date" variant="outline" class="w-fit shrink-0 gap-2">
      <svg
        class="size-4 fill-none stroke-current stroke-[1.5]"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4m8-4v4M3 10h18" />
      </svg>
      {{ t('promotions.endsOn') }} {{ formatExpiry(discount.end_date) }}
    </Badge>
  </div>
</template>
