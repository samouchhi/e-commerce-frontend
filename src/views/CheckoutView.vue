<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
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
import OrderCompleteDialog from '../components/checkout/OrderCompleteDialog.vue'
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

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../components/ui/dialog.js'
import {
  FieldSet,
  FieldLegend,
  FieldGroup,
  Field,
  FieldLabel,
  FieldError,
  Separator,
} from '../components/ui/field.js'
import {
  Input,
  Textarea,
  NativeSelect,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '../components/ui/input.js'

const checkoutPageClass = 'mx-auto max-w-[1200px] px-5 pt-8 pb-14 sm:px-8 lg:px-12'
const sectionLabelClass = 'm-0 text-lg font-semibold tracking-tight text-ink'
const optionClass =
  'grid min-h-20 cursor-pointer grid-cols-[auto_2.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-accent-soft/70 p-4 ring-1 ring-transparent transition-[background-color,box-shadow] duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:bg-accent-soft has-[:checked]:bg-paper has-[:checked]:ring-ink/70'
const optionImageClass = 'h-10 w-11 object-contain'
const summaryRowClass = 'flex items-center justify-between gap-3'
const summaryLabelClass = 'text-sm text-muted'
const summaryValueClass = 'text-base font-semibold text-sale'
const openBag = () => window.dispatchEvent(new Event('shopping-bag-open'))
const failedImages = ref(new Set())
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
const addressesLoaded = ref(false)
const addressPickerOpen = ref(false)
const pendingAddressId = ref('new')
const fieldErrors = ref({})
const addressFields = ['name', 'phone', 'city', 'address', 'note']
const clearFieldError = (field) => {
  delete fieldErrors.value[field]
}
const focusNewAddress = async () => {
  await nextTick()
  document.getElementById('checkout-name')?.focus()
}
const openAddressPicker = () => {
  pendingAddressId.value = selectedAddressId.value
  addressPickerOpen.value = true
}
const applyAddressSelection = () => {
  selectAddress(pendingAddressId.value)
  addressPickerOpen.value = false
}
const restorePickerFocus = (event) => {
  event.preventDefault()
  document
    .getElementById(selectedAddressId.value === 'new' ? 'checkout-name' : 'change-delivery-address')
    ?.focus()
}
const useNewAddress = async () => {
  if (isSubmitting.value || isDeletingAddress.value) return
  selectAddress('new')
  await focusNewAddress()
}
const focusAddressError = async () => {
  if (selectedAddressId.value !== 'new') {
    newAddressDraft.value = { ...form.value }
    selectedAddressId.value = 'new'
  }
  await nextTick()
  document
    .getElementById(`checkout-${addressFields.find((field) => fieldErrors.value[field])}`)
    ?.focus()
}
const validateAddress = () => {
  const errors = {}
  for (const field of addressFields) {
    const value = form.value[field].trim()
    const limit = field === 'note' ? 1000 : field === 'phone' ? 30 : 255
    if (field !== 'note' && !value)
      errors[field] = t(`checkout.invalid${field[0].toUpperCase()}${field.slice(1)}`)
    else if (value.length > limit)
      errors[field] = t('checkout.fieldTooLong').replace('{limit}', limit)
  }
  if (
    selectedAddressId.value === 'new' &&
    form.value.phone &&
    !/^[0-9][0-9 ]{7,11}$/.test(form.value.phone)
  )
    errors.phone = t('checkout.invalidPhone')
  fieldErrors.value = errors
  return !Object.keys(errors).length
}

const selectedAddressId = ref('new')
const selectedAddress = computed(() =>
  addresses.value.find((item) => String(item.id) === selectedAddressId.value),
)
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
    if (pendingAddressId.value === String(id))
      pendingAddressId.value = String(addresses.value[0]?.id ?? 'new')
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
  fieldErrors.value = {}
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
    const current = result.find((item) => String(item.id) === selectedAddressId.value)
    if (current) selectAddress(selectedAddressId.value)
    else if (!addressesLoaded.value && !Object.values(form.value).some((value) => value.trim()))
      selectAddress(result.length ? String(result[0].id) : 'new')
    else selectAddress('new')
  } catch {
    if (checkoutUnmounted) return
    selectAddress('new')
    addresses.value = []
    addressesError.value = t('checkout.addressLoadError')
  } finally {
    addressesLoaded.value = true
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

const restoreCheckoutFocus = (event) => {
  event.preventDefault()
  const button = document.getElementById('checkout-payment-button')
  const target =
    button && !button.disabled ? button : document.querySelector('[aria-controls="bag-drawer"]')
  target?.focus()
}

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
  if (isSubmitting.value || isLoadingAddresses.value || isDeletingAddress.value) return
  errorMessage.value = ''
  if (!validateAddress()) {
    await focusAddressError()
    return
  }
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
    if (checkoutUnmounted) return
    const errors = error.status === 422 ? error.details?.errors : null
    for (const field of addressFields)
      if (errors?.[field])
        fieldErrors.value[field] = t(`checkout.invalid${field[0].toUpperCase()}${field.slice(1)}`)
    if (Object.keys(fieldErrors.value).length) {
      errorMessage.value = t('checkout.checkAddress')
      isSubmitting.value = false
      await focusAddressError()
    } else errorMessage.value = apiError(error, t('checkout.orderCreateError'))
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
    <div class="mb-9 flex flex-wrap items-end justify-between gap-4">
      <div class="grid gap-4">
        <Button type="button" variant="ghost" size="sm" class="w-fit gap-2 px-0" @click="openBag"
          ><svg
            data-icon="inline-start"
            class="fill-none stroke-current stroke-[1.5]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M19 12H5m6 6-6-6 6-6" /></svg
          >{{ t('checkout.backToBag') }}
        </Button>
        <h1
          class="m-0 text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-tight tracking-tight text-ink"
        >
          {{ t('checkout.title') }}
        </h1>
      </div>
    </div>

    <OrderCompleteDialog
      :open="isSubmitted && paymentCompleted"
      :order-number="order?.order_number || `#${orderIdFrom(order)}`"
      :amount="formatPrice(paymentDetails?.amount ?? order?.total_amount ?? total)"
      @close="closePaymentModal"
      @close-auto-focus="restoreCheckoutFocus"
    />
    <Teleport to="body">
      <div
        v-if="isSubmitted && !paymentCompleted"
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
            <div key="scan" class="pt-4 text-center">
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
      class="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-12"
      novalidate
      :aria-busy="isSubmitting"
      @submit.prevent="submitOrder"
    >
      <div class="rounded-[28px] bg-accent-soft/70 p-1.5">
        <div class="grid gap-7 rounded-[22px] bg-paper p-5 sm:p-7">
          <section class="grid min-w-0 gap-5" aria-labelledby="delivery-address-title">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span
                  class="flex size-8 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-muted"
                  aria-hidden="true"
                  >01</span
                >
                <h2 id="delivery-address-title" :class="sectionLabelClass">
                  {{ t('checkout.deliveryAddress') }}
                </h2>
              </div>
              <Button
                v-if="addresses.length && !isLoadingAddresses"
                id="change-delivery-address"
                variant="ghost"
                type="button"
                size="sm"
                :disabled="isSubmitting || isDeletingAddress"
                @click="openAddressPicker"
                >{{ t('checkout.changeAddress')
                }}<svg
                  data-icon="inline-end"
                  class="fill-none stroke-current stroke-[1.5]"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="m9 5 7 7-7 7" /></svg
              ></Button>
            </div>
            <div
              v-if="isLoadingAddresses"
              class="grid gap-3"
              role="status"
              :aria-label="t('checkout.loadingAddresses')"
            >
              <Skeleton class="h-6 w-1/3" /><Skeleton class="h-16 w-full" />
            </div>
            <CheckoutFeedback
              v-else-if="addressesError"
              :title="t('checkout.addressLoadTitle')"
              :description="addressesError"
              :action="t('checkout.retryAddresses')"
              @retry="loadAddresses"
            />
            <div v-if="selectedAddress && !isLoadingAddresses" class="grid gap-5">
              <div class="flex items-start gap-4">
                <span
                  class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft"
                  ><svg
                    class="size-5 fill-none stroke-ink stroke-[1.5]"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z" />
                    <circle cx="12" cy="10" r="2.2" /></svg
                ></span>
                <div class="grid min-w-0 gap-1 wrap-anywhere">
                  <strong class="text-base font-semibold">{{ selectedAddress.name }}</strong
                  ><span class="text-sm text-muted">{{ selectedAddress.phone }}</span>
                  <p class="mt-2 mb-0 text-base leading-relaxed">
                    {{ selectedAddress.address }}, {{ selectedAddress.city }}
                  </p>
                  <p v-if="selectedAddress.note" class="m-0 text-sm text-muted">
                    {{ selectedAddress.note }}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                type="button"
                class="w-fit rounded-full"
                :disabled="isSubmitting || isDeletingAddress"
                @click="useNewAddress"
                ><svg
                  data-icon="inline-start"
                  class="fill-none stroke-current stroke-[1.5]"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12h14" /></svg
                >{{ t('checkout.addAddress') }}</Button
              >
            </div>
            <FieldSet
              v-show="selectedAddressId === 'new'"
              :disabled="selectedAddressId !== 'new' || isLoadingAddresses || isSubmitting"
            >
              <FieldLegend class="sr-only">{{ t('checkout.newAddress') }}</FieldLegend>
              <FieldGroup class="sm:grid-cols-2">
                <Field :data-invalid="Boolean(fieldErrors.name)">
                  <FieldLabel for="checkout-name">{{ t('checkout.name') }} </FieldLabel>
                  <Input
                    id="checkout-name"
                    v-model="form.name"
                    autocomplete="name"
                    :aria-invalid="Boolean(fieldErrors.name)"
                    :aria-describedby="fieldErrors.name ? 'checkout-name-error' : undefined"
                    @input="clearFieldError('name')"
                    required
                    type="text"
                    maxlength="255"
                  />
                  <FieldError v-if="fieldErrors.name" id="checkout-name-error">{{
                    fieldErrors.name
                  }}</FieldError>
                </Field>
                <Field :data-invalid="Boolean(fieldErrors.phone)">
                  <FieldLabel for="checkout-phone">{{ t('checkout.phone') }} </FieldLabel>
                  <span id="checkout-phone-hint" class="sr-only">{{
                    t('checkout.phoneTitle')
                  }}</span
                  ><InputGroup
                    ><InputGroupAddon aria-hidden="true">+855</InputGroupAddon
                    ><InputGroupInput
                      id="checkout-phone"
                      v-model="form.phone"
                      autocomplete="tel-national"
                      :aria-invalid="Boolean(fieldErrors.phone)"
                      :aria-describedby="
                        fieldErrors.phone
                          ? 'checkout-phone-hint checkout-phone-error'
                          : 'checkout-phone-hint'
                      "
                      @input="clearFieldError('phone')"
                      required
                      type="tel"
                      inputmode="tel"
                      maxlength="30"
                      :placeholder="t('checkout.phoneExample')"
                  /></InputGroup>
                  <FieldError v-if="fieldErrors.phone" id="checkout-phone-error">{{
                    fieldErrors.phone
                  }}</FieldError>
                </Field>
                <Field :data-invalid="Boolean(fieldErrors.city)" class="sm:col-span-2">
                  <FieldLabel for="checkout-city">{{ t('checkout.cityProvince') }} </FieldLabel>
                  <NativeSelect
                    id="checkout-city"
                    v-model="form.city"
                    autocomplete="address-level1"
                    :aria-invalid="Boolean(fieldErrors.city)"
                    :aria-describedby="fieldErrors.city ? 'checkout-city-error' : undefined"
                    @input="clearFieldError('city')"
                    required
                    ><option disabled value="">{{ t('checkout.selectProvince') }}</option>
                    <option v-for="province in cambodiaProvinces" :key="province" :value="province">
                      {{ province }}
                    </option></NativeSelect
                  >
                  <FieldError v-if="fieldErrors.city" id="checkout-city-error">{{
                    fieldErrors.city
                  }}</FieldError>
                </Field>
                <Field :data-invalid="Boolean(fieldErrors.address)" class="sm:col-span-2">
                  <FieldLabel for="checkout-address">{{ t('checkout.address') }} </FieldLabel>
                  <Textarea
                    id="checkout-address"
                    v-model="form.address"
                    autocomplete="street-address"
                    :aria-invalid="Boolean(fieldErrors.address)"
                    :aria-describedby="fieldErrors.address ? 'checkout-address-error' : undefined"
                    @input="clearFieldError('address')"
                    required
                    maxlength="255"
                    rows="2"
                    :placeholder="t('checkout.addressPlaceholder')"
                  />
                  <FieldError v-if="fieldErrors.address" id="checkout-address-error">{{
                    fieldErrors.address
                  }}</FieldError>
                </Field>
                <Field :data-invalid="Boolean(fieldErrors.note)" class="sm:col-span-2">
                  <FieldLabel for="checkout-note"
                    >{{ t('checkout.deliveryNote') }}
                    <span class="font-normal text-muted"
                      >({{ t('checkout.optional') }})</span
                    ></FieldLabel
                  >
                  <Textarea
                    id="checkout-note"
                    v-model="form.note"
                    autocomplete="off"
                    :aria-invalid="Boolean(fieldErrors.note)"
                    :aria-describedby="fieldErrors.note ? 'checkout-note-error' : undefined"
                    @input="clearFieldError('note')"
                    maxlength="1000"
                    rows="2"
                    :placeholder="t('checkout.notePlaceholder')"
                  />
                  <FieldError v-if="fieldErrors.note" id="checkout-note-error">{{
                    fieldErrors.note
                  }}</FieldError>
                </Field>
              </FieldGroup>
            </FieldSet>
          </section>
          <Separator />
          <section class="grid min-w-0 gap-5">
            <div class="flex items-center gap-3">
              <span
                class="flex size-8 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-muted"
                aria-hidden="true"
                >02</span
              >
              <h2 :class="sectionLabelClass">{{ t('checkout.selectDelivery') }}</h2>
            </div>
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
              <span class="flex size-11 items-center justify-center"
                ><img
                  v-if="logistic.image && !failedImages.has(`logistic-${logistic.id}`)"
                  @error="failedImages.add(`logistic-${logistic.id}`)"
                  :class="optionImageClass"
                  :src="assetUrl(logistic.image)"
                  alt=""
                  loading="lazy" /><svg
                  v-else
                  class="size-6 fill-none stroke-muted stroke-[1.5]"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M3 6h11v11H3zM14 10h4l3 4v3h-7" />
                  <circle cx="7" cy="18" r="2" />
                  <circle cx="18" cy="18" r="2" /></svg
              ></span>
              <span class="grid gap-[0.3rem]">
                <strong class="text-base font-semibold text-ink">{{ logistic.name }}</strong>
                <small
                  v-if="logistic.description && logistic.description !== 'null'"
                  class="text-sm leading-relaxed text-muted"
                  >{{ logistic.description }}</small
                >
              </span>
              <b class="text-sm font-semibold text-sale">{{ formatPrice(logistic.price) }}</b>
            </label>
            <Empty v-if="!isLoadingLogistics && !logisticsError && !logistics.length">
              <EmptyTitle>{{ t('checkout.noDeliveryTitle') }}</EmptyTitle>
              <EmptyDescription>{{ t('checkout.noDelivery') }}</EmptyDescription>
              <Button type="button" variant="outline" size="sm" @click="loadLogistics">{{
                t('checkout.retryAddresses')
              }}</Button>
            </Empty>
          </section>

          <Separator />
          <section class="grid min-w-0 gap-5">
            <div class="flex items-center gap-3">
              <span
                class="flex size-8 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-muted"
                aria-hidden="true"
                >03</span
              >
              <h2 :class="sectionLabelClass">{{ t('checkout.paymentMethod') }}</h2>
            </div>
            <label :class="optionClass">
              <input
                checked
                type="radio"
                name="payment"
                value="aba-khqr"
                class="m-0 accent-accent"
              />
              <img :class="optionImageClass" :src="abaKhqrLogo" alt="ABA KHQR logo" />
              <span class="grid gap-[0.3rem]">
                <strong class="text-base font-semibold text-ink">ABA KHQR</strong>
                <small class="text-sm leading-relaxed text-muted">{{
                  t('checkout.paySecurely')
                }}</small>
              </span>
            </label>
          </section>
        </div>
      </div>
      <aside
        class="grid min-w-0 gap-5 rounded-[24px] bg-paper p-5 ring-1 ring-ink/6 shadow-[0_12px_48px_rgb(0_0_0/5%)] sm:p-7 lg:sticky lg:top-24"
      >
        <h2 class="m-0 text-xl font-semibold tracking-tight text-ink">
          {{ t('checkout.orderSummary') }}
        </h2>
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
        <div class="grid gap-5">
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
              'grid min-w-0 grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-3 pt-1',
              item.unavailable ? 'bg-[#fff9f7] px-3 pb-3' : '',
            ]"
          >
            <div
              class="flex size-20 items-center justify-center overflow-hidden rounded-2xl bg-accent-soft"
            >
              <img
                v-if="imageUrl(item) && !failedImages.has(`item-${item.variantId}`)"
                @error="failedImages.add(`item-${item.variantId}`)"
                class="h-full w-full object-contain"
                :src="imageUrl(item)"
                :alt="item.productName"
              />
              <span v-else class="px-2 text-center text-xs text-muted" aria-hidden="true">{{
                t('checkout.noImage')
              }}</span>
            </div>
            <div class="grid min-w-0 gap-[0.25rem]">
              <div class="flex flex-wrap items-center gap-2">
                <strong
                  class="text-base leading-snug font-semibold text-ink [overflow-wrap:anywhere]"
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
                  class="select-chevron mt-2 min-h-11 max-w-full cursor-pointer rounded-xl bg-accent-soft py-2 pr-8 pl-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  :aria-label="`${t('checkout.productOption')}: ${item.productName}`"
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
                    {{ variant.name
                    }}{{ Number(variant.stock_qty) <= 0 ? ` (${t('cart.outOfStock')})` : '' }}
                  </option>
                </select>
              </label>
            </div>
            <div class="col-start-2 grid gap-1">
              <div class="flex h-11 w-max items-center rounded-full bg-accent-soft">
                <button
                  class="flex h-full w-11 cursor-pointer items-center justify-center border-0 bg-transparent text-[1.15rem] text-ink enabled:hover:bg-accent-soft enabled:hover:text-accent disabled:cursor-not-allowed disabled:text-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  type="button"
                  :aria-label="t('cart.decreaseQuantity')"
                  :disabled="item.unavailable || item.quantity <= 1"
                  @click="changeQuantity(item, item.quantity - 1)"
                >
                  −
                </button>
                <span
                  class="min-w-6 text-center text-sm font-semibold text-ink"
                  aria-live="polite"
                  >{{ item.quantity }}</span
                >
                <button
                  class="flex h-full w-11 cursor-pointer items-center justify-center border-0 bg-transparent text-[1.15rem] text-ink enabled:hover:bg-accent-soft enabled:hover:text-accent disabled:cursor-not-allowed disabled:text-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  type="button"
                  :aria-label="t('cart.increaseQuantity')"
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
                  item.unavailable ? 'text-muted line-through' : 'text-sale',
                ]"
                >{{ formatPrice(lineTotal(item)) }}</b
              >
              <span v-if="item.originalPrice" class="text-[0.72rem] text-muted line-through">{{
                formatPrice(item.originalPrice * item.quantity)
              }}</span>
            </div>
          </article>
        </div>
        <Separator />
        <div :class="summaryRowClass">
          <span :class="summaryLabelClass">{{ t('checkout.subtotal') }}</span
          ><strong :class="summaryValueClass">{{ formatPrice(subtotal) }}</strong>
        </div>
        <p v-if="unavailableItems.length" class="m-0 text-sm leading-relaxed text-muted">
          {{ t('cart.unavailableExcluded') }}
        </p>
        <div :class="summaryRowClass">
          <span :class="summaryLabelClass">{{ t('checkout.delivery') }}</span
          ><strong :class="summaryValueClass">{{ formatPrice(deliveryFee) }}</strong>
        </div>
        <div :class="[summaryRowClass, 'mt-1 pt-2']">
          <span :class="summaryLabelClass">{{ t('checkout.total') }}</span
          ><strong class="text-2xl font-semibold text-sale">{{ formatPrice(total) }}</strong>
        </div>
        <CheckoutFeedback
          v-if="errorMessage && !isSubmitted"
          :title="t('checkout.orderErrorTitle')"
          :description="errorMessage"
        />
        <Button
          id="checkout-payment-button"
          size="lg"
          class="group mt-1 h-auto min-h-14 w-full justify-between rounded-full py-2 pr-2 pl-6 whitespace-normal text-left"
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
                ? t('checkout.continuePayment')
                : t('checkout.fixCartFirst')
          }}
          <span
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15"
            aria-hidden="true"
            ><svg
              data-icon="inline-end"
              class="fill-none stroke-current stroke-[1.5] transition-transform duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:translate-x-0.5"
              viewBox="0 0 24 24"
            >
              <path d="M5 12h14m-6-6 6 6-6 6" /></svg
          ></span>
        </Button>
      </aside>
    </form>
    <Dialog v-model:open="addressPickerOpen">
      <DialogContent @close-auto-focus="restorePickerFocus">
        <div class="flex items-start justify-between gap-4">
          <div class="grid gap-2">
            <DialogTitle class="m-0 text-2xl font-semibold tracking-tight">{{
              t('checkout.chooseAddress')
            }}</DialogTitle
            ><DialogDescription class="m-0 text-sm leading-relaxed text-muted">{{
              t('checkout.chooseAddressHelp')
            }}</DialogDescription>
          </div>
          <DialogClose as-child
            ><Button
              variant="ghost"
              size="icon"
              type="button"
              class="size-11 shrink-0 rounded-full"
              :aria-label="t('checkout.close')"
              ><svg
                class="fill-none stroke-current stroke-[1.5]"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="m6 6 12 12M6 18 18 6" /></svg></Button
          ></DialogClose>
        </div>
        <FieldSet>
          <FieldLegend class="sr-only">{{ t('checkout.chooseAddress') }}</FieldLegend>
          <RadioGroup
            v-model="pendingAddressId"
            :disabled="isDeletingAddress"
            :aria-label="t('checkout.chooseAddress')"
            class="gap-3"
          >
            <div
              v-for="address in addresses"
              :key="address.id"
              class="flex min-w-0 items-start gap-2 rounded-2xl bg-accent-soft/70 p-4 ring-1 ring-transparent transition-[background-color,box-shadow] duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none has-[[data-state=checked]]:bg-paper has-[[data-state=checked]]:ring-ink/70"
            >
              <label
                :for="`saved-address-${address.id}`"
                class="flex min-w-0 flex-1 cursor-pointer items-start gap-3"
                ><RadioGroupItem
                  :id="`saved-address-${address.id}`"
                  :value="String(address.id)"
                  class="mt-1 size-5"
                /><span class="grid min-w-0 gap-1 wrap-anywhere"
                  ><strong class="text-base font-semibold">{{ address.name }}</strong
                  ><span class="text-sm text-muted">{{ address.phone }}</span
                  ><span class="mt-1 text-sm leading-relaxed"
                    >{{ address.address }}, {{ address.city }}</span
                  ></span
                ></label
              >
              <Button
                :id="`delete-address-${address.id}`"
                type="button"
                variant="ghost"
                size="icon"
                class="size-11 shrink-0 rounded-full"
                :aria-label="`${t('checkout.deleteAddress')}: ${address.name}`"
                :disabled="isDeletingAddress"
                @click="requestDeleteAddress(address)"
                ><svg
                  class="fill-none stroke-current stroke-[1.5]"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6m4-6v6" /></svg
              ></Button>
            </div>
            <label
              for="new-delivery-address"
              class="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl bg-accent-soft/70 p-4 ring-1 ring-transparent has-[[data-state=checked]]:bg-paper has-[[data-state=checked]]:ring-ink/70"
              ><RadioGroupItem id="new-delivery-address" value="new" class="size-5" /><span
                class="text-sm font-semibold"
                >{{ t('checkout.newAddress') }}</span
              ><svg
                class="ml-auto size-5 fill-none stroke-muted stroke-[1.5]"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" /></svg
            ></label>
          </RadioGroup>
        </FieldSet>
        <Button
          type="button"
          size="lg"
          class="rounded-full"
          :disabled="isDeletingAddress"
          @click="applyAddressSelection"
          >{{
            pendingAddressId === 'new' ? t('checkout.addAddress') : t('checkout.useAddress')
          }}</Button
        >
      </DialogContent>
    </Dialog>
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
            ><Button
              type="button"
              variant="outline"
              class="rounded-full"
              :disabled="isDeletingAddress"
              >{{ t('checkout.cancel') }}</Button
            ></AlertDialogCancel
          >
          <Button
            type="button"
            variant="destructive"
            class="rounded-full"
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
