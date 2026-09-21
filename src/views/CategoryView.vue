<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getCategories } from '../services/categoryService'

const catalogClass =
  'mx-auto max-w-[1200px] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(1.25rem,2.5vw,2rem)]'
const introClass = 'max-w-[680px] pb-[clamp(1.25rem,2.5vw,2rem)]'
const leadClass = 'mb-[0.35rem] max-w-[370px] text-[1.05rem] text-muted'
const gridClass = 'grid grid-cols-2 gap-[0.85rem] md:grid-cols-4 md:gap-5'
const statusClass = 'col-span-full py-8 text-[0.9rem] text-muted'
const tileBase =
  'group relative flex min-h-[8.5rem] flex-col justify-end gap-[0.35rem] border p-4 no-underline transition-[background-color,border-color,color] duration-200 focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[2px] focus-visible:outline-accent motion-reduce:transition-none'
const tileClass = `${tileBase} border-line bg-accent-soft text-ink hover:border-accent hover:bg-accent hover:text-white`
const tileLoadingClass = `${tileBase} skeleton animate-shimmer border-transparent text-transparent motion-reduce:animate-none`

const categories = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    categories.value = await getCategories()
  } catch (requestError) {
    error.value = requestError.message || 'Unable to load the categories.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main :class="catalogClass">
    <section aria-live="polite">
      <div v-if="loading" :class="gridClass" aria-busy="true" aria-label="Loading categories">
        <div v-for="placeholder in 4" :key="placeholder" :class="tileLoadingClass">
          <span class="text-[1.25rem] leading-[1.1] font-semibold [overflow-wrap:anywhere]"
            >&nbsp;</span
          >
          <span
            class="text-[0.6rem] font-bold tracking-[0.08em] uppercase opacity-[0.72] group-hover:opacity-[0.86]"
            >&nbsp;</span
          >
        </div>
      </div>
      <p v-else-if="error" :class="[statusClass, 'text-danger']">{{ error }}</p>
      <p v-else-if="!categories.length" :class="statusClass">No categories yet.</p>
      <div v-else :class="gridClass">
        <RouterLink
          v-for="category in categories"
          :key="category.id"
          :class="tileClass"
          :to="{ path: '/products', query: { category: category.id } }"
        >
          <span class="text-[1.25rem] leading-[1.1] font-semibold [overflow-wrap:anywhere]">{{
            category.name
          }}</span>
          <span
            class="text-[0.6rem] font-bold tracking-[0.08em] uppercase opacity-[0.72] group-hover:opacity-[0.86]"
          >
            {{ category.products?.length || 0 }} items
          </span>
        </RouterLink>
      </div>
    </section>
  </main>
</template>
