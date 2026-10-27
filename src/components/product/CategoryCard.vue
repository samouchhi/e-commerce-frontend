<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import StoreIcon from '../icons/StoreIcon.vue'
import { assetUrl } from '../../services/api'
import { t } from '../../services/i18n'
import { categoryImages } from '../../utils/categoryImages'

const props = defineProps({
  category: { type: Object, required: true },
  products: { type: Array, default: () => [] },
})
const failed = ref(new Set())
const image = computed(() =>
  categoryImages(props.category, props.products).find((url) => !failed.value.has(url)),
)
const count = computed(() => props.category.products_count ?? props.category.products?.length)
</script>

<template>
  <RouterLink
    :to="{ path: '/products', query: { category: category.id } }"
    class="store-category-tile group"
    :class="{ 'store-category-text': !image }"
  >
    <span v-if="image" class="store-category-art">
      <img
        :src="assetUrl(image)"
        alt=""
        class="size-full object-contain"
        loading="lazy"
        @error="failed.add(image)"
      />
    </span>
    <span class="store-category-content">
      <span class="text-base font-semibold leading-relaxed break-words sm:text-lg">{{
        category.name
      }}</span>
      <span v-if="count != null" class="text-xs text-muted"
        >{{ count }} {{ t(Number(count) === 1 ? 'categories.item' : 'categories.items') }}</span
      >
      <span class="store-category-action" aria-hidden="true"
        ><StoreIcon name="arrow" class="size-5"
      /></span>
    </span>
  </RouterLink>
</template>
