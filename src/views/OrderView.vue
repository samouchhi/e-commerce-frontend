<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { getOrders } from '../services/orderService'
import { locale, t } from '../services/i18n'

const orders = ref([])
const isLoading = ref(true)
const errorMessage = ref('')
const requestInFlight = ref(false)
const router = useRouter()
const orderCountLabel = computed(() => String(orders.value.length))
const deliveryFilter = ref('all')
const filterOptions = computed(() => [
  { value: 'all', label: t('orders.all') },
  { value: 'progress', label: t('orders.inProgress') },
  { value: 'shipped', label: t('orders.shipped') },
])
const withValues = (key, values) =>
  Object.entries(values).reduce(
    (message, [name, value]) => message.replace(`{${name}}`, value),
    t(key),
  )
const orderCount = (count) => withValues('orders.orderCount', { count })
const itemCount = (count) => withValues('orders.itemCount', { count })

const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(price) || 0)

const formatDate = (date) => {
  if (!date) return '—'
  const timestamp = Date.parse(date)
  return Number.isNaN(timestamp)
    ? '—'
    : new Intl.DateTimeFormat(locale.value === 'km' ? 'km-KH' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(timestamp))
}

const statusValue = (status) => {
  const rawValue = typeof status === 'object' ? status?.value || status?.name || '' : status
  return String(rawValue || '')
    .trim()
    .toLowerCase()
}

const statusLabel = (status) => {
  const value = statusValue(status)
  return value && t(`orders.status.${value}`) !== `orders.status.${value}`
    ? t(`orders.status.${value}`)
    : t('orders.unknown')
}

const statusClass = (status) => {
  const value = statusValue(status)
  if (value === 'paid' || value === 'shipped') {
    return 'border-success-line bg-success-soft text-success'
  }
  if (value === 'expired' || value === 'partial') {
    return 'border-danger-line bg-danger-soft text-danger-strong'
  }
  return 'border-warning-line bg-warning-soft text-warning'
}

const lineTotal = (item) => Number(item.price || 0) * Number(item.quantity || 0)
const shippingCostLabel = (cost) => {
  if (cost === null || cost === undefined || cost === '') return '—'
  return Number(cost) === 0 ? t('orders.free') : formatPrice(cost)
}
const apiError = (error) => error.details?.message || error.message || t('orders.loadError')
const variantLabel = (item) =>
  item.variant_name || item.variant?.name || item.variant || t('orders.noVariant')
const filterCounts = computed(() => ({
  all: orders.value.length,
  progress: orders.value.filter((order) => statusValue(order.shipping_status) !== 'shipped').length,
  shipped: orders.value.filter((order) => statusValue(order.shipping_status) === 'shipped').length,
}))
const filteredOrders = computed(() => {
  if (deliveryFilter.value === 'all') return orders.value
  return orders.value.filter((order) =>
    deliveryFilter.value === 'shipped'
      ? statusValue(order.shipping_status) === 'shipped'
      : statusValue(order.shipping_status) !== 'shipped',
  )
})
const selectedFilterLabel = computed(
  () =>
    filterOptions.value.find((option) => option.value === deliveryFilter.value)?.label ||
    t('orders.all'),
)
const filterButtonClass = (value) =>
  value === deliveryFilter.value
    ? 'border-ink bg-accent text-white'
    : 'border-line bg-transparent text-ink hover:border-ink'

const loadOrders = async () => {
  if (requestInFlight.value) return
  requestInFlight.value = true
  isLoading.value = true
  errorMessage.value = ''
  try {
    orders.value = await getOrders()
  } catch (error) {
    if (error.status === 401) {
      router.push({ name: 'login', query: { redirect: '/orders' } })
      return
    }
    errorMessage.value = apiError(error)
  } finally {
    requestInFlight.value = false
    isLoading.value = false
  }
}

onMounted(loadOrders)
</script>

<template>
  <main class="mx-auto max-w-[1100px] px-[clamp(1.25rem,4vw,4.5rem)] pt-4 pb-16">
    <RouterLink
      to="/"
      class="inline-flex size-10 items-center justify-center rounded-full text-ink border-1"
      aria-label="Go back"
    >
      <svg class="size-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 12H5m6 6-6-6 6-6" />
      </svg>
    </RouterLink>

    <section class="mb-10 border-b border-ink pb-8" aria-labelledby="orders-title">
      <div class="flex items-end justify-between gap-6 max-sm:block">
        <div>
          <h1 id="orders-title" class="mb-3 text-[2.75rem] max-md:text-[2.15rem]">
            {{ t('orders.title') }}
          </h1>
        </div>
        <div
          v-if="!isLoading && !errorMessage"
          class="border-l border-line pl-6 text-right max-sm:mt-5 max-sm:border-l-0 max-sm:pl-0 max-sm:text-left"
        ></div>
      </div>
    </section>

    <div
      v-if="!isLoading && !errorMessage && orders.length"
      class="mb-8 flex flex-wrap items-center justify-between gap-4 border border-line bg-accent-soft/35 px-4 py-3"
      role="group"
      :aria-label="t('orders.filterByDelivery')"
    >
      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in filterOptions"
          :key="option.value"
          type="button"
          class="rounded inline-flex min-h-11 cursor-pointer items-center gap-2 border px-3 text-[0.88rem] font-bold uppercase transition-[border-color,background-color,color] duration-150 focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
          :class="filterButtonClass(option.value)"
          :aria-pressed="deliveryFilter === option.value"
          :aria-label="`${option.label}: ${orderCount(filterCounts[option.value])}`"
          @click="deliveryFilter = option.value"
        >
          {{ option.label }}
          <span
            class="min-w-5 border border-current px-1 text-center text-[0.62rem] leading-5"
            aria-hidden="true"
          >
            {{ filterCounts[option.value] }}
          </span>
        </button>
      </div>
    </div>

    <div
      v-if="!isLoading && !errorMessage && orders.length"
      class="sr-only"
      role="status"
      aria-live="polite"
    >
      {{
        withValues('orders.showing', {
          count: orderCount(filteredOrders.length),
          filter: selectedFilterLabel,
        })
      }}
    </div>

    <section>
      <div v-if="isLoading" class="grid gap-6" aria-busy="true" :aria-label="t('orders.loading')">
        <div
          v-for="placeholder in 2"
          :key="placeholder"
          class="grid gap-5 border-t-2 border-ink pt-5"
        >
          <div class="h-5 w-40 bg-accent-soft"></div>
          <div class="h-4 w-56 bg-accent-soft"></div>
          <div class="grid gap-3 border-t border-line pt-4">
            <div v-for="line in 2" :key="line" class="h-4 bg-accent-soft"></div>
          </div>
        </div>
      </div>

      <div
        v-else-if="errorMessage"
        class="border border-danger-line bg-danger-soft px-4 py-4 text-danger-strong"
        role="alert"
      >
        <p class="m-0 leading-[1.5]">{{ errorMessage }}</p>
        <button
          class="mt-3 min-h-11 cursor-pointer border-0 bg-transparent p-0 text-[0.68rem] font-bold text-danger-strong uppercase underline underline-offset-4 hover:text-accent focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
          :disabled="requestInFlight"
          type="button"
          @click="loadOrders"
        >
          {{ requestInFlight ? t('orders.loading') : t('orders.tryAgain') }}
        </button>
      </div>

      <div
        v-else-if="!orders.length"
        class="grid items-start gap-4 border border-line bg-accent-soft/45 p-8 max-sm:p-6"
      >
        <div class="grid justify-items-start gap-4">
          <div>
            <h2 class="m-0 text-[1.5rem] font-semibold tracking-[-0.02em] text-ink">
              {{ t('orders.noOrdersTitle') }}
            </h2>
            <p class="mt-2 mb-0 max-w-[34rem] leading-[1.5] text-muted">
              {{ t('orders.noOrdersDescription') }}
            </p>
          </div>
          <RouterLink
            to="/products"
            class="inline-flex min-h-11 items-center bg-accent px-5 text-[0.7rem] font-bold text-white uppercase transition-colors duration-200 hover:bg-accent-hover focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-accent motion-reduce:transition-none"
          >
            {{ t('orders.shopProducts') }}
          </RouterLink>
        </div>
      </div>

      <div
        v-else-if="!filteredOrders.length"
        class="grid items-start gap-4 border border-line bg-accent-soft/45 p-8 max-sm:p-6"
      >
        <div>
          <h2 class="m-0 text-[1.5rem] font-semibold tracking-[-0.02em] text-ink">
            {{ withValues('orders.noFilteredOrders', { filter: selectedFilterLabel }) }}
          </h2>
          <p class="mt-2 mb-0 max-w-[34rem] leading-[1.5] text-muted">
            {{ t('orders.noFilteredDescription') }}
          </p>
        </div>
        <button
          type="button"
          class="inline-flex min-h-11 w-fit cursor-pointer items-center border border-ink bg-transparent px-5 text-[0.7rem] font-bold text-ink uppercase transition-colors duration-200 hover:bg-accent hover:text-white focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-accent motion-reduce:transition-none"
          @click="deliveryFilter = 'all'"
        >
          {{ t('orders.showAll') }}
        </button>
      </div>

      <div v-else class="grid gap-4">
        <article
          v-for="(order, index) in filteredOrders"
          :key="order.id || order.order_number"
          class="overflow-hidden border border-line bg-paper transition-[border-color,background-color] duration-200 motion-reduce:transition-none"
          :aria-labelledby="`order-${order.id || index}`"
        >
          <details class="group" :open="index === 0">
            <summary
              class="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-6 bg-accent-soft/25 p-5 focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-accent max-lg:grid-cols-[minmax(0,1fr)_auto] max-md:grid-cols-1 max-md:gap-4 max-md:p-4 [&::-webkit-details-marker]:hidden"
            >
              <div>
                <h2
                  :id="`order-${order.id || index}`"
                  class="m-0 text-[1.35rem] leading-[1.1] font-semibold tracking-[-0.02em] text-ink [overflow-wrap:anywhere]"
                >
                  {{ order.order_number || `#${order.id}` }}
                </h2>
                <div
                  class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.82rem] text-muted"
                >
                  <span class="inline-flex items-center gap-1.5">
                    <svg
                      class="h-3.5 w-3.5 shrink-0 text-ink"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M8 3v4M16 3v4M3 10h18" />
                    </svg>
                    <span class="text-[0.95rem]">{{ formatDate(order.created_at) }}</span>
                  </span>
                  <span class="text-line" aria-hidden="true">·</span>
                  <span class="inline-flex items-center gap-1.5">
                    <svg
                      class="h-3.5 w-3.5 shrink-0 text-ink"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" />
                      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
                    </svg>
                    <span class="text-[0.95rem]">
                      {{ itemCount((order.items || []).length) }}
                    </span>
                  </span>
                </div>
              </div>
              <div class="flex flex-wrap justify-end gap-2 max-md:justify-start">
                <!-- <span
                  class="inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1 text-[0.62rem] font-bold uppercase"
                  :class="statusClass(order.payment_status)"
                >
                  <svg
                    class="h-3.5 w-3.5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 10h18M7 15h3" />
                  </svg>
                  Payment: {{ statusLabel(order.payment_status) }}
                </span> -->
                <span
                  class="inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1 text-[0.82rem] font-bold uppercase"
                  :class="statusClass(order.shipping_status)"
                >
                  <svg
                    class="h-3.5 w-3.5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 6h11v11H3zM14 10h3.5L21 13.5V17h-7z" />
                    <circle cx="7" cy="18" r="2" />
                    <circle cx="17" cy="18" r="2" />
                  </svg>
                  {{ statusLabel(order.shipping_status) }}
                </span>
              </div>
              <div
                class="flex items-center justify-end gap-4 max-lg:col-start-2 max-lg:row-start-1 max-md:col-start-1 max-md:row-start-3 max-md:justify-between"
              >
                <svg
                  class="h-5 w-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </summary>

            <div
              class="grid grid-cols-[minmax(0,1fr)_minmax(15rem,20rem)] divide-x divide-line border-t border-line max-md:grid-cols-1 max-md:divide-x-0"
            >
              <div class="p-6 max-md:p-5">
                <div class="mb-2 flex items-baseline justify-between gap-4">
                  <p class="m-0 text-[0.88rem] font-bold tracking-[0.12em] text-muted uppercase">
                    {{ t('orders.items') }}
                  </p>
                </div>
                <ul class="m-0 list-none border-t border-line p-0">
                  <li
                    v-for="(item, itemIndex) in order.items || []"
                    :key="`${order.id || 'order'}-${itemIndex}-${item.name}`"
                    class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-line py-4 text-[0.95rem]"
                  >
                    <span class="min-w-0 [overflow-wrap:anywhere]">
                      <strong class="block font-semibold text-ink">{{ item.name }}</strong>
                      <span
                        class="mt-1 block text-[0.85rem] tracking-[0.06em] text-muted uppercase"
                      >
                        {{ t('orders.size') }}: {{ variantLabel(item) }}
                      </span>
                    </span>
                    <strong class="shrink-0 text-red-500">
                      <span class="text-ink">{{ item.quantity }} × </span>
                      {{ formatPrice(lineTotal(item)) }}</strong
                    >
                  </li>
                </ul>
              </div>

              <aside
                class="bg-accent-soft/45 p-6 max-md:border-t max-md:border-line max-md:p-5"
                :aria-label="t('orders.orderTotal')"
              >
                <div class="flex items-start gap-3">
                  <span
                    class="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-line bg-paper text-ink"
                    aria-hidden="true"
                  >
                    <svg
                      class="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M3 6h11v11H3zM14 10h3.5L21 13.5V17h-7z" />
                      <circle cx="7" cy="18" r="2" />
                      <circle cx="17" cy="18" r="2" />
                    </svg>
                  </span>
                  <div>
                    <p class="m-0 text-[1rem] font-bold text-muted uppercase">
                      {{ t('orders.orderTotal') }}
                    </p>
                  </div>
                </div>
                <dl class="mt-5 grid gap-3 text-[0.82rem]">
                  <div class="flex justify-between gap-4 text-muted">
                    <dt class="text-[1rem]">{{ t('orders.subtotal') }}</dt>
                    <dd class="text-red-500 m-0">{{ formatPrice(order.subtotal_amount) }}</dd>
                  </div>
                  <div class="flex items-start justify-between gap-4 text-muted">
                    <dt class="flex items-start gap-2">
                      <svg
                        class="mt-0.5 h-4 w-4 shrink-0 text-ink"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.7"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 6h11v11H3zM14 10h3.5L21 13.5V17h-7z" />
                        <circle cx="7" cy="18" r="2" />
                        <circle cx="17" cy="18" r="2" />
                      </svg>
                      <span>
                        <span class="text-[1rem] block text-ink">{{ t('orders.delivery') }}</span>
                        <span v-if="order.logistic" class="mt-0.5 block text-[0.9rem]">
                          {{ order.logistic }}
                        </span>
                      </span>
                    </dt>
                    <dd class="m-0 shrink-0 font-semibold text-red-500">
                      {{ shippingCostLabel(order.shipping_cost) }}
                    </dd>
                  </div>
                  <div
                    class="mt-2 flex items-end justify-between gap-4 border-t border-ink pt-4 text-ink"
                  >
                    <dt class="text-[1.25rem] font-bold tracking-[0.12em] uppercase">
                      {{ t('orders.total') }}
                    </dt>
                    <dd
                      class="m-0 text-[1.55rem] text-red-500 leading-none font-semibold tracking-[-0.03em]"
                    >
                      {{ formatPrice(order.total_amount) }}
                    </dd>
                  </div>
                </dl>
              </aside>
            </div>
          </details>
        </article>
      </div>
    </section>
  </main>
</template>
