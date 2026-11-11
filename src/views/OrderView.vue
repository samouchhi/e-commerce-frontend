<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { StepperRoot, StepperItem, StepperIndicator, StepperTitle, StepperSeparator } from 'reka-ui'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs.js'
import { Button } from '../components/ui/button.js'
import { Badge } from '../components/ui/badge.js'
import { Separator } from '../components/ui/field.js'
import { Alert, AlertTitle, Empty, EmptyTitle, Skeleton } from '../components/ui/feedback.js'
import {
  canResumeOrderPayment,
  generateOrderPayment,
  getOrders,
  verifyOrderPayment,
} from '../services/orderService'
import { formatPrice } from '../utils/pricing'
import { locale, t } from '../services/i18n'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../components/ui/dialog.js'

const orders = ref([])
const isLoading = ref(true)
const errorMessage = ref('')
const requestInFlight = ref(false)
const paymentDialogOpen = ref(false)
const activePaymentOrder = ref(null)
const paymentDetails = ref(null)
const paymentError = ref('')
const paymentWarning = ref('')
const paymentCompleted = ref(false)
const isGeneratingPayment = ref(false)
const isVerifyingPayment = ref(false)
let paymentTimer
let paymentController
let paymentSession = 0
const router = useRouter()
const deliveryFilter = ref('all')
const icons = {
  clock: 'M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  box: 'm4 7.5 8-4.5 8 4.5v9L12 21l-8-4.5ZM4 7.5l8 4.5 8-4.5M12 12v9M8 5.25l8 4.5',
  truck:
    'M3 6h11v11H3ZM14 10h3.5L21 13.5V17h-7M9 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM19 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  check: 'm5 12 4 4L19 6',
  chevron: 'm6 9 6 6 6-6',
  bag: 'M5 7h14l1 14H4ZM9 8V6a3 3 0 0 1 6 0v2',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  calendar: 'M8 3v4M16 3v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z',
  refresh: 'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1',
}
const iconClass = 'size-5 shrink-0 fill-none stroke-current stroke-[1.5]'
const shippingSteps = [
  { value: 'pending', icon: 'clock' },
  { value: 'processing', icon: 'box' },
  { value: 'shipped', icon: 'truck' },
]
const shippingStep = (status) =>
  shippingSteps.findIndex((step) => step.value === statusValue(status)) + 1
const filterOptions = computed(() => [
  { value: 'all', label: t('orders.all'), icon: 'box' },
  { value: 'progress', label: t('orders.inProgress'), icon: 'clock' },
  { value: 'shipped', label: t('orders.shipped'), icon: 'truck' },
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
  if (value === 'expired' || value === 'partial' || value === 'cancelled') return 'destructive'
  if (value === 'processing' || value === 'pending') return 'warning'
  return 'outline'
}
const hasPaymentStatus = (order) =>
  order && Object.prototype.hasOwnProperty.call(order, 'payment_status')
const stopPaymentSession = () => {
  paymentSession += 1
  clearTimeout(paymentTimer)
  paymentTimer = undefined
  paymentController?.abort()
  paymentController = undefined
  isVerifyingPayment.value = false
}
const schedulePaymentCheck = (delay = 3000) => {
  clearTimeout(paymentTimer)
  if (paymentDialogOpen.value && !paymentCompleted.value)
    paymentTimer = setTimeout(checkResumedPayment, delay)
}
const checkResumedPayment = async () => {
  const order = activePaymentOrder.value
  if (!paymentDialogOpen.value || !order?.id || isVerifyingPayment.value) return
  clearTimeout(paymentTimer)
  const session = paymentSession
  const controller = new AbortController()
  paymentController = controller
  isVerifyingPayment.value = true
  let nextDelay = 3000
  try {
    const result = await verifyOrderPayment(order.id, { signal: controller.signal })
    if (!paymentDialogOpen.value || session !== paymentSession) return
    paymentError.value = ''
    if (result.success === true && statusValue(result.status) === 'paid') {
      order.payment_status = result.status
      paymentCompleted.value = true
      stopPaymentSession()
      return
    }
    if (statusValue(result.status) === 'expired') {
      paymentWarning.value = t('checkout.qrExpiredStartNew')
      paymentDetails.value = null
      stopPaymentSession()
      return
    }
  } catch (error) {
    if (!paymentDialogOpen.value || session !== paymentSession || error.name === 'AbortError')
      return
    if ([401, 403, 404, 409, 422].includes(error.status)) {
      paymentError.value = t('checkout.paymentCheckError')
      stopPaymentSession()
      return
    }
    nextDelay = error.status === 429 ? 30000 : 3000
    paymentError.value =
      error.status === 429
        ? t('checkout.paymentRateLimited')
        : t('checkout.paymentUnavailableRetry')
  } finally {
    if (session === paymentSession) {
      paymentController = undefined
      isVerifyingPayment.value = false
      schedulePaymentCheck(nextDelay)
    }
  }
}
const resumePayment = async (order = activePaymentOrder.value) => {
  if (!canResumeOrderPayment(order) || isGeneratingPayment.value) return
  stopPaymentSession()
  activePaymentOrder.value = order
  paymentDialogOpen.value = true
  paymentDetails.value = null
  paymentError.value = ''
  paymentWarning.value = ''
  paymentCompleted.value = false
  isGeneratingPayment.value = true
  const session = paymentSession
  try {
    const payment = await generateOrderPayment(order.id)
    if (!paymentDialogOpen.value || session !== paymentSession) return
    paymentDetails.value = payment
    schedulePaymentCheck()
  } catch {
    if (!paymentDialogOpen.value || session !== paymentSession) return
    paymentError.value = t('checkout.khqrError')
  } finally {
    if (session === paymentSession) isGeneratingPayment.value = false
  }
}
const closePaymentDialog = () => {
  stopPaymentSession()
  paymentDialogOpen.value = false
  activePaymentOrder.value = null
  paymentDetails.value = null
  paymentError.value = ''
  paymentWarning.value = ''
  paymentCompleted.value = false
  isGeneratingPayment.value = false
}
const handlePaymentDialogOpen = (open) => {
  if (!open) closePaymentDialog()
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
onUnmounted(stopPaymentSession)
</script>

<template>
  <main
    id="main-content"
    tabindex="-1"
    class="mx-auto max-w-[1040px] px-5 py-8 pb-16 sm:px-8 sm:py-12"
  >
    <header class="mb-7 flex items-center justify-between gap-4 sm:mb-9">
      <div class="flex min-w-0 items-center gap-3">
        <h1 class="m-0">{{ t('orders.title') }}</h1>
        <span
          v-if="!isLoading && !errorMessage"
          class="rounded-lg bg-accent-soft px-2.5 py-1 text-sm font-semibold tabular-nums"
          >{{ orders.length }}</span
        >
      </div>
      <Button
        as-child
        variant="outline"
        size="icon"
        class="size-11 shrink-0 rounded-full"
        :title="t('orders.back')"
      >
        <RouterLink to="/products" :aria-label="t('orders.back')">
          <svg :class="iconClass" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="icons.bag" />
          </svg>
        </RouterLink>
      </Button>
    </header>

    <div
      v-if="isLoading"
      class="grid gap-4"
      aria-busy="true"
      role="status"
      :aria-label="t('orders.loading')"
    >
      <div
        v-for="placeholder in 3"
        :key="placeholder"
        class="grid gap-6 rounded-2xl border border-line p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:p-6"
      >
        <div class="grid gap-3">
          <Skeleton class="h-5 w-40 max-w-full" /><Skeleton class="h-4 w-28" />
        </div>
        <div class="flex items-center justify-around gap-4">
          <Skeleton v-for="step in 3" :key="step" class="size-10 shrink-0 rounded-full" />
        </div>
        <Skeleton class="hidden h-6 w-20 sm:block" />
      </div>
    </div>
    <Alert
      v-else-if="errorMessage"
      class="flex flex-wrap items-center justify-between gap-4 border-danger-line bg-danger-soft"
    >
      <AlertTitle>{{ errorMessage }}</AlertTitle>
      <Button
        variant="outline"
        class="min-h-11 gap-2 rounded-full"
        :disabled="requestInFlight"
        @click="loadOrders"
      >
        <svg :class="iconClass" viewBox="0 0 24 24" aria-hidden="true">
          <path :d="icons.refresh" />
        </svg>
        {{ t('orders.tryAgain') }}
      </Button>
    </Alert>
    <Empty v-else-if="!orders.length" class="min-h-72 gap-5 rounded-2xl border-solid">
      <span class="flex size-16 items-center justify-center rounded-2xl bg-accent-soft text-muted">
        <svg :class="[iconClass, 'size-8']" viewBox="0 0 24 24" aria-hidden="true">
          <path :d="icons.box" />
        </svg>
      </span>
      <EmptyTitle class="text-lg">{{ t('orders.noOrdersTitle') }}</EmptyTitle>
      <Button as-child class="min-h-11 rounded-full">
        <RouterLink to="/products"
          >{{ t('orders.shopProducts')
          }}<svg :class="iconClass" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="icons.arrow" /></svg
        ></RouterLink>
      </Button>
    </Empty>
    <Tabs v-else v-model="deliveryFilter">
      <TabsList
        :aria-label="t('orders.filterByDelivery')"
        class="flex w-full gap-0 sm:w-fit sm:gap-1"
      >
        <TabsTrigger
          v-for="option in filterOptions"
          :key="option.value"
          :value="option.value"
          :aria-label="`${option.label}: ${orderCount(filterCounts[option.value])}`"
          class="flex-1 flex-col gap-1.5 px-2 py-2 text-xs sm:flex-none sm:flex-row sm:gap-2 sm:px-4 sm:text-sm"
        >
          <svg :class="[iconClass, 'size-4']" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="icons[option.icon]" />
          </svg>
          <span class="inline-flex items-center gap-1.5"
            >{{ option.label
            }}<span class="text-xs tabular-nums opacity-70" aria-hidden="true">{{
              filterCounts[option.value]
            }}</span></span
          >
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
        <Empty v-if="!filteredOrders.length" class="min-h-64 gap-5 rounded-2xl border-solid">
          <svg :class="[iconClass, 'size-9 text-muted']" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="icons.box" />
          </svg>
          <EmptyTitle>{{
            withValues('orders.noFilteredOrders', { filter: selectedFilterLabel })
          }}</EmptyTitle>
          <Button variant="outline" class="min-h-11 rounded-full" @click="deliveryFilter = 'all'">{{
            t('orders.showAll')
          }}</Button>
        </Empty>
        <div v-else class="grid gap-4">
          <article
            v-for="(order, index) in filteredOrders"
            :key="order.id || order.order_number"
            class="min-w-0 overflow-hidden rounded-2xl bg-paper ring-1 ring-line/60"
            :aria-labelledby="`order-${order.id || index}`"
          >
            <details class="group/order" :open="index === 0">
              <summary
                class="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-5 p-5 transition-colors hover:bg-accent-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink motion-reduce:transition-none sm:grid-cols-[minmax(0,1fr)_minmax(15rem,1fr)_auto] sm:gap-6 sm:p-6 [&::-webkit-details-marker]:hidden"
              >
                <div class="grid min-w-0 gap-2">
                  <h2
                    :id="`order-${order.id || index}`"
                    class="m-0 text-base font-semibold leading-snug tracking-tight wrap-anywhere"
                  >
                    {{ order.order_number || `#${order.id}` }}
                  </h2>
                  <span class="flex items-center gap-2 text-xs text-muted">
                    <svg :class="[iconClass, 'size-3.5']" viewBox="0 0 24 24" aria-hidden="true">
                      <path :d="icons.calendar" />
                    </svg>
                    <time :datetime="order.created_at">{{ formatDate(order.created_at) }}</time>
                  </span>
                </div>
                <div class="col-start-2 row-start-1 flex items-center gap-3 sm:col-start-3">
                  <span
                    class="text-lg font-semibold text-sale tabular-nums"
                    :aria-label="`${t('orders.orderTotal')}: ${formatPrice(order.total_amount)}`"
                    >{{ formatPrice(order.total_amount) }}</span
                  >
                  <svg
                    :class="[
                      iconClass,
                      'size-4 text-muted transition-transform group-open/order:rotate-180 motion-reduce:transition-none',
                    ]"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path :d="icons.chevron" />
                  </svg>
                </div>
                <Badge
                  v-if="hasPaymentStatus(order)"
                  :variant="statusVariant(order.payment_status)"
                  class="col-start-1 row-start-2 w-fit sm:row-start-2"
                  :aria-label="`${t('orders.payment')}: ${statusLabel(order.payment_status)}`"
                >
                  {{ t('orders.payment') }}: {{ statusLabel(order.payment_status) }}
                </Badge>
                <StepperRoot
                  v-if="shippingStep(order.shipping_status)"
                  :model-value="shippingStep(order.shipping_status)"
                  :linear="false"
                  as="ol"
                  class="col-span-full m-0 flex list-none p-0 sm:col-span-1 sm:col-start-2 sm:row-start-1"
                  :aria-label="`${t('orders.delivery')}: ${statusLabel(order.shipping_status)}`"
                >
                  <StepperItem
                    v-for="(step, stepIndex) in shippingSteps"
                    :key="step.value"
                    v-slot="{ state }"
                    as="li"
                    :step="stepIndex + 1"
                    class="group/step relative flex min-w-0 flex-1 flex-col items-center gap-2"
                    :title="t(`orders.status.${step.value}`)"
                  >
                    <StepperIndicator
                      class="relative z-10 flex size-10 items-center justify-center rounded-full bg-accent-soft text-muted ring-4 ring-paper group-data-[state=active]/step:bg-ink group-data-[state=active]/step:text-paper group-data-[state=completed]/step:bg-success-soft group-data-[state=completed]/step:text-success"
                      aria-hidden="true"
                    >
                      <svg :class="iconClass" viewBox="0 0 24 24">
                        <path :d="icons[step.icon]" />
                      </svg>
                      <span
                        v-if="state === 'completed'"
                        class="absolute -right-1 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-success text-paper ring-2 ring-paper"
                        ><svg :class="[iconClass, 'size-2.5 stroke-2']" viewBox="0 0 24 24">
                          <path :d="icons.check" /></svg
                      ></span>
                    </StepperIndicator>
                    <StepperTitle
                      as="span"
                      class="text-center text-xs leading-relaxed text-muted group-data-[state=active]/step:font-semibold group-data-[state=active]/step:text-ink"
                      >{{ t(`orders.status.${step.value}`) }}</StepperTitle
                    >
                    <StepperSeparator
                      v-if="stepIndex < shippingSteps.length - 1"
                      class="absolute top-5 right-[calc(-50%+1.5rem)] left-[calc(50%+1.5rem)] h-px bg-line data-[state=completed]:bg-success-line"
                    />
                  </StepperItem>
                </StepperRoot>
                <Badge
                  v-else
                  :variant="statusVariant(order.shipping_status)"
                  class="col-span-full w-fit gap-2 sm:col-span-1 sm:col-start-2 sm:row-start-1"
                  :aria-label="`${t('orders.delivery')}: ${statusLabel(order.shipping_status)}`"
                >
                  <svg :class="[iconClass, 'size-4']" viewBox="0 0 24 24" aria-hidden="true">
                    <path :d="icons.truck" /></svg
                  >{{ statusLabel(order.shipping_status) }}
                </Badge>
              </summary>
              <div class="border-t border-line px-5 pt-4 pb-5 sm:px-6 sm:pb-6">
                <div class="mb-4 flex items-center gap-2 text-xs text-muted">
                  <svg :class="[iconClass, 'size-4']" viewBox="0 0 24 24" aria-hidden="true">
                    <path :d="icons.bag" />
                  </svg>
                  {{ itemCount((order.items || []).length) }}
                </div>
                <ul class="m-0 grid list-none gap-4 p-0" :aria-label="t('orders.items')">
                  <li
                    v-for="(item, itemIndex) in order.items || []"
                    :key="itemIndex"
                    class="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3"
                  >
                    <span
                      class="flex size-11 items-center justify-center rounded-lg bg-accent-soft text-muted"
                      aria-hidden="true"
                      ><svg :class="iconClass" viewBox="0 0 24 24"><path :d="icons.box" /></svg
                    ></span>
                    <div class="grid min-w-0 gap-0.5">
                      <strong class="text-sm font-semibold leading-relaxed wrap-anywhere">{{
                        item.name
                      }}</strong>
                      <span v-if="variantLabel(item)" class="text-xs text-muted wrap-anywhere">{{
                        variantLabel(item)
                      }}</span>
                      <span class="text-xs text-muted"
                        >{{ item.quantity }} × {{ formatPrice(item.price) }}</span
                      >
                    </div>
                    <span class="text-sm font-semibold text-sale tabular-nums">{{
                      formatPrice(lineTotal(item))
                    }}</span>
                  </li>
                </ul>
                <Separator class="my-5" />
                <dl
                  class="m-0 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 text-xs text-muted"
                >
                  <div class="flex items-center gap-2">
                    <dt>{{ t('orders.subtotal') }}</dt>
                    <dd class="m-0 font-semibold text-ink tabular-nums">
                      {{ formatPrice(order.subtotal_amount) }}
                    </dd>
                  </div>
                  <div class="flex flex-wrap items-center gap-2" :title="t('orders.delivery')">
                    <dt>
                      <span class="sr-only">{{ t('orders.delivery') }}</span
                      ><svg :class="[iconClass, 'size-4']" viewBox="0 0 24 24" aria-hidden="true">
                        <path :d="icons.truck" />
                      </svg>
                    </dt>
                    <dd class="m-0 flex flex-wrap items-center gap-2">
                      <span v-if="order.logistic" class="wrap-anywhere">{{ order.logistic }}</span
                      ><span class="font-semibold text-sale tabular-nums">{{
                        shippingCostLabel(order.shipping_cost)
                      }}</span>
                    </dd>
                  </div>
                </dl>
                <Button
                  v-if="canResumeOrderPayment(order)"
                  type="button"
                  class="mt-5 min-h-11 w-full rounded-full sm:w-auto"
                  @click="resumePayment(order)"
                >
                  {{ t('orders.resumePayment') }}
                </Button>
              </div>
            </details>
          </article>
        </div>
      </TabsContent>
    </Tabs>
    <Dialog :open="paymentDialogOpen" @update:open="handlePaymentDialogOpen">
      <DialogContent class="max-w-md text-center">
        <div class="grid gap-4">
          <DialogTitle>{{ t('orders.resumePayment') }}</DialogTitle>
          <DialogDescription>{{ t('checkout.scanWithApp') }}</DialogDescription>
          <div v-if="isGeneratingPayment" class="grid justify-items-center gap-3" role="status">
            <Skeleton class="size-56" />
            <span class="text-sm text-muted">{{ t('checkout.preparingQr') }}</span>
          </div>
          <template v-else-if="paymentCompleted">
            <span
              class="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-success"
            >
              <svg :class="iconClass" viewBox="0 0 24 24" aria-hidden="true">
                <path :d="icons.check" />
              </svg>
            </span>
            <p class="m-0" role="status">{{ t('checkout.paymentConfirmedThanks') }}</p>
          </template>
          <template v-else-if="paymentDetails">
            <img
              :src="paymentDetails.qr_image"
              :alt="t('checkout.scanWithApp')"
              class="mx-auto aspect-square w-56 max-w-full"
              width="224"
              height="224"
            />
            <p class="m-0 text-sm text-muted" role="status">
              {{ t('checkout.waitingPayment') }}
            </p>
          </template>
          <CheckoutFeedback
            v-if="paymentError || paymentWarning"
            :title="paymentWarning ? t('checkout.qrExpired') : t('checkout.paymentUnavailable')"
            :description="paymentWarning || paymentError"
            :action="paymentWarning ? t('checkout.requestNewQr') : t('checkout.checkPaymentAgain')"
            :busy="isGeneratingPayment || isVerifyingPayment"
            @retry="paymentWarning ? resumePayment() : checkResumedPayment()"
          />
          <DialogClose as-child>
            <Button type="button" variant="outline" class="w-full rounded-full">
              {{ t('checkout.close') }}
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  </main>
</template>
