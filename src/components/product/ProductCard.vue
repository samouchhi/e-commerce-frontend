<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Button } from '../ui/button.js'
import { Badge } from '../ui/badge.js'
import StoreIcon from '../icons/StoreIcon.vue'
import { assetUrl } from '../../services/api'
import { addToCart, getCart } from '../../services/cartService'
import { activeDiscounts, formatPrice, pricingFor } from '../../utils/pricing'
import { availableVariant, optionLabel } from '../../utils/productDetail'
import { productSlug } from '../../utils/slug'
import { productPriceRange } from '../../utils/catalogue'
import { t } from '../../services/i18n'

const props = defineProps({ product: { type: Object, required: true }, showDescription: Boolean })
const router = useRouter()
const destination = computed(() => `/products/${productSlug(props.product)}`)
const imageUrl = computed(() => {
  const image = props.product.images?.slice().sort((a, b) => a.sort_order - b.sort_order)[0]
  return image?.image_url || (image?.image_path ? assetUrl(`/storage/${image.image_path}`) : '')
})
const imageFailed = ref(false)
watch(imageUrl, () => {
  imageFailed.value = false
})
const pricing = computed(() => pricingFor(props.product))
const priceRange = computed(() => productPriceRange(props.product))
const otherOffers = computed(() => Math.max(0, activeDiscounts(props.product).length - 1))
const cart = ref(getCart())
const refreshCart = () => {
  cart.value = getCart()
}
onMounted(() => window.addEventListener('cart-updated', refreshCart))
onUnmounted(() => window.removeEventListener('cart-updated', refreshCart))
const variants = computed(() => props.product.variants || [])
const variantLabels = computed(() =>
  variants.value
    .filter((variant) => variant.is_active && variant.name)
    .map((variant) => optionLabel(props.product, variant.name))
    .join(' · '),
)
const available = computed(() => variants.value.some(availableVariant))
const needsOptions = computed(() => variants.value.length > 1)
const purchaseLabel = computed(() =>
  t(
    !available.value
      ? 'cart.outOfStock'
      : needsOptions.value
        ? 'store.chooseOptions'
        : 'productDetail.addToCart',
  ),
)
const remaining = computed(
  () =>
    Number(pricing.value.variant?.stock_qty || 0) -
    Number(cart.value.find((item) => item.variantId === pricing.value.variant?.id)?.quantity || 0),
)
const feedback = ref('')
const add = () => {
  feedback.value = ''
  if (needsOptions.value) return router.push(destination.value)
  refreshCart()
  if (!available.value || remaining.value < 1) {
    feedback.value = 'productDetail.stockLimit'
    return
  }
  try {
    addToCart({
      productId: props.product.id,
      variantId: pricing.value.variant.id,
      productName: props.product.name,
      variantName: pricing.value.variant.name,
      imageUrl: imageUrl.value,
      price: pricing.value.currentPrice,
      originalPrice: pricing.value.hasDiscount ? pricing.value.originalPrice : null,
      stockQty: Number(pricing.value.variant.stock_qty),
      quantity: 1,
    })
  } catch {
    feedback.value = 'productDetail.cartError'
  }
}
</script>

<template>
  <article class="store-product-card group">
    <RouterLink
      :to="destination"
      class="store-product-image focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent"
      :aria-label="product.name"
    >
      <Badge v-if="pricing.hasDiscount" variant="sale" class="absolute left-2 top-2 z-10 px-2.5"
        >−{{ pricing.percentOff }}%</Badge
      >
      <Badge
        v-else-if="product.is_best_seller"
        variant="outline"
        class="absolute left-3 top-3 z-10 border-0 bg-paper px-3 py-1.5 text-accent"
      >
        {{ t('products.bestSeller') }}
      </Badge>
      <Badge
        v-if="!available"
        variant="outline"
        class="absolute bottom-2 left-2 right-2 z-10 w-fit max-w-[calc(100%-1rem)] rounded-lg px-2 py-1 text-[0.65rem] leading-relaxed"
        >{{ t('cart.outOfStock') }}</Badge
      >
      <img
        v-if="imageUrl && !imageFailed"
        :src="imageUrl"
        :alt="product.name"
        class="size-full object-contain transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transition-none"
        loading="lazy"
        @error="imageFailed = true"
      />
      <div v-else class="flex size-full flex-col items-center justify-center gap-2 text-muted">
        <svg
          class="size-8 fill-none stroke-current stroke-[1.2]"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M4 7h16v14H4zM8 7V5a4 4 0 0 1 8 0v2" />
        </svg>
        <span class="text-xs">{{ t('productDetail.noImage') }}</span>
      </div>
    </RouterLink>
    <div class="store-product-body">
      <h3 class="text-sm font-semibold leading-relaxed break-words sm:text-base">
        <RouterLink
          :to="destination"
          class="line-clamp-2 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >{{ product.name }}</RouterLink
        >
      </h3>
      <p
        v-if="variantLabels"
        class="line-clamp-2 text-xs leading-relaxed text-muted"
        :title="variantLabels"
      >
        {{ variantLabels }}
      </p>
      <RouterLink
        v-if="pricing.discount"
        :to="destination"
        class="flex min-h-11 min-w-0 items-center gap-1.5 text-xs text-accent focus-visible:outline-2 focus-visible:outline-accent"
        :title="pricing.discount.name"
      >
        <StoreIcon name="tag" class="size-3.5 shrink-0" />
        <span class="line-clamp-1 font-medium">{{ pricing.discount.name }}</span>
        <span
          v-if="otherOffers"
          class="shrink-0 rounded-md bg-accent-soft px-1.5 py-1 text-muted"
          :aria-label="t('promotions.moreOffers').replace('{count}', otherOffers)"
          :title="t('promotions.moreOffers').replace('{count}', otherOffers)"
          >+{{ otherOffers }}</span
        >
      </RouterLink>
      <p
        v-if="showDescription && product.short_description"
        class="line-clamp-2 text-xs leading-relaxed text-muted"
      >
        {{ product.short_description }}
      </p>
      <div class="store-product-purchase">
        <div class="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span class="text-lg font-bold text-accent tabular-nums sm:text-xl"
            ><span v-if="priceRange.varies" class="mr-1 text-xs font-medium text-muted">{{
              t('productDetail.from')
            }}</span
            >{{ formatPrice(priceRange.min) }}</span
          >
          <s
            v-if="pricing.hasDiscount && !priceRange.varies"
            class="text-xs text-muted tabular-nums"
            >{{ formatPrice(pricing.originalPrice) }}</s
          >
        </div>
        <Button
          type="button"
          class="store-product-button w-full whitespace-normal px-2 text-xs sm:text-sm"
          :disabled="!available || (!needsOptions && remaining < 1)"
          :aria-label="purchaseLabel"
          :title="purchaseLabel"
          @click="add"
        >
          <StoreIcon v-if="!needsOptions" name="bag" />
          <span>{{ purchaseLabel }}</span>
          <StoreIcon v-if="needsOptions && available" name="arrow" />
        </Button>
      </div>
      <p v-if="feedback" class="text-xs text-danger" role="alert">{{ t(feedback) }}</p>
    </div>
  </article>
</template>
