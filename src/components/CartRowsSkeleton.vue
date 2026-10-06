<script setup>
import { Skeleton } from './ui/feedback.js'
import { t } from '../services/i18n'

defineProps({
  count: { type: Number, default: 2 },
  compact: Boolean,
})
</script>

<template>
  <div class="grid gap-3" role="status" aria-busy="true">
    <span class="sr-only">{{ t('cart.checkingBag') }}</span>
    <div
      v-for="row in count"
      :key="row"
      :class="[
        'grid min-w-0 gap-3',
        compact
          ? 'grid-cols-[3.5rem_minmax(0,1fr)] sm:grid-cols-[4rem_minmax(0,1fr)]'
          : 'grid-cols-[5rem_minmax(0,1fr)]',
      ]"
    >
      <Skeleton class="aspect-square rounded-lg" />
      <div class="grid min-w-0 gap-1.5">
        <Skeleton class="h-8 w-3/4" />
        <Skeleton class="h-11 w-full" />
        <div class="flex items-center justify-between gap-3">
          <Skeleton class="h-11 w-28" /><Skeleton class="h-6 w-16" />
        </div>
      </div>
    </div>
  </div>
</template>
