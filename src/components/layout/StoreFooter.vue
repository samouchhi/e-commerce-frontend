<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { assetUrl } from '../../services/api'
import { t } from '../../services/i18n'
import { verifiedPolicyLinks, verifiedSocialLinks } from '../../utils/trustLinks'
import StoreIcon from '../icons/StoreIcon.vue'
const props = defineProps({ settings: { type: Object, default: () => ({}) } })
const socialLinks = computed(() => verifiedSocialLinks(props.settings))
const policyLinks = computed(() => verifiedPolicyLinks(props.settings))
const links = [
  { to: '/', key: 'nav.home', icon: 'home' },
  { to: '/products', key: 'nav.products', icon: 'bag' },
  { to: '/promotion', key: 'nav.promotions', icon: 'tag' },
  { to: '/categories', key: 'nav.category', icon: 'grid' },
  { to: '/about', key: 'store.about', icon: 'info' },
]
</script>

<template>
  <footer class="store-footer mt-auto border-t border-line bg-paper">
    <div
      class="store-container grid grid-cols-2 gap-6 py-8 lg:grid-cols-[1fr_1.2fr_1.2fr] lg:gap-8 lg:py-9"
    >
      <div class="min-w-0">
        <RouterLink to="/" class="inline-flex min-h-11 items-center gap-3">
          <img
            v-if="settings.site_logo"
            :src="assetUrl(settings.site_logo)"
            :alt="settings.site_name"
            class="size-10 shrink-0 rounded-xl object-contain sm:size-12"
          />
          <span class="text-base font-extrabold tracking-tight sm:text-xl">{{
            settings.site_name
          }}</span>
        </RouterLink>
        <nav
          v-if="socialLinks.length"
          class="mt-4 flex flex-wrap gap-2"
          :aria-label="t('footer.follow')"
        >
          <a
            v-for="link in socialLinks"
            :key="link.field"
            :href="link.href"
            target="_blank"
            rel="noreferrer"
            :aria-label="link.name"
            :title="link.name"
            class="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-muted transition-colors hover:text-accent"
          >
            <svg
              viewBox="0 0 24 24"
              class="size-5"
              :fill="link.name === 'Instagram' ? 'none' : 'currentColor'"
              :stroke="link.name === 'Instagram' ? 'currentColor' : 'none'"
              aria-hidden="true"
            >
              <path :d="link.path" />
            </svg>
          </a>
        </nav>
        <div class="mt-5 flex items-center gap-3" :aria-label="t('footer.payment')">
          <img
            src="/payment-abakhqr.webp"
            alt="ABA KHQR / Bakong"
            class="size-12 rounded-lg object-contain"
          />
          <span class="min-w-0 text-xs font-medium text-muted">ABA KHQR / Bakong</span>
        </div>
      </div>
      <nav
        :aria-label="t('store.quickLinks')"
        class="grid content-start gap-x-4 gap-y-1 sm:grid-cols-2"
      >
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="flex min-h-11 items-center gap-2 text-sm text-muted hover:text-accent"
        >
          <StoreIcon :name="link.icon" class="size-4 shrink-0" />{{ t(link.key) }}
        </RouterLink>
      </nav>
      <address
        v-if="settings.site_address || settings.site_email || settings.site_phone"
        class="col-span-2 grid min-w-0 content-start gap-2 text-sm text-muted not-italic lg:col-span-1"
      >
        <p v-if="settings.site_address" class="flex items-start gap-3 py-2">
          <StoreIcon name="pin" class="mt-1 size-4 shrink-0 text-accent" /><span
            class="leading-7"
            >{{ settings.site_address }}</span
          >
        </p>
        <a
          v-if="settings.site_email"
          :href="'mailto:' + settings.site_email"
          class="flex min-h-11 items-center gap-3 hover:text-accent"
          ><StoreIcon name="mail" class="size-4 shrink-0 text-accent" /><span class="break-all">{{
            settings.site_email
          }}</span></a
        >
        <a
          v-if="settings.site_phone"
          :href="'tel:' + settings.site_phone"
          class="flex min-h-11 items-center gap-3 hover:text-accent"
          ><StoreIcon name="phone" class="size-4 shrink-0 text-accent" />{{
            settings.site_phone
          }}</a
        >
      </address>
    </div>
    <div class="border-t border-line">
      <div class="store-container flex flex-wrap justify-between gap-4 py-5 text-xs text-muted">
        <p>© {{ new Date().getFullYear() }} {{ settings.site_name }}</p>
        <nav
          v-if="policyLinks.length"
          class="flex flex-wrap gap-4"
          :aria-label="t('footer.policies')"
        >
          <a
            v-for="link in policyLinks"
            :key="link.field"
            :href="link.href"
            class="hover:text-accent"
            >{{ t(link.key) }}</a
          >
        </nav>
      </div>
    </div>
  </footer>
</template>
