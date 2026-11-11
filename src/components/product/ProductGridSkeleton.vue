<script setup>
import { Skeleton } from '../ui/feedback.js'
import { t } from '../../services/i18n'
defineProps({ count: { type: Number, default: 8 } })
</script>

<template>
  <div
    class="store-product-grid"
    aria-busy="true"
    role="status"
    :aria-label="t('productDetail.loading')"
  >
    <div v-for="placeholder in count" :key="placeholder" class="store-product-placeholder">
      <Skeleton class="store-product-image" />
      <div class="store-product-body">
        <Skeleton class="h-4 w-3/4" />
        <Skeleton class="h-4 w-1/2" />
        <div class="store-product-purchase">
          <Skeleton class="h-6 w-20" /><Skeleton class="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  </div>
</template>
