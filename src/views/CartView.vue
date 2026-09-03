<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  getCart,
  mergeCartItem,
  removeFromCart,
  updateCartItem,
  updateCartQuantity,
} from '../services/cartService'
import { getProducts } from '../services/productService'
import { assetUrl } from '../services/api'

const cart = ref([])
const products = ref([])
const warnings = ref({})
const refresh = () => (cart.value = getCart())
const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
const subtotal = computed(() =>
  cart.value.reduce((total, item) => total + item.price * item.quantity, 0),
)
const productFor = (item) => products.value.find((product) => product.id === item.productId)
const variantFor = (item) =>
  productFor(item)?.variants?.find((variant) => variant.id === item.variantId)
const imageUrl = (item) => {
  const image = productFor(item)
    ?.images?.slice()
    .sort((a, b) => a.sort_order - b.sort_order)[0]
  return image?.image_path ? assetUrl(`/storage/${image.image_path}`) : assetUrl(item.imageUrl)
}
const setWarning = (variantId, message) =>
  (warnings.value = { ...warnings.value, [variantId]: message })

const changeQuantity = (item, value) => {
  const stock = Number(variantFor(item)?.stock_qty ?? Infinity)
  if (Number(value) > stock) {
    setWarning(item.variantId, `Only ${stock} available.`)
    return
  }
  if (updateCartQuantity(item.variantId, value, stock)) setWarning(item.variantId, '')
}

const changeVariant = (item, variantId) => {
  const variant = productFor(item)?.variants?.find(
    (candidate) => candidate.id === Number(variantId),
  )
  if (!variant || !variant.is_active || Number(variant.stock_qty) <= 0) return
  const existing = cart.value.find((cartItem) => cartItem.variantId === variant.id)
  if (existing && existing.variantId !== item.variantId) {
    const stock = Number(variant.stock_qty)
    if (
      !mergeCartItem(
        item.variantId,
        {
          variantId: variant.id,
          variantName: variant.name,
          price: Number(variant.price),
        },
        stock,
      )
    ) {
      setWarning(item.variantId, `Only ${stock} available for this variant.`)
      return
    }
    refresh()
    return
  }
  updateCartItem(item.variantId, {
    variantId: variant.id,
    variantName: variant.name,
    price: Number(variant.price),
    quantity: Math.min(item.quantity, Number(variant.stock_qty)),
  })
  refresh()
  setWarning(variant.id, '')
}

onMounted(async () => {
  refresh()
  try {
    products.value = await getProducts()
    cart.value.forEach((item) => {
      const stock = Number(variantFor(item)?.stock_qty ?? Infinity)
      if (item.quantity > stock) setWarning(item.variantId, `Only ${stock} available.`)
    })
  } catch {
    products.value = []
  }
  window.addEventListener('cart-updated', refresh)
})
onUnmounted(() => window.removeEventListener('cart-updated', refresh))
</script>

<template>
  <main class="cart-page">
    <RouterLink to="/" class="back-link">← Continue shopping</RouterLink>
    <h1>Your bag</h1>
    <p v-if="!cart.length" class="status">Your bag is empty.</p>
    <section v-else class="cart-layout">
      <div class="cart-items">
        <article v-for="item in cart" :key="item.variantId" class="cart-item">
          <div class="cart-item__image-wrap">
            <img
              v-if="imageUrl(item)"
              :src="imageUrl(item)"
              :alt="item.productName"
              class="cart-item__image"
            />
            <div v-else class="product-card__placeholder">No image</div>
          </div>
          <div class="cart-item__details">
            <h2>{{ item.productName }}</h2>
            <label
              >Size
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
          <strong>{{ formatPrice(item.price) }}</strong>
          <input
            class="quantity-input"
            type="number"
            min="1"
            :max="variantFor(item)?.stock_qty"
            :value="item.quantity"
            aria-label="Quantity"
            @change="changeQuantity(item, $event.target.value)"
          />
          <button class="remove-button" type="button" @click="removeFromCart(item.variantId)">
            Remove
          </button>
          <p v-if="warnings[item.variantId]" class="cart-warning">{{ warnings[item.variantId] }}</p>
        </article>
      </div>
      <aside class="cart-summary">
        <span>Subtotal</span><strong>{{ formatPrice(subtotal) }}</strong>
        <RouterLink to="/checkout" class="checkout-button">Go to checkout</RouterLink>
      </aside>
    </section>
  </main>
</template>
