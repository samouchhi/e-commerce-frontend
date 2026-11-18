<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import ProductList from './ProductList.vue'
import { Button } from '../ui/button'
import { NativeSelect } from '../ui/input'
import { Empty, EmptyTitle } from '../ui/feedback'
import { t } from '../../services/i18n'
import StoreIcon from '../icons/StoreIcon.vue'
import {
  catalogQueryFromState,
  catalogStateFromQuery,
  filterCatalog,
  productPriceRange,
} from '../../utils/catalogue'
import { formatPrice } from '../../utils/pricing'
import { SliderRoot, SliderTrack, SliderRange, SliderThumb } from 'reka-ui'

const props = defineProps({
  products: { type: Array, required: true },
  categories: { type: Array, default: () => [] },
  promotions: Boolean,
})
const route = useRoute()
const router = useRouter()
const defaultSort = computed(() => (props.promotions ? 'new-arrival' : 'best-seller'))
const priceLimit = computed(() =>
  Math.max(
    1,
    ...props.products.map((product) => {
      const price = productPriceRange(product).max
      return Number.isFinite(price) ? Math.ceil(price * 100) : 0
    }),
  ),
)
const state = computed(() =>
  catalogStateFromQuery(route.query, {
    defaultSort: defaultSort.value,
    priceLimit: priceLimit.value,
  }),
)
const updateState = (patch) =>
  router.replace({
    path: route.path,
    query: catalogQueryFromState(
      { ...state.value, ...patch },
      { base: route.query, defaultSort: defaultSort.value, priceLimit: priceLimit.value },
    ),
  })
const query = computed({
  get: () => state.value.q,
  set: (value) => updateState({ q: value, page: 1 }),
})
const selectedCategory = computed(() => state.value.category)
const sort = computed({
  get: () => state.value.sort,
  set: (value) => updateState({ sort: value, page: 1 }),
})
const priceRange = computed({
  get: () => state.value.priceRange,
  set: (value) => updateState({ priceRange: value, page: 1 }),
})
const inStock = computed({
  get: () => state.value.inStock,
  set: (value) => updateState({ inStock: value, page: 1 }),
})
const onSale = computed({
  get: () => state.value.onSale,
  set: (value) => updateState({ onSale: value, page: 1 }),
})
const filtersOpen = ref(false)
const layout = computed({
  get: () => state.value.layout,
  set: (value) => updateState({ layout: value }),
})
const page = computed({
  get: () => state.value.page,
  set: (value) => updateState({ page: value }),
})
const pageSize = 12
const sortOptions = computed(() => [
  { value: 'best-seller', label: t('products.bestSeller') },
  { value: 'new-arrival', label: t('products.newArrival') },
  { value: 'price-asc', label: t('store.priceLow') },
  { value: 'price-desc', label: t('store.priceHigh') },
  { value: 'name-asc', label: t('products.nameAsc') },
  { value: 'name-desc', label: t('products.nameDesc') },
])
const filtered = computed(() =>
  filterCatalog(props.products, {
    category: selectedCategory.value,
    query: query.value,
    min: priceRange.value[0] / 100,
    max: priceRange.value[1] === priceLimit.value ? '' : priceRange.value[1] / 100,
    inStock: inStock.value,
    onSale: onSale.value,
    sort: sort.value,
  }),
)
const pageCount = computed(() => Math.ceil(filtered.value.length / pageSize))
const currentPage = computed(() => Math.min(page.value, Math.max(1, pageCount.value)))
const visible = computed(() =>
  filtered.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize),
)
const pages = computed(() =>
  Array.from(
    { length: Math.min(pageCount.value, 5) },
    (_, index) =>
      Math.min(Math.max(1, currentPage.value - 2), Math.max(1, pageCount.value - 4)) + index,
  ),
)
const countLabel = computed(() =>
  t('store.showing')
    .replace('{from}', filtered.value.length ? (currentPage.value - 1) * pageSize + 1 : 0)
    .replace('{to}', Math.min(currentPage.value * pageSize, filtered.value.length))
    .replace('{count}', filtered.value.length),
)
const categoryTo = (id) => ({
  path: route.path,
  query: catalogQueryFromState(
    { ...state.value, category: id == null ? null : Number(id), page: 1 },
    { base: route.query, defaultSort: defaultSort.value, priceLimit: priceLimit.value },
  ),
})
const reset = () => {
  updateState({
    q: '',
    category: null,
    sort: defaultSort.value,
    priceRange: [0, priceLimit.value],
    inStock: false,
    onSale: false,
    layout: 'grid',
    page: 1,
  })
}
const goToPage = (value) => {
  page.value = value
  document.getElementById('catalogue-results')?.scrollIntoView({ block: 'start' })
  document.getElementById('catalogue-results')?.focus({ preventScroll: true })
}
</script>

<template>
  <nav
    v-if="categories.length"
    class="my-6 flex flex-wrap gap-2"
    :aria-label="t('products.shopByCategory')"
  >
    <span
      v-if="promotions"
      class="inline-flex min-h-11 items-center pr-1 text-xs font-medium text-muted"
      ><StoreIcon name="grid" class="size-4" /><span class="sr-only">{{
        t('nav.category')
      }}</span></span
    >
    <Button
      as-child
      :variant="selectedCategory === null ? 'default' : 'outline'"
      class="min-h-11 rounded-full px-5"
      ><RouterLink
        :to="categoryTo(null)"
        replace
        :aria-current="selectedCategory === null ? 'page' : undefined"
        ><StoreIcon name="grid" />{{ t('products.all') }}</RouterLink
      ></Button
    >
    <Button
      v-for="category in categories"
      :key="category.id"
      as-child
      :variant="selectedCategory === Number(category.id) ? 'default' : 'outline'"
      class="h-auto min-h-11 max-w-full rounded-full px-5 whitespace-normal"
      ><RouterLink
        :to="categoryTo(category.id)"
        replace
        :aria-current="selectedCategory === Number(category.id) ? 'page' : undefined"
        >{{ category.name }}</RouterLink
      ></Button
    >
  </nav>
  <div
    class="grid items-start gap-7"
    :class="{ 'lg:grid-cols-[220px_minmax(0,1fr)]': !promotions }"
  >
    <div v-if="!promotions">
      <Button
        variant="outline"
        class="mb-3 min-h-11 w-full lg:hidden"
        :aria-expanded="filtersOpen"
        aria-controls="catalogue-filters"
        @click="filtersOpen = !filtersOpen"
        ><StoreIcon name="filters" />{{ t('store.filters')
        }}<StoreIcon name="down" :class="{ 'rotate-180': filtersOpen }"
      /></Button>
      <aside
        id="catalogue-filters"
        class="rounded-2xl bg-paper p-5 lg:block"
        :class="filtersOpen ? 'block' : 'hidden'"
        :aria-label="t('store.filters')"
      >
        <div class="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
          <h2 class="flex items-center gap-2 text-base font-semibold">
            <StoreIcon name="filters" class="size-4" />{{ t('store.filters') }}
          </h2>
          <button
            class="flex size-11 items-center justify-center rounded-xl text-muted hover:bg-accent-soft hover:text-accent"
            :aria-label="t('products.clearFilters')"
            :title="t('products.clearFilters')"
            @click="reset"
          >
            <StoreIcon name="refresh" class="size-4" />
          </button>
        </div>
        <fieldset class="border-b border-line pb-5">
          <legend class="text-sm font-semibold">{{ t('store.priceRange') }}</legend>
          <SliderRoot
            v-model="priceRange"
            :min="0"
            :max="priceLimit"
            :step="1"
            :min-steps-between-thumbs="0"
            class="relative flex min-h-11 w-full touch-none select-none items-center"
            :aria-label="t('store.priceRange')"
          >
            <SliderTrack class="relative h-1.5 grow rounded-full bg-line"
              ><SliderRange class="absolute h-full rounded-full bg-accent"
            /></SliderTrack>
            <SliderThumb
              v-for="(value, index) in priceRange"
              :key="index"
              :aria-label="t(index === 0 ? 'store.minPrice' : 'store.maxPrice')"
              :aria-valuetext="formatPrice(value / 100)"
              class="relative block size-5 cursor-grab rounded-full border-2 border-white bg-accent shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent after:absolute after:-inset-3 after:content-['']"
            />
          </SliderRoot>
          <div class="mt-2 grid grid-cols-2 gap-3 text-sm tabular-nums">
            <output
              class="rounded-md border border-line px-2 py-2"
              :aria-label="t('store.minPrice')"
              >{{ formatPrice(priceRange[0] / 100) }}</output
            ><output
              class="rounded-md border border-line px-2 py-2 text-right"
              :aria-label="t('store.maxPrice')"
              >{{ formatPrice(priceRange[1] / 100) }}</output
            >
          </div>
        </fieldset>
        <fieldset class="border-b border-line py-4">
          <legend class="pt-4 text-sm font-semibold">{{ t('store.availability') }}</legend>
          <label class="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-muted"
            ><input v-model="inStock" type="checkbox" class="size-4 accent-accent" />{{
              t('productDetail.inStock')
            }}</label
          >
        </fieldset>
        <label class="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-muted"
          ><input v-model="onSale" type="checkbox" class="size-4 accent-accent" />{{
            t('store.onSale')
          }}</label
        >
      </aside>
    </div>
    <section
      id="catalogue-results"
      class="min-w-0 scroll-mt-44 focus-visible:outline-2 focus-visible:outline-accent"
      tabindex="-1"
    >
      <div class="mb-5 flex flex-wrap items-center gap-3">
        <p class="mr-auto text-xs text-muted sm:text-sm" role="status">{{ countLabel }}</p>
        <label class="flex min-w-0 items-center gap-2 text-xs font-medium"
          ><StoreIcon name="filters" class="size-4 text-muted" /><span class="sr-only">{{
            t('products.sort')
          }}</span
          ><NativeSelect id="product-sort" v-model="sort" class="min-h-11 max-w-48 text-xs"
            ><option v-for="option in sortOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option></NativeSelect
          ></label
        >
        <div v-if="filtered.length > 4" class="flex gap-1" :aria-label="t('store.grid')">
          <Button
            type="button"
            :variant="layout === 'grid' ? 'default' : 'outline'"
            size="icon"
            class="size-11"
            :aria-label="t('store.grid')"
            :aria-pressed="layout === 'grid'"
            @click="layout = 'grid'"
            ><svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              aria-hidden="true"
            >
              <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></svg
          ></Button>
          <Button
            type="button"
            :variant="layout === 'list' ? 'default' : 'outline'"
            size="icon"
            class="size-11"
            :aria-label="t('store.list')"
            :aria-pressed="layout === 'list'"
            @click="layout = 'list'"
            ><svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              aria-hidden="true"
            >
              <path d="M8 5h13M8 12h13M8 19h13M3 5h1M3 12h1M3 19h1" /></svg
          ></Button>
        </div>
      </div>
      <label
        class="mb-5 flex items-center gap-3 rounded-xl border border-line bg-paper pl-4 focus-within:outline-2 focus-within:outline-accent"
        ><span class="sr-only">{{ t('products.search') }}</span
        ><StoreIcon name="search" class="size-4 shrink-0 text-muted" /><input
          id="product-search"
          v-model="query"
          type="search"
          :placeholder="t('store.searchPlaceholder')"
          class="min-h-12 w-full min-w-0 rounded-xl bg-transparent pr-4 text-sm outline-none"
      /></label>
      <Empty v-if="!visible.length" class="min-h-64 rounded-xl"
        ><span class="store-icon-tile"><StoreIcon name="search" class="size-5" /></span
        ><EmptyTitle>{{
          products.length
            ? t('products.noMatch')
            : t(promotions ? 'promotions.empty' : 'products.empty')
        }}</EmptyTitle
        ><Button variant="outline" class="mt-3 min-h-11" @click="reset">{{
          t('products.clearFilters')
        }}</Button></Empty
      >
      <ProductList
        v-else
        :products="visible"
        :show-description="layout === 'list'"
        :class="{ 'store-product-list': layout === 'list' }"
      />
      <nav
        v-if="pageCount > 1"
        class="mt-8 flex flex-wrap justify-center gap-2"
        :aria-label="t('store.page').replace('{page}', currentPage)"
      >
        <Button
          variant="outline"
          size="icon"
          class="size-11"
          :disabled="currentPage === 1"
          :aria-label="t('store.previous')"
          @click="goToPage(currentPage - 1)"
          ><StoreIcon name="back"
        /></Button>
        <Button
          v-for="number in pages"
          :key="number"
          :variant="number === currentPage ? 'default' : 'outline'"
          size="icon"
          class="size-11"
          :aria-current="number === currentPage ? 'page' : undefined"
          :aria-label="t('store.page').replace('{page}', number)"
          @click="goToPage(number)"
          >{{ number }}</Button
        >
        <Button
          variant="outline"
          size="icon"
          class="size-11"
          :disabled="currentPage === pageCount"
          :aria-label="t('store.next')"
          @click="goToPage(currentPage + 1)"
          ><StoreIcon name="arrow"
        /></Button>
      </nav>
    </section>
  </div>
</template>
