<script setup>
import { RouterLink } from 'vue-router'
import { Button } from '../components/ui/button'
import StoreIcon from '../components/icons/StoreIcon.vue'
import { t } from '../services/i18n'
</script>

<template>
  <main id="main-content" tabindex="-1" class="store-auth-page">
    <section class="grid max-w-md justify-items-center gap-5 px-4 text-center">
      <span class="flex size-20 items-center justify-center rounded-3xl bg-paper text-accent"
        ><StoreIcon name="search" class="size-8"
      /></span>
      <p class="text-sm font-semibold text-muted">404</p>
      <h1 class="!m-0">{{ t('store.notFound') }}</h1>
      <Button as-child size="lg"
        ><RouterLink to="/products"
          ><StoreIcon name="bag" />{{ t('store.shopNow') }}<StoreIcon name="arrow" /></RouterLink
      ></Button>
    </section>
  </main>
</template>
