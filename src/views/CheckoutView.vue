<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../services/api'
import { assetUrl } from '../services/api'
import {
  getCart,
  clearCart,
  mergeCartItem,
  updateCartItem,
  updateCartQuantity,
} from '../services/cartService'
import { createOrder, generateOrderPayment, verifyOrderPayment } from '../services/orderService'
import { getProducts } from '../services/productService'

const cart = ref(getCart())
const refreshCart = () => (cart.value = getCart())
const products = ref([])
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
  if (paymentAction.value === 'rqpay')
    return 'Payment requested. Complete the payment in your banking app.'
  if (paymentAction.value === 'processing-payment')
    return 'Payment is processing. Waiting for confirmation from ABA.'
  if (qrTimeUp.value) return 'This QR has expired. Checking whether your payment completed...'
  return 'Waiting for payment. Confirmation is automatic.'
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
  cart.value.reduce((total, item) => total + Number(item.price) * item.quantity, 0),
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
        { variantId: variant.id, variantName: variant.name, price: Number(variant.price) },
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
    price: Number(variant.price),
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
    logisticsError.value = 'Delivery options could not be loaded. Please try again.'
  } finally {
    isLoadingLogistics.value = false
  }
}

const apiError = (error, fallback) =>
  error.details?.message || error.details?.error || error.message || fallback

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

const submitOrder = async () => {
  refreshCart()
  if (
    !cart.value.length ||
    isSubmitting.value ||
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
    if (!orderId) throw new Error('The order response did not include an order ID.')
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
      errorMessage.value = apiError(
        error,
        'The order was created, but KHQR could not be generated.',
      )
    }
  } catch (error) {
    errorMessage.value = apiError(error, 'Your order could not be created. Please try again.')
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
      paymentWarning.value = 'This QR has expired. Close this dialog to start a new checkout.'
      stopPaymentPolling()
    }
  } catch (error) {
    if (!isSubmitted.value || session !== paymentSession || error.name === 'AbortError') return
    if ([401, 403, 404, 409, 422].includes(error.status)) {
      errorMessage.value = apiError(error, 'Payment status could not be checked.')
      paymentDetails.value = null
      paymentQrImage.value = ''
      stopPaymentPolling()
    } else {
      nextCheckDelay = error.status === 429 ? 30000 : 3000
      errorMessage.value =
        error.status === 429
          ? 'Payment checks are temporarily limited. Retrying shortly.'
          : 'Payment status is temporarily unavailable. We will keep checking automatically.'
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
  try {
    products.value = await getProducts()
  } catch {
    products.value = []
  }
  await loadLogistics()
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
  <main class="checkout-page">
    <RouterLink to="/" class="back-link">← Continue shopping</RouterLink>
    <p class="eyebrow">Checkout</p>
    <h2>Complete your order.</h2>

    <Teleport to="body">
      <div
        v-if="isSubmitted"
        class="payment-modal"
        role="presentation"
        @click.self="closePaymentModal"
      >
        <section
          class="payment-modal__dialog aba-payment-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
        >
          <header class="aba-payment-header">
            <button
              class="aba-payment-back"
              type="button"
              aria-label="Close payment dialog"
              @click="closePaymentModal"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 7-5 5 5 5" /></svg>
            </button>
            <h2 id="payment-modal-title">ABA KHQR</h2>
            <div
              v-if="paymentDetails && !paymentCompleted"
              class="aba-countdown"
              role="timer"
              aria-label="Time left to scan QR"
              aria-live="off"
            >
              <span
                class="aba-countdown-ring"
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
              class="payment-panel payment-panel--complete"
              role="status"
            >
              <div class="payment-success-icon" aria-hidden="true">
                <svg viewBox="0 0 48 48"><path d="m13 24 8 8 15-16" /></svg>
              </div>
              <p class="eyebrow">Payment received</p>
              <h2>Order completed.</h2>
              <p class="payment-description">
                Thank you for shopping with us. Your payment is confirmed and your order is being
                prepared.
              </p>
              <div class="payment-actions">
                <RouterLink to="/" class="checkout-button" @click="closePaymentModal"
                  >Continue shopping</RouterLink
                >
              </div>
            </div>
            <div v-else key="scan" class="payment-panel">
              <div v-if="paymentDetails && !paymentExpired && !qrTimeUp" class="aba-khqr-card">
                <div class="aba-khqr-banner">
                  <img src="/aba-khqr-header.svg" alt="KHQR" width="60" height="14" />
                </div>
                <div class="aba-khqr-recipient">
                  <p v-if="paymentDetails.merchant_name">{{ paymentDetails.merchant_name }}</p>
                  <div>
                    <strong>{{ Number(paymentDetails.amount).toFixed(2) }}</strong
                    ><span>{{ paymentDetails.currency }}</span>
                  </div>
                </div>
                <div class="aba-khqr-code">
                  <img
                    class="aba-khqr-image"
                    :src="paymentQrImage"
                    alt="Scan to pay with KHQR"
                    width="224"
                    height="224"
                  />
                  <img
                    class="aba-khqr-emblem"
                    src="/aba-bakong.svg"
                    alt=""
                    aria-hidden="true"
                    width="32"
                    height="32"
                  />
                </div>
              </div>
              <p v-if="paymentDetails && !paymentExpired && !qrTimeUp" class="aba-scan-description">
                Scan with mobile banking app<br />that supports KHQR
              </p>
              <p v-if="!paymentDetails && !errorMessage" class="payment-description" role="status">
                Preparing your QR code...
              </p>
              <p
                v-if="paymentDetails && !paymentExpired"
                class="aba-auto-status"
                role="status"
                aria-atomic="true"
              >
                {{ paymentStatusMessage }}
              </p>
              <Transition name="payment-step">
                <div
                  v-if="paymentWarning || errorMessage"
                  class="payment-notice"
                  :class="{ 'payment-notice--error': errorMessage }"
                  role="alert"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3 2 21h20L12 3Z" />
                    <path d="M12 9v5m0 3v1" />
                  </svg>
                  <div>
                    <strong>{{
                      errorMessage
                        ? 'Payment unavailable'
                        : paymentExpired
                          ? 'QR expired'
                          : 'Payment not received yet'
                    }}</strong>
                    <p>{{ errorMessage || paymentWarning }}</p>
                    <p v-if="!errorMessage && !paymentExpired">
                      Finish paying in your banking app. Confirmation will appear automatically.
                    </p>
                  </div>
                </div>
              </Transition>
              <div class="payment-actions">
                <a v-if="canOpenAbaApp" :href="paymentDetails.deeplink_url" class="checkout-button">
                  Open ABA Mobile
                </a>
                <button
                  class="checkout-button checkout-button--secondary"
                  type="button"
                  @click="closePaymentModal"
                >
                  Close
                </button>
              </div>
            </div>
          </Transition>
        </section>
      </div>
    </Teleport>

    <form v-if="!isSubmitted" class="checkout-layout" @submit.prevent="submitOrder">
      <div class="checkout-form">
        <section class="checkout-section">
          <p class="checkout-section__label">Contact information</p>
          <label>
            Name
            <span class="field-control">
              <svg class="field-control__icon" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5" />
              </svg>
              <input v-model.trim="form.name" required type="text" autocomplete="name" />
            </span>
          </label>
          <label>
            Phone
            <span class="field-control">
              <svg class="field-control__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M7 4h3l1.2 4-2.1 1.7a13 13 0 0 0 5.2 5.2l1.7-2.1L20 14v3c0 1.7-1.3 3-3 3C9.8 20 4 14.2 4 7c0-1.7 1.3-3 3-3Z"
                />
              </svg>
              <span class="phone-field__prefix" aria-label="Cambodia country code">+855</span>
              <input
                v-model.trim="form.phone"
                required
                type="tel"
                inputmode="tel"
                autocomplete="tel-national"
                placeholder="12 345 678"
                pattern="[0-9][0-9 ]{7,11}"
                title="Enter a Cambodian phone number without +855"
              />
            </span>
          </label>
          <label>
            City / province (required)
            <span class="field-control">
              <svg class="field-control__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z" />
                <circle cx="12" cy="10" r="2.2" />
              </svg>
              <select v-model="form.city" required autocomplete="address-level1">
                <option disabled value="">Select province</option>
                <option v-for="province in cambodiaProvinces" :key="province" :value="province">
                  {{ province }}
                </option>
              </select>
            </span>
          </label>
          <label>
            Address (required)
            <textarea
              v-model.trim="form.address"
              required
              autocomplete="street-address"
              rows="2"
              placeholder="House number, street, village or district"
            ></textarea>
          </label>
          <label>
            Delivery note (optional)
            <textarea
              v-model.trim="form.note"
              rows="2"
              placeholder="Landmark or delivery instructions"
            ></textarea>
          </label>
        </section>

        <section class="checkout-section">
          <p class="checkout-section__label">Select delivery</p>
          <p v-if="isLoadingLogistics" class="status" role="status">Loading delivery options...</p>
          <p v-else-if="logisticsError" class="status status--error">{{ logisticsError }}</p>
          <label v-for="logistic in logistics" v-else :key="logistic.id" class="delivery-option">
            <input
              v-model="selectedLogisticId"
              type="radio"
              name="delivery"
              :value="logistic.id"
              required
            />
            <img
              v-if="logistic.image"
              class="delivery-option__image"
              :src="assetUrl(logistic.image)"
              :alt="`${logistic.name} logo`"
              loading="lazy"
            />
            <span>
              <strong>{{ logistic.name }}</strong>
              <small>{{ logistic.description }}</small>
            </span>
            <b>{{ formatPrice(logistic.price) }}</b>
          </label>
          <p v-if="!isLoadingLogistics && !logisticsError && !logistics.length" class="status">
            No delivery options are available.
          </p>
        </section>

        <section class="checkout-section">
          <p class="checkout-section__label">Payment method</p>
          <label class="payment-option">
            <input checked type="radio" name="payment" value="aba-khqr" />
            <img class="payment-option__image" :src="abaKhqrLogo" alt="ABA KHQR logo" />
            <span><strong>ABA KHQR</strong><small>Pay securely with ABA Mobile</small></span>
          </label>
        </section>
      </div>

      <aside class="checkout-summary">
        <p class="checkout-section__label">Order summary</p>
        <div class="checkout-items">
          <p v-if="!cart.length" class="checkout-items__empty">Your cart is empty.</p>
          <article v-for="item in cart" :key="item.variantId" class="checkout-item">
            <div class="checkout-item__image">
              <img v-if="imageUrl(item)" :src="imageUrl(item)" :alt="item.productName" />
              <span v-else aria-hidden="true">No image</span>
            </div>
            <div class="checkout-item__details">
              <strong>{{ item.productName }}</strong>
              <label>
                Size
                <select :value="item.variantId" @change="changeVariant(item, $event.target.value)">
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
            <div class="checkout-item__quantity">
              <div class="quantity-stepper">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  :disabled="item.quantity <= 1"
                  @click="changeQuantity(item, item.quantity - 1)"
                >
                  −
                </button>
                <span aria-live="polite">{{ item.quantity }}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  :disabled="item.quantity >= Number(variantFor(item)?.stock_qty ?? Infinity)"
                  @click="changeQuantity(item, item.quantity + 1)"
                >
                  +
                </button>
              </div>
            </div>
            <b>{{ formatPrice(lineTotal(item)) }}</b>
          </article>
        </div>
        <div>
          <span>Subtotal</span><strong>{{ formatPrice(subtotal) }}</strong>
        </div>
        <div>
          <span>Delivery</span><strong>{{ formatPrice(deliveryFee) }}</strong>
        </div>
        <div class="checkout-summary__total">
          <span>Total</span><strong>{{ formatPrice(total) }}</strong>
        </div>
        <p v-if="errorMessage" class="status status--error" role="alert">{{ errorMessage }}</p>
        <button
          class="checkout-button"
          type="submit"
          :disabled="!cart.length || isSubmitting || isLoadingLogistics || !selectedLogistic"
        >
          {{ isSubmitting ? 'Creating order...' : 'Review order' }}
        </button>
      </aside>
    </form>
  </main>
</template>
