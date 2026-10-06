<script setup>
import { Skeleton } from '../ui/feedback.js'
import { t } from '../../services/i18n'
defineProps({ count: { type: Number, default: 8 } })
</script>

<template>
  <div
    class="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 sm:gap-x-6"
    aria-busy="true"
    role="status"
    :aria-label="t('productDetail.loading')"
  >
    <div v-for="placeholder in count" :key="placeholder" class="grid min-w-0 gap-4">
      <Skeleton class="aspect-square rounded-2xl" />
      <div class="grid gap-2">
        <Skeleton class="h-4 w-3/4" />
        <Skeleton class="h-4 w-1/3" />
      </div>
    </div>
  </div>
</template>
