<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  getCart,
  mergeCartItem,
  removeFromCart,
  resolveCart,
  updateCartItem,
  updateCartQuantity,
} from '../services/cartService'
import { getProducts } from '../services/productService'
import { assetUrl } from '../services/api'

const placeholderClass =
  'flex h-full items-center justify-center text-[0.7rem] text-muted uppercase'

const cart = ref([])
const products = ref([])
const warnings = ref({})
const itemPendingRemoval = ref(null)
const refresh = () => (cart.value = getCart())
const canCheckout = computed(() => cart.value.every((item) => !item.unavailable))
const unavailableItems = computed(() => cart.value.filter((item) => item.unavailable))
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
const requestRemoval = (item) => (itemPendingRemoval.value = item)
const confirmRemoval = () => {
  if (!itemPendingRemoval.value) return
  removeFromCart(itemPendingRemoval.value.variantId)
  itemPendingRemoval.value = null
}

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
          price: Number(variant.discounted_price ?? variant.price),
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
    price: Number(variant.discounted_price ?? variant.price),
    quantity: Math.min(item.quantity, Number(variant.stock_qty)),
  })
  refresh()
  setWarning(variant.id, '')
}

onMounted(async () => {
  refresh()
  try {
    await resolveCart()
    refresh()
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
  <main class="mx-auto max-w-[1100px] px-[clamp(1.25rem,4vw,4.5rem)] pt-4 pb-10">
    <RouterLink to="/" class="back-link">← Continue shopping</RouterLink>
    <h1 class="text-[clamp(1.6rem,3vw,2.25rem)]">Your bag</h1>
    <section
      v-if="unavailableItems.length"
      class="mt-6 grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-l-4 border-danger bg-[#fff0ec] p-4 text-[#7e271c]"
      role="alert"
    >
      <svg class="mt-0.5 h-5 w-5 shrink-0 fill-none stroke-current stroke-[2]" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 8v5m0 4v.01M10.3 3.8 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
      </svg>
      <div class="grid gap-1">
        <strong class="text-[0.78rem] font-bold uppercase">Checkout is paused</strong>
        <p class="m-0 text-[0.85rem] leading-[1.45]">
          {{ unavailableItems.length }} item{{ unavailableItems.length === 1 ? '' : 's' }} need{{ unavailableItems.length === 1 ? 's' : '' }} to be removed before you can continue.
        </p>
      </div>
    </section>
    <p v-if="!cart.length" class="col-span-full py-8 text-[0.9rem] text-muted">
      Your bag is empty.
    </p>
    <section v-else class="grid grid-cols-[minmax(0,1fr)_280px] gap-8 max-md:grid-cols-1">
      <div class="border-t border-line">
        <article
          v-for="item in cart"
          :key="item.variantId"
          :class="[
            'grid grid-cols-[5rem_minmax(0,1fr)_auto_5rem_auto] items-center gap-4 border-b border-line py-5 max-md:grid-cols-[4rem_minmax(0,1fr)_auto]',
            item.unavailable ? 'bg-[#fff9f7] px-3 max-md:px-2' : '',
          ]"
        >
          <div class="aspect-square overflow-hidden bg-accent-soft max-md:row-span-2">
            <img
              v-if="imageUrl(item)"
              :src="imageUrl(item)"
              :alt="item.productName"
              class="h-full w-full object-cover"
            />
            <div v-else :class="placeholderClass">No image</div>
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-[1.3rem] font-semibold text-ink">{{ item.productName }}</h2>
              <span v-if="item.unavailable" class="bg-danger px-2 py-1 text-[0.58rem] font-bold tracking-[0.08em] text-white uppercase">Unavailable</span>
            </div>
            <p v-if="item.unavailable" class="mt-2 text-[0.78rem] leading-[1.4] text-[#7e271c]" role="alert">
              {{ item.cartMessage || 'This item is no longer available.' }} Remove it to continue to checkout.
            </p>
            <p v-else-if="item.cartMessage" class="mt-2 text-[0.7rem] text-danger" role="status">
              {{ item.cartMessage }}
            </p>
            <label v-if="!item.unavailable" class="mt-3 flex flex-col gap-[0.35rem] text-[0.62rem] text-muted uppercase"
              >Size
              <select
                class="max-w-max border border-line bg-paper p-[0.55rem] text-ink"
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
          <div class="flex items-center gap-2 max-md:col-start-3 max-md:row-start-1">
            <strong :class="['text-[0.85rem] font-bold', item.unavailable ? 'text-muted line-through' : 'text-accent']">{{ formatPrice(item.price) }}</strong>
            <span v-if="!item.unavailable && item.originalPrice" class="text-[0.72rem] text-muted line-through">{{ formatPrice(item.originalPrice) }}</span>
          </div>
          <input
            v-if="!item.unavailable"
            class="w-20 border border-line p-[0.65rem] max-md:col-start-2 max-md:row-start-2"
            type="number"
            min="1"
            :max="variantFor(item)?.stock_qty"
            :value="item.quantity"
            aria-label="Quantity"
            @change="changeQuantity(item, $event.target.value)"
          />
          <button
            :class="[
              'text-[0.65rem] font-bold uppercase max-md:col-start-3 max-md:row-start-2',
              item.unavailable
                ? 'border-0 bg-danger px-3 py-2 text-white'
                : 'cursor-pointer border-0 bg-transparent text-muted hover:text-accent',
            ]"
            type="button"
            @click="requestRemoval(item)"
          >
            Remove
          </button>
          <p
            v-if="warnings[item.variantId]"
            class="col-[2/-1] mt-[0.35rem] text-[0.7rem] text-danger uppercase"
          >
            {{ warnings[item.variantId] }}
          </p>
        </article>
      </div>
      <aside class="grid gap-4 self-start border-t-2 border-ink pt-4">
        <span class="text-[0.7rem] text-muted uppercase">Subtotal</span
        ><strong class="text-[1.1rem] font-bold text-ink">{{ formatPrice(subtotal) }}</strong>
        <RouterLink
          v-if="canCheckout"
          to="/checkout"
          class="bg-accent p-4 text-center text-[0.7rem] font-bold text-white uppercase no-underline hover:bg-accent-hover"
          >Go to checkout</RouterLink
        >
        <button
          v-else
          class="cursor-not-allowed bg-muted p-4 text-center text-[0.7rem] font-bold text-white uppercase"
          type="button"
          disabled
        >
          Fix your cart to checkout
        </button>
      </aside>
    </section>
    <div
      v-if="itemPendingRemoval"
      class="fixed inset-0 z-40 grid place-items-center bg-black/45 p-5"
      role="presentation"
      @click.self="itemPendingRemoval = null"
    >
      <section
        class="grid w-full max-w-sm gap-4 border border-line bg-paper p-5 shadow-[0_18px_40px_rgba(32,35,33,0.2)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-item-title"
      >
        <h2 id="remove-item-title" class="m-0 text-[1.2rem] font-semibold text-ink">
          Remove {{ itemPendingRemoval.productName }}?
        </h2>
        <p class="m-0 text-[0.85rem] text-muted">This item will be removed from your cart.</p>
        <div class="flex justify-end gap-3">
          <button class="border border-line bg-paper px-4 py-2 text-[0.7rem] font-bold uppercase" type="button" @click="itemPendingRemoval = null">Cancel</button>
          <button class="border-0 bg-danger px-4 py-2 text-[0.7rem] font-bold text-white uppercase" type="button" @click="confirmRemoval">Remove</button>
        </div>
      </section>
    </div>
  </main>
</template>
