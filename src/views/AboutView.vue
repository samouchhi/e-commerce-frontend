<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getSettings } from '../services/settingsService'
import { assetUrl } from '../services/api'
import { t } from '../services/i18n'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/feedback'
import StoreIcon from '../components/icons/StoreIcon.vue'
import { verifiedPolicyLinks } from '../utils/trustLinks'

const settings = ref({})
const loading = ref(true)
const hasProfile = computed(() =>
  Boolean(settings.value.site_logo || settings.value.site_name || settings.value.site_description),
)
const hasContact = computed(() =>
  Boolean(settings.value.site_address || settings.value.site_email || settings.value.site_phone),
)
const policyLinks = computed(() => verifiedPolicyLinks(settings.value))
onMounted(async () => {
  try {
    settings.value = await getSettings()
  } catch {
    /* The shopping links remain available. */
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main id="main-content" tabindex="-1" class="store-container py-8 pb-16 sm:py-12">
    <div class="store-page-heading mb-8">
      <h1 class="!m-0">{{ t('store.about') }}</h1>
    </div>
    <div class="grid gap-5 md:grid-cols-[1.4fr_1fr]">
      <section
        v-if="loading || hasProfile"
        class="rounded-2xl bg-paper p-6 sm:p-8"
        :aria-busy="loading"
      >
        <Skeleton v-if="loading" class="h-32 w-full" />
        <template v-else>
          <img
            v-if="settings.site_logo"
            :src="assetUrl(settings.site_logo)"
            :alt="settings.site_name"
            class="mb-5 size-20 object-contain"
          />
          <h2 v-if="settings.site_name" class="text-2xl font-bold tracking-tight">
            {{ settings.site_name }}
          </h2>
          <p v-if="settings.site_description" class="mt-4 max-w-prose text-sm leading-7 text-muted">
            {{ settings.site_description }}
          </p>
        </template>
      </section>
      <section v-if="hasContact" class="rounded-2xl bg-paper p-6 sm:p-8">
        <h2 class="store-section-title">
          <StoreIcon name="mail" class="size-5 text-accent" />{{ t('footer.contact') }}
        </h2>
        <address class="mt-5 grid gap-3 text-sm text-muted not-italic">
          <p v-if="settings.site_address" class="flex items-start gap-3">
            <StoreIcon name="pin" class="mt-1 size-5 shrink-0" /><span class="leading-7">{{
              settings.site_address
            }}</span>
          </p>
          <a
            v-if="settings.site_email"
            :href="`mailto:${settings.site_email}`"
            class="flex min-h-11 items-center gap-3 hover:text-accent"
            ><StoreIcon name="mail" class="size-5 shrink-0" /><span class="break-all">{{
              settings.site_email
            }}</span></a
          >
          <a
            v-if="settings.site_phone"
            :href="`tel:${settings.site_phone}`"
            class="flex min-h-11 items-center gap-3 hover:text-accent"
            ><StoreIcon name="phone" class="size-5 shrink-0" />{{ settings.site_phone }}</a
          >
        </address>
      </section>
      <section v-if="policyLinks.length" class="rounded-2xl bg-paper p-6 sm:p-8">
        <h2 class="store-section-title">
          <StoreIcon name="check" class="size-5 text-accent" />{{ t('footer.policies') }}
        </h2>
        <nav class="mt-5 grid gap-1" :aria-label="t('footer.policies')">
          <a
            v-for="link in policyLinks"
            :key="link.field"
            :href="link.href"
            class="store-section-link min-h-11"
          >
            {{ t(link.key) }}<StoreIcon name="arrow" class="size-4" />
          </a>
        </nav>
      </section>
      <div class="flex flex-wrap items-center gap-3 md:col-span-2">
        <Button as-child
          ><RouterLink to="/products"
            ><StoreIcon name="bag" />{{ t('store.shopNow') }}<StoreIcon name="arrow" /></RouterLink
        ></Button>
        <RouterLink to="/categories" class="store-section-link min-h-11"
          ><StoreIcon name="grid" class="size-4" />{{ t('products.shopByCategory')
          }}<StoreIcon name="arrow" class="size-4"
        /></RouterLink>
      </div>
    </div>
  </main>
</template>
