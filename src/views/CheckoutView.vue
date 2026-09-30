<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../services/api'
import { assetUrl } from '../services/api'
import {
  getCart,
  clearCart,
  mergeCartItem,
  resolveCart,
  updateCartItem,
  updateCartQuantity,
} from '../services/cartService'
import { createOrder, generateOrderPayment, verifyOrderPayment } from '../services/orderService'
import { getProducts } from '../services/productService'
import { t } from '../services/i18n'
import { Button } from '../components/ui/button.js'
import { Badge } from '../components/ui/badge.js'
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group.js'
import { getAddresses, deleteAddress } from '../services/addressService'
import {
  CheckoutFeedback,
  Skeleton,
  Empty,
  EmptyTitle,
  EmptyDescription,
} from '../components/ui/feedback.js'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '../components/ui/alert-dialog.js'

const checkoutPageClass = 'mx-auto max-w-[1100px] px-[clamp(1.25rem,4vw,4.5rem)] pt-4 pb-10'
const sectionLabelClass = 'mb-2 text-base font-bold text-ink uppercase text-[1.125rem]'
const fieldLabelClass = 'grid gap-[0.45rem] text-[0.875rem] font-bold text-muted uppercase'
const fieldControlClass = 'flex items-center gap-[0.7rem] border-b border-line'
const fieldIconClass =
  'h-[1.2rem] w-[1.2rem] flex-[0_0_1.2rem] fill-none stroke-muted stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]'
const controlClass =
  'w-full min-w-0 border-0 bg-transparent py-[0.7rem] pl-0 text-base text-ink focus:shadow-[0_2px_0_var(--color-accent)] focus:outline-none'
const textareaClass =
  'rounded-none border-b border-line bg-transparent py-[0.7rem] text-base text-ink resize-y focus:border-accent focus:shadow-[0_2px_0_var(--color-accent)] focus:outline-none'
const optionClass =
  'grid cursor-pointer grid-cols-[auto_3.5rem_minmax(0,1fr)_auto] items-center gap-4 border border-line p-4 text-[0.65rem] font-bold text-muted transition-[border-color,background-color] duration-[160ms] hover:border-accent hover:bg-accent-soft has-[:checked]:border-accent has-[:checked]:bg-accent-soft max-md:grid-cols-[auto_2.75rem_minmax(0,1fr)_auto] max-md:gap-[0.65rem] max-md:p-3'
const optionImageClass = 'h-11 w-14 object-contain p-1 mix-blend-multiply max-md:w-11'
const checkoutButtonClass =
  'rounded-sm block w-full cursor-pointer border-0 bg-accent p-4 text-center text-[0.875rem] font-bold text-white uppercase no-underline hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-muted'
const summaryRowClass = 'flex w-full items-center justify-between'
const summaryLabelClass = 'text-[1rem] text-muted uppercase'
const summaryValueClass = 'text-[1rem] font-bold text-red-500'

const cart = ref(getCart())
const refreshCart = () => (cart.value = getCart())
const canCheckout = ref(true)
const unavailableItems = computed(() => cart.value.filter((item) => item.unavailable))
const products = ref([])
const productsError = ref('')
const isLoadingProducts = ref(false)
const cartError = ref('')
const isRefreshingCart = ref(false)
const logistics = ref([])
const selectedLogisticId = ref('')
const isLoadingLogistics = ref(true)
const logisticsError = ref('')
const isSubmitted = ref(false)
const isSubmitting = ref(false)
const isVerifying = ref(false)
const paymentCompleted = ref(false)
const paymentExpired = ref(false)
const paymentDetails = ref(null)
const paymentAction = ref('')
const remainingSeconds = ref(0)
const countdownDuration = ref(1)
let countdownTimer
const qrTimeUp = computed(() => paymentDetails.value !== null && remainingSeconds.value === 0)
const isMobileDevice =
  typeof navigator !== 'undefined' &&
  (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
const canOpenAbaApp = computed(
  () =>
    isMobileDevice &&
    isSubmitted.value &&
    !paymentCompleted.value &&
    !paymentExpired.value &&
    !qrTimeUp.value &&
    typeof paymentDetails.value?.deeplink_url === 'string' &&
    paymentDetails.value.deeplink_url.startsWith('abamobilebank://ababank.com?type=payway&qrcode='),
)
const paymentStatusMessage = computed(() => {
  if (paymentAction.value === 'rqpay') return t('checkout.paymentRequested')
  if (paymentAction.value === 'processing-payment') return t('checkout.paymentProcessing')
  if (qrTimeUp.value) return t('checkout.qrChecking')
  return t('checkout.waitingPayment')
})
const countdownLabel = computed(() => {
  const minutes = Math.floor(remainingSeconds.value / 60)
    .toString()
    .padStart(2, '0')
  const seconds = (remainingSeconds.value % 60).toString().padStart(2, '0')
  return minutes + ':' + seconds
})
const countdownProgress = computed(() =>
  Math.min(100, (remainingSeconds.value / countdownDuration.value) * 100),
)
const startPaymentCountdown = (expiresAt) => {
  clearInterval(countdownTimer)
  const deadline = Date.parse(expiresAt)
  const update = () => {
    remainingSeconds.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
    if (remainingSeconds.value === 0) clearInterval(countdownTimer)
  }
  update()
  countdownDuration.value = Math.max(1, remainingSeconds.value)
  if (remainingSeconds.value > 0) countdownTimer = setInterval(update, 1000)
}
let paymentPollTimer
let paymentCheckController
let paymentSession = 0
let checkoutUnmounted = false

const stopPaymentPolling = () => {
  paymentSession += 1
  clearInterval(countdownTimer)
  clearTimeout(paymentPollTimer)
  paymentPollTimer = undefined
  paymentCheckController?.abort()
  paymentCheckController = undefined
  isVerifying.value = false
}

const schedulePaymentCheck = (delay = 3000) => {
  clearTimeout(paymentPollTimer)
  if (isSubmitted.value && !paymentCompleted.value && !paymentExpired.value) {
    paymentPollTimer = setTimeout(checkPayment, delay)
  }
}
const errorMessage = ref('')
const paymentQrImage = ref('')
const paymentWarning = ref('')
const order = ref(null)
const form = ref({ name: '', phone: '', address: '', city: '', note: '' })
const addresses = ref([])
const selectedAddressId = ref('new')
const newAddressDraft = ref({ ...form.value })
const isLoadingAddresses = ref(true)
const addressesError = ref('')
const addressToDelete = ref(null)
const isDeletingAddress = ref(false)
const deleteAddressError = ref('')
let deleteFocusId
const requestDeleteAddress = (address) => {
  deleteFocusId = `delete-address-${address.id}`
  addressToDelete.value = address
  deleteAddressError.value = ''
}
const restoreAddressFocus = (event) => {
  event.preventDefault()
  const target =
    document.getElementById(deleteFocusId) ||
    document.getElementById(`saved-address-${selectedAddressId.value}`) ||
    document.querySelector('input[autocomplete="name"]')
  target?.focus()
}

const confirmDeleteAddress = async () => {
  if (!addressToDelete.value || isDeletingAddress.value) return
  const id = addressToDelete.value.id
  isDeletingAddress.value = true
  deleteAddressError.value = ''
  try {
    await deleteAddress(id)
    if (checkoutUnmounted) return
    addresses.value = addresses.value.filter((address) => address.id !== id)
    if (selectedAddressId.value === String(id))
      selectAddress(addresses.value.length ? String(addresses.value[0].id) : 'new')
    addressToDelete.value = null
  } catch {
    deleteAddressError.value = t('checkout.deleteAddressError')
  } finally {
    isDeletingAddress.value = false
  }
}

const closeDeleteDialog = (open) => {
  if (!open && !isDeletingAddress.value) {
    addressToDelete.value = null
    deleteAddressError.value = ''
  }
}

const selectAddress = (value) => {
  const address = addresses.value.find((item) => String(item.id) === String(value))
  if (value !== 'new' && !address) return
  if (selectedAddressId.value === 'new') newAddressDraft.value = { ...form.value }
  selectedAddressId.value = String(value)
  form.value =
    value === 'new'
      ? { ...newAddressDraft.value }
      : {
          name: address.name || '',
          phone: address.phone || '',
          address: address.address || '',
          city: address.city || '',
          note: address.note || '',
        }
}

const loadAddresses = async () => {
  isLoadingAddresses.value = true
  addressesError.value = ''
  try {
    const result = await getAddresses()
    if (checkoutUnmounted) return
    addresses.value = result
    selectAddress(result.length ? String(result[0].id) : 'new')
  } catch {
    if (checkoutUnmounted) return
    selectAddress('new')
    addresses.value = []
    addressesError.value = t('checkout.addressLoadError')
  } finally {
    isLoadingAddresses.value = false
  }
}
const abaKhqrLogo = '/payment-abakhqr.webp'
const cambodiaProvinces = [
  'Banteay Meanchey',
  'Battambang',
  'Kampong Cham',
  'Kampong Chhnang',
  'Kampong Speu',
  'Kampong Thom',
  'Kampot',
  'Kandal',
  'Kep',
  'Koh Kong',
  'Kratie',
  'Mondulkiri',
  'Oddar Meanchey',
  'Pailin',
  'Phnom Penh',
  'Preah Sihanouk',
  'Preah Vihear',
  'Pursat',
  'Ratanakiri',
  'Siem Reap',
  'Stung Treng',
  'Svay Rieng',
  'Takeo',
  'Tboung Khmum',
]

const selectedLogistic = computed(() =>
  logistics.value.find((logistic) => String(logistic.id) === String(selectedLogisticId.value)),
)
const subtotal = computed(() =>
  cart.value.reduce(
    (total, item) => total + (item.unavailable ? 0 : Number(item.price) * item.quantity),
    0,
  ),
)
const deliveryFee = computed(() => Number(selectedLogistic.value?.price || 0))
const total = computed(() => subtotal.value + deliveryFee.value)
const productFor = (item) => products.value.find((product) => product.id === item.productId)
const variantFor = (item) =>
  productFor(item)?.variants?.find((variant) => variant.id === item.variantId)
const imageUrl = (item) => {
  const image = productFor(item)
    ?.images?.slice()
    .sort((a, b) => a.sort_order - b.sort_order)[0]
  return image?.image_path ? assetUrl(`/storage/${image.image_path}`) : assetUrl(item.imageUrl)
}
const lineTotal = (item) => Number(item.price) * item.quantity
const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)

const changeQuantity = (item, value) => {
  const stock = Number(variantFor(item)?.stock_qty ?? Infinity)
  if (updateCartQuantity(item.variantId, value, stock)) cart.value = getCart()
}

const changeVariant = (item, variantId) => {
  const variant = productFor(item)?.variants?.find(
    (candidate) => candidate.id === Number(variantId),
  )
  if (!variant || !variant.is_active || Number(variant.stock_qty) <= 0) return
  const existing = cart.value.find((cartItem) => cartItem.variantId === variant.id)
  if (existing && existing.variantId !== item.variantId) {
    if (
      mergeCartItem(
        item.variantId,
        {
          variantId: variant.id,
          variantName: variant.name,
          price: Number(variant.discounted_price ?? variant.price),
        },
        Number(variant.stock_qty),
      )
    ) {
      cart.value = getCart()
    }
    return
  }
  updateCartItem(item.variantId, {
    variantId: variant.id,
    variantName: variant.name,
    price: Number(variant.discounted_price ?? variant.price),
    quantity: Math.min(item.quantity, Number(variant.stock_qty)),
  })
  cart.value = getCart()
}

const loadLogistics = async () => {
  isLoadingLogistics.value = true
  logisticsError.value = ''
  try {
    const payload = await api.request('/api/logistics')
    logistics.value = Array.isArray(payload) ? payload : payload.data || []
    selectedLogisticId.value = logistics.value[0]?.id || ''
  } catch {
    logisticsError.value = t('checkout.deliveryLoadError')
  } finally {
    isLoadingLogistics.value = false
  }
}

const apiError = (_error, fallback) => fallback

const loadProducts = async () => {
  isLoadingProducts.value = true
  productsError.value = ''
  try {
    products.value = await getProducts()
  } catch {
    productsError.value = t('checkout.productsLoadError')
  } finally {
    isLoadingProducts.value = false
  }
}

const refreshCheckoutCart = async () => {
  isRefreshingCart.value = true
  cartError.value = ''
  try {
    await resolveCurrentCart()
  } catch {
    canCheckout.value = false
    cartError.value = t('checkout.cartRefreshError')
  } finally {
    isRefreshingCart.value = false
  }
}

const orderIdFrom = (payload) =>
  payload?.id || payload?.order_id || payload?.data?.id || payload?.data?.order_id

const closePaymentModal = () => {
  stopPaymentPolling()
  isSubmitted.value = false
  paymentCompleted.value = false
  paymentExpired.value = false
  paymentAction.value = ''
  paymentWarning.value = ''
  paymentDetails.value = null
  remainingSeconds.value = 0
  if (paymentQrImage.value) {
    URL.revokeObjectURL(paymentQrImage.value)
    paymentQrImage.value = ''
  }
}

const resolveCurrentCart = async () => {
  const resolved = await resolveCart()
  refreshCart()
  canCheckout.value = resolved.can_checkout

  if (!resolved.can_checkout) {
    errorMessage.value = t('checkout.cartChanged')
  }
}

const submitOrder = async () => {
  try {
    await resolveCurrentCart()
    cartError.value = ''
  } catch (error) {
    canCheckout.value = false
    cartError.value = t('checkout.cartRefreshError')
    return
  }
  if (
    !cart.value.length ||
    !canCheckout.value ||
    isSubmitting.value ||
    isLoadingAddresses.value ||
    isDeletingAddress.value ||
    isRefreshingCart.value ||
    isLoadingLogistics.value ||
    !selectedLogistic.value
  )
    return
  if (
    !form.value.name.trim() ||
    !form.value.phone.trim() ||
    !form.value.address.trim() ||
    !form.value.city.trim()
  )
    return
  errorMessage.value = ''
  isSubmitting.value = true
  try {
    const createdOrder = await createOrder({
      name: form.value.name.trim(),
      phone: form.value.phone.trim(),
      address: form.value.address.trim(),
      city: form.value.city.trim(),
      note: form.value.note.trim() || null,
      order_number: '',
      logistic_id: Number(selectedLogisticId.value),
      total_amount: Number(total.value.toFixed(2)),
      subtotal_amount: Number(subtotal.value.toFixed(2)),
      shipping_cost: Number(deliveryFee.value.toFixed(2)),
      payment_status: 'pending',
      shipping_status: 'pending',
      items: cart.value.map((item) => ({
        product_variant_id: Number(item.variantId),
        quantity: Number(item.quantity),
      })),
    })
    if (checkoutUnmounted) return
    const orderId = orderIdFrom(createdOrder)
    if (!orderId) throw new Error(t('checkout.missingOrderId'))
    order.value = createdOrder?.data || createdOrder
    stopPaymentPolling()
    paymentCompleted.value = false
    paymentExpired.value = false
    paymentAction.value = ''
    isSubmitted.value = true
    const session = paymentSession
    try {
      const payment = await generateOrderPayment(orderId)
      if (!isSubmitted.value || session !== paymentSession) return
      paymentDetails.value = payment
      paymentQrImage.value = payment.qr_image
      startPaymentCountdown(payment.expires_at)
      schedulePaymentCheck()
      if (canOpenAbaApp.value) {
        try {
          window.location.assign(payment.deeplink_url)
        } catch {
          // Browsers may require a direct tap; keep the QR and app button available.
        }
      }
    } catch (error) {
      if (!isSubmitted.value || session !== paymentSession) return
      errorMessage.value = apiError(error, t('checkout.khqrError'))
    }
  } catch (error) {
    errorMessage.value = apiError(error, t('checkout.orderCreateError'))
  } finally {
    isSubmitting.value = false
  }
}

const checkPayment = async () => {
  const orderId = orderIdFrom(order.value)
  if (
    !isSubmitted.value ||
    !orderId ||
    isVerifying.value ||
    paymentCompleted.value ||
    paymentExpired.value
  )
    return
  clearTimeout(paymentPollTimer)
  const session = paymentSession
  const controller = new AbortController()
  paymentCheckController = controller
  isVerifying.value = true
  let nextCheckDelay = 3000

  try {
    const result = await verifyOrderPayment(orderId, { signal: controller.signal })
    if (!isSubmitted.value || session !== paymentSession) return
    errorMessage.value = ''
    paymentWarning.value = ''

    paymentAction.value = result.action || ''

    if (result.success === true && result.status === 'paid') {
      clearCart()
      paymentCompleted.value = true
      stopPaymentPolling()
    } else if (result.status === 'expired') {
      paymentExpired.value = true
      remainingSeconds.value = 0
      paymentQrImage.value = ''
      paymentWarning.value = t('checkout.qrExpiredStartNew')
      stopPaymentPolling()
    }
  } catch (error) {
    if (!isSubmitted.value || session !== paymentSession || error.name === 'AbortError') return
    if ([401, 403, 404, 409, 422].includes(error.status)) {
      errorMessage.value = apiError(error, t('checkout.paymentCheckError'))
      paymentDetails.value = null
      paymentQrImage.value = ''
      stopPaymentPolling()
    } else {
      nextCheckDelay = error.status === 429 ? 30000 : 3000
      errorMessage.value =
        error.status === 429
          ? t('checkout.paymentRateLimited')
          : t('checkout.paymentUnavailableRetry')
    }
  } finally {
    if (session === paymentSession) {
      paymentCheckController = undefined
      isVerifying.value = false
      schedulePaymentCheck(nextCheckDelay)
    }
  }
}

onMounted(async () => {
  window.addEventListener('cart-updated', refreshCart)
  window.addEventListener('storage', refreshCart)
  await Promise.all([refreshCheckoutCart(), loadProducts(), loadLogistics(), loadAddresses()])
})

onUnmounted(() => {
  checkoutUnmounted = true
  isSubmitted.value = false
  stopPaymentPolling()
  window.removeEventListener('cart-updated', refreshCart)
  window.removeEventListener('storage', refreshCart)
  if (paymentQrImage.value) URL.revokeObjectURL(paymentQrImage.value)
})
</script>

<template>
  <main :class="checkoutPageClass">
    <RouterLink
      to="/"
      class="inline-flex size-10 items-center justify-center rounded-full text-ink border-1"
      aria-label="Go back"
    >
      <svg class="size-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 12H5m6 6-6-6 6-6" />
      </svg>
    </RouterLink>

    <h2 class="my-[0.83em] text-[1.5em] font-bold text-ink">{{ t('checkout.completeOrder') }}</h2>

    <Teleport to="body">
      <div
        v-if="isSubmitted"
        class="fixed inset-0 z-20 flex items-center justify-center bg-[rgb(32_35_33/72%)] p-5"
        role="presentation"
        @click.self="closePaymentModal"
      >
        <section
          class="relative max-h-[calc(100vh-2.5rem)] w-full max-w-[460px] overflow-y-auto rounded-[18px] bg-white p-[24px] font-[Arial,sans-serif] text-[#314865] shadow-[0_1.5rem_4rem_rgb(0_0_0/25%)] max-xs:p-4"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="paymentCompleted ? 'order-completed-title' : 'payment-modal-title'"
          :aria-describedby="paymentCompleted ? 'order-completed-description' : undefined"
        >
          <header v-if="!paymentCompleted" class="flex items-center gap-[14px] max-xs:gap-2">
            <button
              class="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border-0 bg-[#f0f1f2] p-[10px] text-[#5c6470] focus-visible:outline-solid focus-visible:outline-[2px] focus-visible:outline-offset-[3px] focus-visible:outline-aba"
              type="button"
              :aria-label="t('checkout.closeDialog')"
              @click="closePaymentModal"
            >
              <svg
                class="h-6 w-6 fill-none stroke-current stroke-[2.5]"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="m14 7-5 5 5 5" />
              </svg>
            </button>
            <h2
              id="payment-modal-title"
              class="m-0 font-[Arial,sans-serif] text-[22px] leading-[1.2] font-semibold text-[#314865] max-xs:text-[18px]"
            >
              ABA KHQR
            </h2>
            <div
              v-if="paymentDetails && !paymentCompleted"
              class="ml-auto flex items-center gap-[9px] text-base font-semibold text-[#333] tabular-nums max-xs:gap-[6px] max-xs:text-[14px]"
              role="timer"
              aria-label="Time left to scan QR"
              aria-live="off"
            >
              <span
                class="relative h-[26px] w-[26px] flex-[0_0_26px] rounded-full bg-[conic-gradient(#21b9cd_var(--progress),#e8edef_0)] after:absolute after:inset-[5px] after:rounded-full after:bg-white after:content-['']"
                :style="{ '--progress': countdownProgress + '%' }"
                aria-hidden="true"
              ></span>
              <span>{{ countdownLabel }}</span>
            </div>
          </header>
          <Transition name="payment-step" mode="out-in">
            <div
              v-if="paymentCompleted"
              key="complete"
              class="relative flex flex-col items-center gap-5 px-2 py-6 text-center text-ink max-xs:px-0"
              role="status"
            >
              <button
                type="button"
                class="absolute -top-2 -right-2 grid size-9 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                :aria-label="t('checkout.closeDialog')"
                @click="closePaymentModal"
              >
                <svg
                  class="size-4 fill-none stroke-current stroke-2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
              <div
                class="grid size-20 place-items-center rounded-full bg-success-soft text-success ring-8 ring-success-soft/50"
                aria-hidden="true"
              >
                <svg
                  class="size-10 fill-none stroke-current stroke-[3] [stroke-linecap:round] [stroke-linejoin:round]"
                  viewBox="0 0 48 48"
                >
                  <path d="m13 24 8 8 15-16" />
                </svg>
              </div>
              <div class="flex flex-col items-center gap-3">
                <Badge variant="success">{{ t('checkout.paymentReceived') }}</Badge>
                <h2
                  id="order-completed-title"
                  class="m-0 text-[28px] leading-tight font-semibold tracking-tight max-xs:text-2xl"
                >
                  {{ t('checkout.orderCompleted') }}
                </h2>
                <p
                  id="order-completed-description"
                  class="m-0 max-w-[320px] text-sm leading-relaxed text-muted"
                >
                  {{ t('checkout.paymentConfirmedThanks') }}
                </p>
              </div>
              <dl
                class="m-0 grid w-full gap-3 rounded-xl border border-line bg-accent-soft/50 p-4 text-sm"
              >
                <div class="flex items-start justify-between gap-4">
                  <dt class="text-muted">{{ t('checkout.orderNumber') }}</dt>
                  <dd class="m-0 min-w-0 text-right font-semibold wrap-anywhere">
                    {{ order?.order_number || `#${orderIdFrom(order)}` }}
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-muted">{{ t('checkout.amountPaid') }}</dt>
                  <dd class="m-0 text-base font-semibold tabular-nums">
                    {{ formatPrice(paymentDetails?.amount ?? order?.total_amount ?? total) }}
                  </dd>
                </div>
              </dl>
              <div class="grid w-full gap-2">
                <Button as-child size="lg">
                  <RouterLink to="/orders" @click="closePaymentModal">
                    {{ t('checkout.viewOrder') }}
                    <svg
                      data-icon="inline-end"
                      class="fill-none stroke-current stroke-2"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14m-6-6 6 6-6 6" />
                    </svg>
                  </RouterLink>
                </Button>
                <Button as-child variant="outline" size="lg">
                  <RouterLink to="/" @click="closePaymentModal">{{
                    t('checkout.continueShopping')
                  }}</RouterLink>
                </Button>
              </div>
            </div>
            <div v-else key="scan" class="pt-4 text-center">
              <div
                v-if="paymentDetails && !paymentExpired && !qrTimeUp"
                class="mx-auto mt-[30px] mb-6 w-[260px] max-w-full overflow-hidden rounded-[20px] bg-white text-left shadow-[0_8px_24px_#00000012]"
              >
                <div
                  class="relative flex h-11 items-center justify-center bg-[#e21a1a] after:absolute after:top-full after:right-0 after:border-t-[18px] after:border-t-[#e21a1a] after:border-l-[18px] after:border-l-transparent after:content-['']"
                >
                  <img src="/aba-khqr-header.svg" alt="KHQR" width="60" height="14" />
                </div>
                <div class="border-b border-dashed border-[#a7a7a7] px-[30px] pt-6 pb-[15px]">
                  <p
                    v-if="paymentDetails.merchant_name"
                    class="mt-0 mr-0 mb-1 ml-0 font-[Arial,sans-serif] text-[13px] leading-[1.4] font-normal text-[#314865] [overflow-wrap:anywhere]"
                  >
                    {{ paymentDetails.merchant_name }}
                  </p>
                  <div>
                    <strong class="text-[21px] font-bold text-[#172c49]">{{
                      Number(paymentDetails.amount).toFixed(2)
                    }}</strong
                    ><span class="ml-[10px] text-[10px] text-[#314865]">{{
                      paymentDetails.currency
                    }}</span>
                  </div>
                </div>
                <div class="relative mx-auto my-[12px] aspect-square w-56 max-w-[calc(100%-24px)]">
                  <img
                    class="block h-full w-full"
                    :src="paymentQrImage"
                    alt="Scan to pay with KHQR"
                    width="224"
                    height="224"
                  />
                  <img
                    class="absolute top-1/2 left-1/2 h-[14.3%] w-[14.3%] -translate-x-1/2 -translate-y-1/2"
                    src="/aba-bakong.svg"
                    alt=""
                    aria-hidden="true"
                    width="32"
                    height="32"
                  />
                </div>
              </div>
              <p
                v-if="paymentDetails && !paymentExpired && !qrTimeUp"
                class="m-0 font-[Arial,sans-serif] text-base leading-[1.5] font-normal text-[#737373]"
              >
                {{ t('checkout.scanWithApp') }}
              </p>
              <div
                v-if="!paymentDetails && !errorMessage"
                class="flex justify-center py-6"
                role="status"
                :aria-label="t('checkout.preparingQr')"
              >
                <Skeleton class="size-60" />
              </div>
              <p
                v-if="paymentDetails && !paymentExpired"
                class="mt-4 font-[Arial,sans-serif] text-[12px] leading-[1.5] font-normal text-[#677281]"
                role="status"
                aria-atomic="true"
              >
                {{ paymentStatusMessage }}
              </p>
              <CheckoutFeedback
                v-if="paymentWarning || errorMessage"
                class="mt-5"
                :title="
                  errorMessage
                    ? t('checkout.paymentUnavailable')
                    : paymentExpired
                      ? t('checkout.qrExpired')
                      : t('checkout.paymentNotReceived')
                "
                :description="errorMessage || paymentWarning"
                :action="
                  paymentDetails && !paymentExpired
                    ? t('checkout.checkPaymentAgain')
                    : t('checkout.backToCheckout')
                "
                :busy="isVerifying"
                @retry="paymentDetails && !paymentExpired ? checkPayment() : closePaymentModal()"
              />
              <div class="mx-auto mt-5 grid w-full max-w-[280px] gap-3">
                <a
                  v-if="canOpenAbaApp"
                  :href="paymentDetails.deeplink_url"
                  class="block w-full cursor-pointer border border-solid border-transparent bg-accent p-4 text-center text-[0.7rem] font-bold text-white uppercase no-underline hover:bg-accent-hover"
                >
                  {{ t('checkout.openAba') }}
                </a>
                <button
                  class="block w-full cursor-pointer border border-solid border-line bg-transparent p-4 text-center text-[0.7rem] font-bold text-ink uppercase no-underline hover:bg-ink hover:text-white disabled:cursor-not-allowed"
                  type="button"
                  @click="closePaymentModal"
                >
                  {{ t('checkout.close') }}
                </button>
              </div>
            </div>
          </Transition>
        </section>
      </div>
    </Teleport>

    <form
      :inert="isSubmitted"
      class="mt-6 grid grid-cols-[minmax(0,1fr)_minmax(320px,360px)] items-start gap-[clamp(1.5rem,3vw,2.5rem)] max-md:mt-8 max-md:grid-cols-1"
      @submit.prevent="submitOrder"
    >
      <div class="grid gap-8">
        <section class="grid gap-4 border-t-2 border-ink pt-4">
          <p :class="sectionLabelClass">{{ t('checkout.deliveryAddress') }}</p>
          <div
            v-if="isLoadingAddresses"
            class="grid gap-3"
            role="status"
            :aria-label="t('checkout.loadingAddresses')"
          >
            <Skeleton class="h-24 w-full" /><Skeleton class="h-12 w-full" />
          </div>
          <CheckoutFeedback
            v-else-if="addressesError"
            :title="t('checkout.addressLoadTitle')"
            :description="addressesError"
            :action="t('checkout.retryAddresses')"
            @retry="loadAddresses"
          />
          <RadioGroup
            v-if="addresses.length"
            :model-value="selectedAddressId"
            :disabled="isLoadingAddresses || isDeletingAddress"
            :aria-label="t('checkout.deliveryAddress')"
            @update:model-value="selectAddress"
          >
            <div
              v-for="address in addresses"
              :key="address.id"
              class="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-4 transition-colors has-[[data-state=checked]]:border-ink has-[[data-state=checked]]:bg-accent-soft"
            >
              <label
                :for="`saved-address-${address.id}`"
                class="flex min-w-0 flex-1 cursor-pointer items-start gap-3"
              >
                <RadioGroupItem
                  :id="`saved-address-${address.id}`"
                  :value="String(address.id)"
                  class="mt-1"
                />
                <span class="grid min-w-0 gap-1 text-sm wrap-anywhere">
                  <strong class="font-semibold text-ink">{{ address.name }}</strong>
                  <span class="text-muted">{{ address.phone }}</span>
                  <span class="text-ink">{{ address.address }}, {{ address.city }}</span>
                </span>
              </label>
              <Button
                :id="`delete-address-${address.id}`"
                type="button"
                variant="ghost"
                size="icon"
                :aria-label="t('checkout.deleteAddress')"
                :disabled="isDeletingAddress || isLoadingAddresses"
                @click="requestDeleteAddress(address)"
              >
                <svg
                  class="fill-none stroke-current stroke-[1.8]"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6m4-6v6" />
                </svg>
              </Button>
            </div>
            <label
              for="new-delivery-address"
              class="flex cursor-pointer items-center gap-3 rounded-lg border border-line p-4 transition-colors has-[[data-state=checked]]:border-ink has-[[data-state=checked]]:bg-accent-soft"
            >
              <RadioGroupItem id="new-delivery-address" value="new" />
              <span class="text-sm font-semibold text-ink">{{ t('checkout.newAddress') }}</span>
            </label>
          </RadioGroup>
          <fieldset
            v-show="selectedAddressId === 'new'"
            :disabled="selectedAddressId !== 'new' || isLoadingAddresses"
            class="m-0 grid min-w-0 gap-4 border-0 p-0"
          >
            <legend class="sr-only">{{ t('checkout.newAddress') }}</legend>
            <label :class="fieldLabelClass">
              <span :class="fieldControlClass">
                <svg :class="fieldIconClass" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5" />
                </svg>
                <input
                  :placeholder="t('checkout.name')"
                  v-model.trim="form.name"
                  required
                  type="text"
                  autocomplete="name"
                  :class="controlClass"
                />
              </span>
            </label>
            <label :class="fieldLabelClass">
              <span :class="fieldControlClass">
                <svg :class="fieldIconClass" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M7 4h3l1.2 4-2.1 1.7a13 13 0 0 0 5.2 5.2l1.7-2.1L20 14v3c0 1.7-1.3 3-3 3C9.8 20 4 14.2 4 7c0-1.7 1.3-3 3-3Z"
                  />
                </svg>
                <span
                  class="border-r border-line pr-[0.7rem] text-base font-bold whitespace-nowrap text-accent"
                  aria-label="Cambodia country code"
                  >+855</span
                >
                <input
                  v-model.trim="form.phone"
                  required
                  type="tel"
                  inputmode="tel"
                  autocomplete="tel-national"
                  :placeholder="t('checkout.phone')"
                  pattern="[0-9][0-9 ]{7,11}"
                  :title="t('checkout.phoneTitle')"
                  :class="controlClass"
                />
              </span>
            </label>
            <label :class="fieldLabelClass">
              {{ t('checkout.cityProvince') }}
              <span :class="fieldControlClass">
                <svg :class="fieldIconClass" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z" />
                  <circle cx="12" cy="10" r="2.2" />
                </svg>
                <select
                  v-model="form.city"
                  required
                  autocomplete="address-level1"
                  :class="[controlClass, 'cursor-pointer max-w-full']"
                >
                  <option disabled value="">{{ t('checkout.selectProvince') }}</option>
                  <option v-for="province in cambodiaProvinces" :key="province" :value="province">
                    {{ province }}
                  </option>
                </select>
              </span>
            </label>
            <label :class="fieldLabelClass">
              {{ t('checkout.address') }}
              <textarea
                v-model.trim="form.address"
                required
                autocomplete="street-address"
                rows="2"
                :placeholder="t('checkout.addressPlaceholder')"
                :class="textareaClass"
              ></textarea>
            </label>
            <label :class="fieldLabelClass">
              {{ t('checkout.deliveryNote') }}
              <textarea
                v-model.trim="form.note"
                rows="2"
                :placeholder="t('checkout.notePlaceholder')"
                :class="textareaClass"
              ></textarea>
            </label>
          </fieldset>
        </section>

        <section class="grid gap-4 border-t-2 border-ink pt-4">
          <p :class="sectionLabelClass">{{ t('checkout.selectDelivery') }}</p>
          <div
            v-if="isLoadingLogistics"
            class="grid gap-3"
            role="status"
            :aria-label="t('checkout.loadingDelivery')"
          >
            <Skeleton class="h-20 w-full" /><Skeleton class="h-20 w-full" />
          </div>
          <CheckoutFeedback
            v-else-if="logisticsError"
            :title="t('checkout.deliveryLoadTitle')"
            :description="logisticsError"
            :action="t('checkout.retryAddresses')"
            @retry="loadLogistics"
          />
          <label v-for="logistic in logistics" v-else :key="logistic.id" :class="optionClass">
            <input
              v-model="selectedLogisticId"
              type="radio"
              name="delivery"
              :value="logistic.id"
              required
              class="m-0 accent-accent"
            />
            <img
              v-if="logistic.image"
              :class="[optionImageClass, 'border border-line']"
              :src="assetUrl(logistic.image)"
              :alt="`${logistic.name} logo`"
              loading="lazy"
            />
            <span class="grid gap-[0.3rem]">
              <strong class="text-[1.15rem] font-semibold text-ink normal-case">{{
                logistic.name
              }}</strong>
              <small class="text-[0.62rem] text-muted normal-case">{{
                logistic.description
              }}</small>
            </span>
            <b class="text-base font-bold text-red-500 max-md:text-[0.62rem]">{{
              formatPrice(logistic.price)
            }}</b>
          </label>
          <Empty v-if="!isLoadingLogistics && !logisticsError && !logistics.length">
            <EmptyTitle>{{ t('checkout.noDeliveryTitle') }}</EmptyTitle>
            <EmptyDescription>{{ t('checkout.noDelivery') }}</EmptyDescription>
            <Button type="button" variant="outline" size="sm" @click="loadLogistics">{{
              t('checkout.retryAddresses')
            }}</Button>
          </Empty>
        </section>

        <section class="grid gap-4 border-t-2 border-ink pt-4">
          <p :class="sectionLabelClass">{{ t('checkout.paymentMethod') }}</p>
          <label :class="optionClass">
            <input checked type="radio" name="payment" value="aba-khqr" class="m-0 accent-accent" />
            <img :class="optionImageClass" :src="abaKhqrLogo" alt="ABA KHQR logo" />
            <span class="grid gap-[0.3rem]">
              <strong class="text-[1.15rem] font-semibold text-ink normal-case">ABA KHQR</strong>
              <small class="text-[0.62rem] text-muted normal-case">{{
                t('checkout.paySecurely')
              }}</small>
            </span>
          </label>
        </section>
      </div>

      <aside class="sticky top-4 grid gap-4 border-t-2 border-ink pt-4 max-md:static">
        <p class="m-0 text-[1rem] font-bold text-muted uppercase">
          {{ t('checkout.orderSummary') }}
        </p>
        <CheckoutFeedback
          v-if="cartError"
          :title="t('checkout.cartLoadTitle')"
          :description="cartError"
          :action="t('checkout.retryAddresses')"
          :busy="isRefreshingCart"
          @retry="refreshCheckoutCart"
        />
        <CheckoutFeedback
          v-if="productsError"
          :title="t('checkout.productsLoadTitle')"
          :description="productsError"
          :action="t('checkout.retryAddresses')"
          :busy="isLoadingProducts"
          @retry="loadProducts"
        />
        <CheckoutFeedback
          v-if="unavailableItems.length"
          :title="t('checkout.checkoutPaused')"
          :description="t('checkout.fixCart')"
        />
        <div class="grid gap-[1.15rem] border-b border-line pb-5">
          <Empty v-if="!cart.length"
            ><EmptyTitle>{{ t('checkout.cartEmpty') }}</EmptyTitle
            ><EmptyDescription>{{ t('checkout.cartEmptyHelp') }}</EmptyDescription
            ><Button as-child variant="outline"
              ><RouterLink to="/products">{{ t('checkout.continueShopping') }}</RouterLink></Button
            ></Empty
          >
          <article
            v-for="item in cart"
            :key="item.variantId"
            :class="[
              'grid min-w-0 grid-cols-[4rem_minmax(0,1fr)_minmax(4.75rem,auto)] items-center gap-[0.65rem] border-t border-line pt-4',
              item.unavailable ? 'bg-[#fff9f7] px-3 pb-3' : '',
            ]"
          >
            <div class="flex h-16 w-16 items-center justify-center overflow-hidden bg-accent-soft">
              <img
                v-if="imageUrl(item)"
                class="h-full w-full object-cover"
                :src="imageUrl(item)"
                :alt="item.productName"
              />
              <span v-else class="text-center text-[0.5rem] text-muted" aria-hidden="true">{{
                t('checkout.noImage')
              }}</span>
            </div>
            <div class="grid min-w-0 gap-[0.25rem]">
              <div class="flex flex-wrap items-center gap-2">
                <strong
                  class="text-[1.1rem] leading-[1.15] font-semibold text-ink [overflow-wrap:anywhere]"
                  >{{ item.productName }}</strong
                >
                <span
                  v-if="item.unavailable"
                  class="bg-danger px-2 py-1 text-[0.52rem] font-bold text-white uppercase"
                  >{{ t('checkout.unavailable') }}</span
                >
              </div>
              <small
                v-if="item.unavailable"
                class="text-[0.68rem] leading-[1.4] text-[#7e271c]"
                role="alert"
              >
                {{ t('checkout.productUnavailable') }}
              </small>
              <label v-if="!item.unavailable" class="text-[1rem] text-muted uppercase">
                <select
                  class="select-chevron mt-2 min-h-8 max-w-full cursor-pointer rounded border border-line bg-paper py-1 pr-7 pl-2 text-[0.88rem] font-semibold text-ink transition-[border-color,background-color] duration-[160ms] focus-visible:border-accent focus-visible:outline-none"
                  :value="item.variantId"
                  @change="changeVariant(item, $event.target.value)"
                >
                  <option
                    v-for="variant in productFor(item)?.variants || [
                      { id: item.variantId, name: item.variantName },
                    ]"
                    :key="variant.id"
                    :value="variant.id"
                    :disabled="!variant.is_active || Number(variant.stock_qty) <= 0"
                  >
                    {{ variant.name }}{{ Number(variant.stock_qty) <= 0 ? ' (out of stock)' : '' }}
                  </option>
                </select>
              </label>
            </div>
            <div class="col-start-2 grid gap-[0.3rem]">
              <div class="flex h-9 w-max items-center border border-line">
                <button
                  class="flex h-full w-8 cursor-pointer items-center justify-center border-0 bg-transparent text-[1.15rem] text-ink enabled:hover:bg-accent-soft enabled:hover:text-accent disabled:cursor-not-allowed disabled:text-line"
                  type="button"
                  aria-label="Decrease quantity"
                  :disabled="item.unavailable || item.quantity <= 1"
                  @click="changeQuantity(item, item.quantity - 1)"
                >
                  −
                </button>
                <span
                  class="min-w-6 text-center text-[0.72rem] font-bold text-ink"
                  aria-live="polite"
                  >{{ item.quantity }}</span
                >
                <button
                  class="flex h-full w-8 cursor-pointer items-center justify-center border-0 bg-transparent text-[1.15rem] text-ink enabled:hover:bg-accent-soft enabled:hover:text-accent disabled:cursor-not-allowed disabled:text-line"
                  type="button"
                  aria-label="Increase quantity"
                  :disabled="
                    item.unavailable ||
                    item.quantity >= Number(variantFor(item)?.stock_qty ?? Infinity)
                  "
                  @click="changeQuantity(item, item.quantity + 1)"
                >
                  +
                </button>
              </div>
            </div>
            <div
              class="col-start-3 row-start-2 grid justify-items-end gap-1 text-right whitespace-nowrap"
            >
              <b
                :class="[
                  'text-base font-bold',
                  item.unavailable ? 'text-muted line-through' : 'text-red-500',
                ]"
                >{{ formatPrice(lineTotal(item)) }}</b
              >
              <span v-if="item.originalPrice" class="text-[0.72rem] text-muted line-through">{{
                formatPrice(item.originalPrice * item.quantity)
              }}</span>
            </div>
          </article>
        </div>
        <div :class="summaryRowClass">
          <span :class="summaryLabelClass">{{ t('checkout.subtotal') }}</span
          ><strong :class="summaryValueClass">{{ formatPrice(subtotal) }}</strong>
        </div>
        <p v-if="unavailableItems.length" class="m-0 text-[0.7rem] leading-[1.4] text-muted">
          {{ t('cart.unavailableExcluded') }}
        </p>
        <div :class="summaryRowClass">
          <span :class="summaryLabelClass">{{ t('checkout.delivery') }}</span
          ><strong :class="summaryValueClass">{{ formatPrice(deliveryFee) }}</strong>
        </div>
        <div :class="[summaryRowClass, 'mt-2 border-t border-line pt-4']">
          <span :class="summaryLabelClass">{{ t('checkout.total') }}</span
          ><strong class="text-base font-bold text-red-500">{{ formatPrice(total) }}</strong>
        </div>
        <CheckoutFeedback
          v-if="errorMessage && !isSubmitted"
          :title="t('checkout.orderErrorTitle')"
          :description="errorMessage"
        />
        <button
          :class="checkoutButtonClass"
          type="submit"
          :disabled="
            !cart.length ||
            !canCheckout ||
            isSubmitting ||
            isLoadingLogistics ||
            isLoadingAddresses ||
            isDeletingAddress ||
            isRefreshingCart ||
            !selectedLogistic
          "
        >
          {{
            isSubmitting
              ? t('checkout.creatingOrder')
              : canCheckout
                ? t('checkout.reviewOrder')
                : t('checkout.fixCartFirst')
          }}
        </button>
      </aside>
    </form>
    <AlertDialog :open="Boolean(addressToDelete)" @update:open="closeDeleteDialog">
      <AlertDialogContent
        @escape-key-down="isDeletingAddress && $event.preventDefault()"
        @close-auto-focus="restoreAddressFocus"
      >
        <AlertDialogTitle class="text-lg font-semibold">{{
          t('checkout.deleteAddressTitle')
        }}</AlertDialogTitle>
        <AlertDialogDescription class="text-sm leading-relaxed text-muted">{{
          t('checkout.deleteAddressDescription')
        }}</AlertDialogDescription>
        <p
          class="m-0 rounded-lg border border-line bg-accent-soft p-3 text-sm text-ink wrap-anywhere"
        >
          {{ addressToDelete?.address }}, {{ addressToDelete?.city }}
        </p>
        <CheckoutFeedback
          v-if="deleteAddressError"
          :title="t('checkout.deleteAddressErrorTitle')"
          :description="deleteAddressError"
        />
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel as-child
            ><Button type="button" variant="outline" :disabled="isDeletingAddress">{{
              t('checkout.cancel')
            }}</Button></AlertDialogCancel
          >
          <Button
            type="button"
            variant="destructive"
            :disabled="isDeletingAddress"
            @click="confirmDeleteAddress"
            >{{
              isDeletingAddress ? t('checkout.deletingAddress') : t('checkout.deleteAddress')
            }}</Button
          >
        </div>
      </AlertDialogContent>
    </AlertDialog>
  </main>
</template>
