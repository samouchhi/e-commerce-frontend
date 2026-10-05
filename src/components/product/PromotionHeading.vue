<script setup>
import { Badge } from '../ui/badge.js'
import { formatExpiry } from '../../utils/pricing'
import { t } from '../../services/i18n'
defineProps({ discount: Object, level: { type: String, default: 'h2' } })
</script>

<template>
  <div
    v-if="discount"
    class="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-line bg-accent-soft/40 p-5 sm:flex-row sm:items-center sm:p-6"
  >
    <div class="grid min-w-0 gap-2">
      <component
        :is="level"
        class="m-0 text-xl font-semibold leading-snug tracking-tight wrap-anywhere"
        >{{ discount.name }}</component
      >
      <p v-if="discount.description" class="m-0 max-w-2xl text-sm leading-relaxed text-muted">
        {{ discount.description }}
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
      {{ t('promotions.expireOn') }} {{ formatExpiry(discount.end_date) }}
    </Badge>
  </div>
</template>
