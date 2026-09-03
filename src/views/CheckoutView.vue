<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../services/api'
import { getCart, mergeCartItem, updateCartItem, updateCartQuantity } from '../services/cartService'
import { getProducts } from '../services/productService'

const cart = ref(getCart())
const products = ref([])
const logistics = ref([])
const selectedLogisticId = ref('')
const isLoadingLogistics = ref(true)
const logisticsError = ref('')
const isSubmitted = ref(false)
const form = ref({ name: '', phone: '', address: '' })
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
  return image?.image_path ? `/storage/${image.image_path}` : item.imageUrl || ''
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

const submitOrder = () => {
  isSubmitted.value = true
}

onMounted(async () => {
  try {
    products.value = await getProducts()
  } catch {
    products.value = []
  }
  await loadLogistics()
})
</script>

<template>
  <main class="checkout-page">
    <RouterLink to="/" class="back-link">← Continue shopping</RouterLink>
    <p class="eyebrow">Checkout</p>
    <h2>Complete your order.</h2>

    <div v-if="isSubmitted" class="checkout-success" role="status">
      <p class="eyebrow">Order details received</p>
      <h2>Thanks, {{ form.name }}.</h2>
      <p>We will contact you at +855 {{ form.phone }} to confirm delivery and ABA KHQR payment.</p>
      <RouterLink to="/" class="checkout-button">Back to shop</RouterLink>
    </div>

    <form v-else class="checkout-layout" @submit.prevent="submitOrder">
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
            Address
            <span class="field-control">
              <svg class="field-control__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z" />
                <circle cx="12" cy="10" r="2.2" />
              </svg>
              <select v-model="form.address" required>
                <option disabled value="">Select province</option>
                <option v-for="province in cambodiaProvinces" :key="province" :value="province">
                  {{ province }}
                </option>
              </select>
            </span>
          </label>
        </section>

        <section class="checkout-section">
          <p class="checkout-section__label">Select delivery</p>
          <p v-if="isLoadingLogistics" class="status"></p>
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
              :src="logistic.image"
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
        <button
          class="checkout-button"
          type="submit"
          :disabled="isLoadingLogistics || !logistics.length"
        >
          Review order
        </button>
      </aside>
    </form>
  </main>
</template>
