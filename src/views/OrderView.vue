<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from '../components/ui/card.js'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs.js'
import { Button } from '../components/ui/button.js'
import { Badge } from '../components/ui/badge.js'
import { Separator } from '../components/ui/field.js'
import {
  Alert,
  AlertTitle,
  Empty,
  EmptyTitle,
  EmptyDescription,
  Skeleton,
} from '../components/ui/feedback.js'
import { getOrders } from '../services/orderService'
import { formatPrice } from '../utils/pricing'
import { locale, t } from '../services/i18n'

const orders = ref([])
const isLoading = ref(true)
const errorMessage = ref('')
const requestInFlight = ref(false)
const router = useRouter()
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
const itemCount = (count) =>
  withValues(count === 1 ? 'orders.itemCount' : 'orders.itemsCount', { count })
const orderCount = (count) =>
  withValues(count === 1 ? 'orders.orderCount' : 'orders.ordersCount', { count })
const formatDate = (date) => {
  const timestamp = date ? Date.parse(date) : NaN
  return Number.isNaN(timestamp)
    ? '—'
    : new Intl.DateTimeFormat(locale.value === 'km' ? 'km-KH' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: import.meta.env.VITE_TIME_ZONE || 'Asia/Phnom_Penh',
      }).format(new Date(timestamp))
}
const statusValue = (status) =>
  String((typeof status === 'object' ? status?.value || status?.name : status) || '')
    .trim()
    .toLowerCase()
const statusLabel = (status) => {
  const value = statusValue(status)
  return value && t(`orders.status.${value}`) !== `orders.status.${value}`
    ? t(`orders.status.${value}`)
    : t('orders.unknown')
}
const statusVariant = (status) => {
  const value = statusValue(status)
  if (value === 'paid' || value === 'shipped') return 'success'
  if (value === 'expired' || value === 'partial') return 'destructive'
  if (value === 'processing' || value === 'pending') return 'warning'
  return 'outline'
}
const lineTotal = (item) => Number(item.price || 0) * Number(item.quantity || 0)
const shippingCostLabel = (cost) =>
  cost === null || cost === undefined || cost === ''
    ? '—'
    : Number(cost) === 0
      ? t('orders.free')
      : formatPrice(cost)
const variantLabel = (item) =>
  item.variant_name || (typeof item.variant === 'object' ? item.variant?.name : item.variant) || ''
const filterCounts = computed(() => ({
  all: orders.value.length,
  progress: orders.value.filter((order) => statusValue(order.shipping_status) !== 'shipped').length,
  shipped: orders.value.filter((order) => statusValue(order.shipping_status) === 'shipped').length,
}))
const filteredOrders = computed(() =>
  deliveryFilter.value === 'all'
    ? orders.value
    : orders.value.filter((order) =>
        deliveryFilter.value === 'shipped'
          ? statusValue(order.shipping_status) === 'shipped'
          : statusValue(order.shipping_status) !== 'shipped',
      ),
)
const selectedFilterLabel = computed(
  () =>
    filterOptions.value.find((option) => option.value === deliveryFilter.value)?.label ||
    t('orders.all'),
)
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
    errorMessage.value = t('orders.loadError')
  } finally {
    requestInFlight.value = false
    isLoading.value = false
  }
}
onMounted(loadOrders)
</script>

<template>
  <main class="mx-auto max-w-[1100px] px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
    <header class="mb-8 flex flex-wrap items-center justify-between gap-4 sm:mb-10">
      <div class="flex items-center gap-3">
        <h1 class="m-0">{{ t('orders.title') }}</h1>
        <Badge v-if="!isLoading && !errorMessage" variant="secondary">{{ orders.length }}</Badge>
      </div>
      <Button as-child variant="outline" class="min-h-11 rounded-full"
        ><RouterLink to="/products"
          >{{ t('orders.back')
          }}<svg
            data-icon="inline-end"
            class="fill-none stroke-current stroke-[1.5]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M5 12h14m-6-6 6 6-6 6" /></svg></RouterLink
      ></Button>
    </header>
    <div
      v-if="isLoading"
      class="grid gap-5"
      aria-busy="true"
      role="status"
      :aria-label="t('orders.loading')"
    >
      <Card v-for="placeholder in 2" :key="placeholder"
        ><CardHeader><Skeleton class="h-5 w-40" /><Skeleton class="h-4 w-2/3" /></CardHeader
        ><CardContent class="grid gap-3"
          ><Skeleton class="h-12 w-full" /><Skeleton class="h-12 w-full" /></CardContent
      ></Card>
    </div>
    <Alert v-else-if="errorMessage" class="border-danger-line bg-danger-soft"
      ><AlertTitle>{{ errorMessage }}</AlertTitle
      ><Button variant="outline" class="mt-4" :disabled="requestInFlight" @click="loadOrders">{{
        t('orders.tryAgain')
      }}</Button></Alert
    >
    <Empty v-else-if="!orders.length" class="min-h-80 rounded-2xl">
      <svg
        class="size-10 fill-none stroke-muted stroke-[1.3]"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5zM4 7.5 12 12l8-4.5M12 12v9" />
      </svg>
      <EmptyTitle>{{ t('orders.noOrdersTitle') }}</EmptyTitle
      ><EmptyDescription class="max-w-md">{{ t('orders.noOrdersDescription') }}</EmptyDescription>
      <Button as-child class="mt-2 rounded-full"
        ><RouterLink to="/products">{{ t('orders.shopProducts') }}</RouterLink></Button
      >
    </Empty>
    <Tabs v-else v-model="deliveryFilter">
      <TabsList :aria-label="t('orders.filterByDelivery')" class="flex w-fit flex-wrap">
        <TabsTrigger
          v-for="option in filterOptions"
          :key="option.value"
          :value="option.value"
          :aria-label="`${option.label}: ${orderCount(filterCounts[option.value])}`"
        >
          {{ option.label
          }}<span class="text-xs tabular-nums" aria-hidden="true">{{
            filterCounts[option.value]
          }}</span>
        </TabsTrigger>
      </TabsList>
      <p class="sr-only" role="status">
        {{
          withValues('orders.showing', {
            count: orderCount(filteredOrders.length),
            filter: selectedFilterLabel,
          })
        }}
      </p>
      <TabsContent v-for="option in filterOptions" :key="option.value" :value="option.value">
        <Empty v-if="!filteredOrders.length" class="min-h-64 rounded-2xl"
          ><EmptyTitle>{{
            withValues('orders.noFilteredOrders', { filter: selectedFilterLabel })
          }}</EmptyTitle
          ><EmptyDescription>{{ t('orders.noFilteredDescription') }}</EmptyDescription
          ><Button variant="outline" class="mt-2 rounded-full" @click="deliveryFilter = 'all'">{{
            t('orders.showAll')
          }}</Button></Empty
        >
        <div v-else class="grid gap-5">
          <Card
            v-for="(order, index) in filteredOrders"
            :key="order.id || order.order_number"
            as="article"
            class="overflow-hidden"
            :aria-labelledby="`order-${order.id || index}`"
          >
            <details class="group" :open="index === 0">
              <CardHeader
                as="summary"
                class="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink [&::-webkit-details-marker]:hidden"
              >
                <div class="grid min-w-0 gap-2">
                  <CardTitle :id="`order-${order.id || index}`" class="text-lg wrap-anywhere">{{
                    order.order_number || `#${order.id}`
                  }}</CardTitle>
                  <CardDescription class="flex flex-wrap items-center gap-x-3 gap-y-1"
                    ><time :datetime="order.created_at">{{ formatDate(order.created_at) }}</time
                    ><span aria-hidden="true">·</span
                    ><span>{{ itemCount((order.items || []).length) }}</span></CardDescription
                  >
                </div>
                <svg
                  class="mt-1 size-5 fill-none stroke-muted stroke-[1.5] transition-transform group-open:rotate-180 motion-reduce:transition-none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
                <div class="col-span-full flex flex-wrap items-center justify-between gap-3">
                  <Badge
                    :variant="statusVariant(order.shipping_status)"
                    class="gap-2"
                    :aria-label="`${t('orders.delivery')}: ${statusLabel(order.shipping_status)}`"
                    ><svg
                      class="size-3.5 fill-none stroke-current stroke-[1.5]"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M3 6h11v11H3zM14 10h3.5L21 13.5V17h-7z" />
                      <circle cx="7" cy="18" r="2" />
                      <circle cx="17" cy="18" r="2" /></svg
                    >{{ statusLabel(order.shipping_status) }}</Badge
                  >
                  <span
                    class="text-lg font-semibold text-sale tabular-nums"
                    :aria-label="`${t('orders.orderTotal')}: ${formatPrice(order.total_amount)}`"
                    >{{ formatPrice(order.total_amount) }}</span
                  >
                </div>
              </CardHeader>
              <Separator />
              <CardContent class="grid gap-6 pt-5 sm:pt-6 md:grid-cols-[minmax(0,1fr)_15rem]">
                <section class="min-w-0" :aria-label="t('orders.items')">
                  <h3 class="m-0 mb-4 text-sm font-semibold">{{ t('orders.items') }}</h3>
                  <ul class="m-0 grid list-none gap-5 p-0">
                    <li
                      v-for="(item, itemIndex) in order.items || []"
                      :key="itemIndex"
                      class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3"
                    >
                      <div class="grid min-w-0 gap-1">
                        <strong class="text-sm font-semibold leading-relaxed wrap-anywhere">{{
                          item.name
                        }}</strong
                        ><span v-if="variantLabel(item)" class="text-sm text-muted wrap-anywhere">{{
                          variantLabel(item)
                        }}</span
                        ><span class="text-xs text-muted"
                          >{{ item.quantity }} × {{ formatPrice(item.price) }}</span
                        >
                      </div>
                      <span class="pt-0.5 text-sm font-semibold text-sale tabular-nums">{{
                        formatPrice(lineTotal(item))
                      }}</span>
                    </li>
                  </ul>
                </section>
                <aside
                  class="self-start rounded-xl bg-accent-soft/60 p-4"
                  :aria-label="t('orders.orderTotal')"
                >
                  <dl class="m-0 grid gap-4 text-sm">
                    <div class="flex flex-wrap justify-between gap-2">
                      <dt class="text-muted">{{ t('orders.subtotal') }}</dt>
                      <dd class="m-0 font-semibold text-sale tabular-nums">
                        {{ formatPrice(order.subtotal_amount) }}
                      </dd>
                    </div>
                    <div class="flex flex-wrap justify-between gap-2">
                      <dt class="text-muted">{{ t('orders.delivery') }}</dt>
                      <dd class="m-0 font-semibold text-sale tabular-nums">
                        {{ shippingCostLabel(order.shipping_cost) }}
                      </dd>
                    </div>
                  </dl>
                  <p
                    v-if="order.logistic"
                    class="m-0 mt-3 text-xs leading-relaxed text-muted wrap-anywhere"
                  >
                    {{ order.logistic }}
                  </p>
                </aside>
              </CardContent>
              <CardFooter class="justify-between gap-4"
                ><span class="text-sm font-semibold">{{ t('orders.total') }}</span
                ><span class="text-xl font-semibold text-sale tabular-nums">{{
                  formatPrice(order.total_amount)
                }}</span></CardFooter
              >
            </details>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  </main>
</template>
