<script setup>
import { RouterLink } from 'vue-router'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '../ui/dialog.js'
import { Button } from '../ui/button.js'
import { Badge } from '../ui/badge.js'
import { Separator } from '../ui/field.js'
import { t } from '../../services/i18n'
defineProps({ open: Boolean, orderNumber: [String, Number], amount: String })
const emit = defineEmits(['close', 'closeAutoFocus'])
</script>

<template>
  <Dialog :open="open" @update:open="!$event && emit('close')">
    <DialogContent class="gap-7" @close-auto-focus="emit('closeAutoFocus', $event)">
      <div class="flex items-center justify-between gap-3">
        <Badge variant="success" class="gap-2"
          ><svg
            class="size-3.5 fill-none stroke-current stroke-[1.8]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="m5 12 4 4L19 6" /></svg
          >{{ t('checkout.paymentReceived') }}</Badge
        >
        <DialogClose as-child
          ><Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-11 rounded-full"
            :aria-label="t('checkout.closeDialog')"
            ><svg
              class="fill-none stroke-current stroke-[1.5]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M6 18 18 6" /></svg></Button
        ></DialogClose>
      </div>
      <div class="grid gap-3">
        <DialogTitle
          class="m-0 text-[clamp(1.75rem,5vw,2.25rem)] font-semibold leading-tight tracking-tight"
          >{{ t('checkout.orderCompleted') }}</DialogTitle
        >
        <DialogDescription class="m-0 text-base leading-relaxed text-muted">{{
          t('checkout.paymentConfirmedThanks')
        }}</DialogDescription>
      </div>
      <dl class="m-0 grid gap-5 rounded-2xl bg-accent-soft/70 p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <dt class="text-sm text-muted">{{ t('checkout.amountPaid') }}</dt>
          <dd class="m-0 text-3xl font-semibold text-sale tabular-nums">{{ amount }}</dd>
        </div>
        <Separator />
        <div class="grid gap-2">
          <dt class="text-sm text-muted">{{ t('checkout.orderNumber') }}</dt>
          <dd class="m-0 font-mono text-base font-semibold wrap-anywhere">{{ orderNumber }}</dd>
        </div>
      </dl>
      <div class="grid gap-3">
        <Button as-child size="lg" class="min-h-14 justify-between rounded-full px-6"
          ><RouterLink to="/orders" @click="emit('close')"
            >{{ t('checkout.viewOrder')
            }}<svg
              data-icon="inline-end"
              class="fill-none stroke-current stroke-[1.5]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M5 12h14m-6-6 6 6-6 6" /></svg></RouterLink
        ></Button>
        <Button as-child variant="ghost" size="lg" class="rounded-full"
          ><RouterLink to="/" @click="emit('close')">{{
            t('checkout.continueShopping')
          }}</RouterLink></Button
        >
      </div>
    </DialogContent>
  </Dialog>
</template>
