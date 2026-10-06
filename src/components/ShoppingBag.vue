<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from './ui/dialog.js'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from './ui/alert-dialog.js'
import { Button } from './ui/button.js'
import { Separator } from './ui/field.js'
import { NativeSelect } from './ui/input.js'
import { Alert, Empty, EmptyTitle, EmptyDescription, Skeleton } from './ui/feedback.js'
import { Spinner } from './ui/spinner.js'
import CartRowsSkeleton from './CartRowsSkeleton.vue'
import { formatPrice } from '../utils/pricing'
import { t } from '../services/i18n'
const props = defineProps({
  open: Boolean,
  items: Array,
  products: Array,
  warnings: Object,
  pendingRemoval: Object,
  subtotal: Number,
  canCheckout: Boolean,
  loading: Boolean,
  error: String,
  imageUrl: Function,
})
const emit = defineEmits([
  'update:open',
  'quantity',
  'variant',
  'remove',
  'confirmRemoval',
  'cancelRemoval',
  'clear',
  'retry',
  'closeAutoFocus',
])
const clearRequested = ref(false)
const failedImages = ref(new Set())
const count = computed(() => props.items.reduce((total, item) => total + Number(item.quantity), 0))
const unavailableCount = computed(() => props.items.filter((item) => item.unavailable).length)
const productFor = (item) => props.products.find((product) => product.id === item.productId)
const stockFor = (item) =>
  Number(
    item.stockQty ??
      productFor(item)?.variants?.find((variant) => variant.id === item.variantId)?.stock_qty ??
      Infinity,
  )
const stockMessage = (item) =>
  props.warnings[item.variantId] ||
  (Number.isFinite(stockFor(item)) && item.quantity >= stockFor(item)
    ? t('cart.onlyAvailable').replace('{stock}', stockFor(item))
    : '')
let removalReturnFocus
const requestRemoval = (item) => {
  removalReturnFocus = document.activeElement
  emit('remove', item)
}
const requestClear = () => {
  removalReturnFocus = document.activeElement
  clearRequested.value = true
}
const restoreRemovalFocus = (event) => {
  event.preventDefault()
  const target = removalReturnFocus?.isConnected
    ? removalReturnFocus
    : document.getElementById('bag-close')
  target?.focus()
}
const cancelRemoval = () => {
  clearRequested.value = false
  emit('cancelRemoval')
}
const confirmRemoval = () => {
  if (clearRequested.value) {
    emit('clear')
    clearRequested.value = false
  } else emit('confirmRemoval')
}
const close = () => {
  cancelRemoval()
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="!$event && close()">
    <DialogContent
      id="bag-drawer"
      sheet
      class="max-w-[520px]"
      @close-auto-focus="emit('closeAutoFocus', $event)"
    >
      <header class="grid shrink-0 gap-2 px-4 pt-4 pb-3 sm:px-5">
        <div class="flex items-start justify-between gap-3">
          <div class="grid gap-1">
            <DialogTitle class="m-0 text-3xl font-semibold tracking-tight">{{
              t('cart.title')
            }}</DialogTitle
            ><DialogDescription class="m-0 text-sm text-muted">{{
              t(count === 1 ? 'cart.itemCount' : 'cart.itemsCount').replace('{count}', count)
            }}</DialogDescription>
          </div>
          <DialogClose as-child
            ><Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-11 shrink-0 rounded-full"
              id="bag-close"
              :aria-label="t('cart.closeBag')"
              ><svg
                class="fill-none stroke-current stroke-[1.5]"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="m6 6 12 12M6 18 18 6" /></svg></Button
          ></DialogClose>
        </div>
        <Alert v-if="error" variant="error"
          ><div class="flex flex-wrap items-center justify-between gap-3">
            <p class="m-0 text-sm">{{ error }}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="loading"
              @click="emit('retry')"
              >{{ t('checkout.retryAddresses') }}</Button
            >
          </div></Alert
        >
        <Alert v-if="unavailableCount" variant="error"
          ><p class="m-0 text-sm text-danger">
            {{
              t(
                unavailableCount === 1 ? 'cart.oneItemNeedsRemoval' : 'cart.manyItemsNeedRemoval',
              ).replace('{count}', unavailableCount)
            }}
          </p></Alert
        >
        <div v-if="items.length || loading" class="flex items-center justify-between gap-3">
          <span class="text-sm text-muted">{{ t('cart.itemsLabel') }}</span
          ><Button
            type="button"
            variant="ghost"
            size="sm"
            class="rounded-full"
            v-if="items.length"
            :disabled="loading"
            @click="requestClear"
            >{{ t('cart.clearCart') }}</Button
          >
        </div>
      </header>
      <Separator />
      <div
        class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5"
        :aria-busy="loading"
      >
        <CartRowsSkeleton v-if="loading" compact :count="items.length || 2" />
        <Empty v-if="!items.length && !loading" class="my-auto border-0 p-0">
          <svg
            class="mb-2 size-12 fill-none stroke-muted stroke-[1]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M5 8h14l1 13H4L5 8ZM9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
          <EmptyTitle class="text-xl">{{ t('cart.empty') }}</EmptyTitle
          ><EmptyDescription>{{ t('cart.emptyHelp') }}</EmptyDescription>
          <Button as-child size="lg" class="mt-3 rounded-full"
            ><RouterLink to="/products" @click="close">{{
              t('checkout.continueShopping')
            }}</RouterLink></Button
          >
        </Empty>
        <template v-if="!loading">
          <article v-for="item in items" :key="item.variantId" class="grid min-w-0 gap-3">
            <div
              class="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[4rem_minmax(0,1fr)]"
            >
              <div
                class="grid aspect-square place-items-center self-start overflow-hidden rounded-lg bg-accent-soft"
              >
                <img
                  v-if="imageUrl(item) && !failedImages.has(imageUrl(item))"
                  class="size-full object-contain"
                  :src="imageUrl(item)"
                  :alt="item.productName"
                  @error="failedImages.add(imageUrl(item))"
                /><span v-else class="px-2 text-center text-xs text-muted">{{
                  t('cart.noImage')
                }}</span>
              </div>
              <div class="grid min-w-0 content-start gap-1.5">
                <div class="flex items-start justify-between gap-2">
                  <strong class="min-w-0 text-base font-semibold leading-snug wrap-anywhere">{{
                    item.productName
                  }}</strong
                  ><Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="-mt-2 -mr-2 size-11 shrink-0 rounded-full"
                    :aria-label="`${t('cart.removeFromBag')}: ${item.productName}`"
                    :disabled="loading"
                    @click="requestRemoval(item)"
                    ><svg
                      class="fill-none stroke-current stroke-[1.5]"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6m4-6v6" /></svg
                  ></Button>
                </div>
                <p v-if="item.unavailable" class="m-0 text-sm text-danger" role="alert">
                  {{ t('cart.productUnavailable') }}
                </p>
                <NativeSelect
                  v-if="!item.unavailable"
                  :model-value="String(item.variantId)"
                  :aria-label="`${t('checkout.productOption')}: ${item.productName}`"
                  class="min-h-11 py-2"
                  :disabled="loading"
                  @update:model-value="emit('variant', item, $event)"
                  ><option
                    v-for="variant in productFor(item)?.variants || [
                      {
                        id: item.variantId,
                        name: item.variantName,
                        is_active: true,
                        stock_qty: item.stockQty,
                      },
                    ]"
                    :key="variant.id"
                    :value="String(variant.id)"
                    :disabled="!variant.is_active || Number(variant.stock_qty) <= 0"
                  >
                    {{ variant.name
                    }}{{ Number(variant.stock_qty) <= 0 ? ` (${t('cart.outOfStock')})` : '' }}
                  </option></NativeSelect
                >
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div
                    v-if="!item.unavailable"
                    class="flex items-center rounded-md border border-line"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="size-11 rounded-md"
                      :aria-label="`${t('cart.decreaseQuantity')}: ${item.productName}, ${item.variantName}`"
                      :disabled="loading || item.quantity <= 1"
                      @click="emit('quantity', item, item.quantity - 1)"
                      ><svg
                        class="fill-none stroke-current stroke-[1.5]"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14" /></svg></Button
                    ><span
                      class="min-w-8 text-center text-sm font-semibold tabular-nums"
                      aria-live="polite"
                      >{{ item.quantity }}</span
                    ><Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="size-11 rounded-md"
                      :aria-label="`${t('cart.increaseQuantity')}: ${item.productName}, ${item.variantName}`"
                      :disabled="loading || item.quantity >= stockFor(item)"
                      @click="emit('quantity', item, item.quantity + 1)"
                      ><svg
                        class="fill-none stroke-current stroke-[1.5]"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M12 5v14M5 12h14" /></svg
                    ></Button>
                  </div>
                  <span v-else class="text-sm text-danger">{{ t('cart.unavailable') }}</span>
                  <strong
                    :class="[
                      'text-lg font-semibold tabular-nums',
                      item.unavailable ? 'text-muted line-through' : 'text-sale',
                    ]"
                    >{{ formatPrice(item.price * item.quantity) }}</strong
                  >
                </div>
                <p
                  v-if="!item.unavailable && stockMessage(item)"
                  :class="['m-0 text-sm', warnings[item.variantId] ? 'text-danger' : 'text-muted']"
                  role="status"
                >
                  {{ stockMessage(item) }}
                </p>
              </div>
            </div>
            <Separator />
          </article>
        </template>
      </div>
      <footer
        v-if="items.length"
        class="grid shrink-0 gap-2 border-t border-line bg-paper px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="text-base font-semibold">{{ t('cart.subtotal') }}</span
          ><Skeleton v-if="loading" class="h-8 w-24" /><strong
            v-else
            class="text-2xl font-semibold text-sale tabular-nums"
            >{{ formatPrice(subtotal) }}</strong
          >
        </div>
        <Button
          v-if="canCheckout && !error && !loading"
          as-child
          size="lg"
          class="min-h-12 justify-between rounded-full px-5"
          ><RouterLink to="/checkout" @click="close"
            >{{ t('cart.goToCheckout')
            }}<svg
              data-icon="inline-end"
              class="fill-none stroke-current stroke-[1.5]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M5 12h14m-6-6 6 6-6 6" /></svg></RouterLink
        ></Button>
        <Button
          v-else
          type="button"
          size="lg"
          class="min-h-12 rounded-full"
          :aria-busy="loading"
          disabled
        >
          <Spinner v-if="loading" data-icon="inline-start" />
          {{
            loading ? t('cart.goToCheckout') : error ? t('cart.retryToCheckout') : t('cart.fixCart')
          }}
        </Button>
      </footer>
    </DialogContent>
    <AlertDialog
      :open="Boolean(pendingRemoval) || clearRequested"
      @update:open="!$event && cancelRemoval()"
    >
      <AlertDialogContent @close-auto-focus="restoreRemovalFocus"
        ><AlertDialogTitle class="text-xl font-semibold">{{
          clearRequested ? t('cart.clearTitle') : t('cart.removeTitle')
        }}</AlertDialogTitle
        ><AlertDialogDescription class="text-sm leading-relaxed text-muted">{{
          clearRequested ? t('cart.clearDescription') : t('cart.removeDescription')
        }}</AlertDialogDescription>
        <p v-if="pendingRemoval && !clearRequested" class="m-0 text-base font-medium wrap-anywhere">
          {{ pendingRemoval.productName }}
        </p>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel as-child
            ><Button type="button" variant="outline" class="rounded-full">{{
              t('cart.cancel')
            }}</Button></AlertDialogCancel
          ><Button
            type="button"
            variant="destructive"
            class="rounded-full"
            @click="confirmRemoval"
            >{{ clearRequested ? t('cart.clearCart') : t('cart.remove') }}</Button
          >
        </div></AlertDialogContent
      >
    </AlertDialog>
  </Dialog>
</template>
