<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Button } from '../ui/button.js'
import StoreHero from '../layout/StoreHero.vue'
import { RouterLink } from 'vue-router'
import { t } from '../../services/i18n'
import StoreIcon from '../icons/StoreIcon.vue'

const AUTOPLAY_DELAY = 5000

const props = defineProps({
  banners: {
    type: Array,
    required: true,
  },
})
const emit = defineEmits(['empty'])
const failedImages = ref(new Set())
const visibleBanners = computed(() =>
  props.banners.filter((banner) => !failedImages.value.has(banner.image)),
)

const track = ref(null)
const activeIndex = ref(0)
const autoplay = ref(false)
let autoplayTimer = null

const goTo = (index) => {
  const element = track.value
  const count = visibleBanners.value.length
  if (!element || !count) return

  const next = (index + count) % count
  activeIndex.value = next
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  element.scrollTo({
    left: next * element.clientWidth,
    behavior: reduceMotion ? 'auto' : 'smooth',
  })
}

const handleScroll = () => {
  const element = track.value
  if (!element?.clientWidth) return

  const index = Math.round(element.scrollLeft / element.clientWidth)
  if (index !== activeIndex.value) activeIndex.value = index
}

const startAutoplay = () => {
  if (autoplayTimer) clearInterval(autoplayTimer)
  if (!autoplay.value || visibleBanners.value.length < 2) return

  autoplayTimer = window.setInterval(() => {
    goTo(activeIndex.value + 1)
  }, AUTOPLAY_DELAY)
}
const stopAutoplay = () => {
  clearInterval(autoplayTimer)
  autoplayTimer = null
}
const pauseAutoplay = () => {
  autoplay.value = false
  stopAutoplay()
}
const navigate = (index) => {
  pauseAutoplay()
  goTo(index)
}
const toggleAutoplay = () => {
  autoplay.value = !autoplay.value
  startAutoplay()
}
const alignTrack = () => {
  track.value?.scrollTo({ left: activeIndex.value * track.value.clientWidth, behavior: 'instant' })
}

onMounted(() => {
  autoplay.value = window.matchMedia(
    '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
  ).matches
  startAutoplay()
  window.addEventListener('resize', alignTrack)
})
onUnmounted(() => {
  stopAutoplay()
  window.removeEventListener('resize', alignTrack)
})

watch(
  () => visibleBanners.value.length,
  () => {
    activeIndex.value = 0
    if (track.value) track.value.scrollLeft = 0
    startAutoplay()
    if (!visibleBanners.value.length && props.banners.length) emit('empty')
  },
)
</script>

<template>
  <div
    v-if="visibleBanners.length"
    class="store-banner-carousel"
    @mouseenter="stopAutoplay"
    @mouseleave="startAutoplay"
    @focusin="stopAutoplay"
    @focusout="!$event.currentTarget.contains($event.relatedTarget) && startAutoplay()"
    role="region"
    aria-roledescription="carousel"
    :aria-label="t('home.featuredPromotions')"
  >
    <div
      ref="track"
      class="store-banner-track scrollbar-none flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl scroll-smooth motion-reduce:scroll-auto"
      tabindex="0"
      @pointerdown="pauseAutoplay"
      @keydown.left.prevent="navigate(activeIndex - 1)"
      @keydown.right.prevent="navigate(activeIndex + 1)"
      @scroll.passive="handleScroll"
    >
      <div
        v-for="(banner, index) in visibleBanners"
        :key="banner.id"
        class="relative flex-[0_0_100%] snap-center snap-always"
        role="group"
        :inert="index !== activeIndex"
        aria-roledescription="slide"
        :aria-label="
          t('home.bannerPosition')
            .replace('{index}', index + 1)
            .replace('{count}', visibleBanners.length)
        "
      >
        <RouterLink
          to="/products"
          class="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-accent"
        >
          <StoreHero
            :image="banner.image"
            :alt="banner.title || t('home.featuredPromotions')"
            @image-error="failedImages.add(banner.image)"
          />
        </RouterLink>
      </div>
    </div>

    <div v-if="visibleBanners.length > 1" class="flex items-center justify-between gap-2 pt-1">
      <Button
        variant="ghost"
        size="icon"
        class="size-11 shrink-0 rounded-full text-muted hover:bg-accent-soft hover:text-accent [&_svg]:size-5"
        type="button"
        :aria-label="t('home.previousBanner')"
        @click="navigate(activeIndex - 1)"
      >
        <StoreIcon name="chevron" class="rotate-180" />
      </Button>
      <div class="scrollbar-none flex min-w-0 max-w-full overflow-x-auto rounded-full">
        <button
          v-for="(banner, index) in visibleBanners"
          :key="banner.id"
          class="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
          type="button"
          :aria-label="t('home.goToBanner').replace('{index}', index + 1)"
          :aria-current="activeIndex === index ? 'true' : undefined"
          @click="navigate(index)"
        >
          <span
            class="h-1.5 rounded-full transition-[width,background-color] motion-reduce:transition-none"
            :class="activeIndex === index ? 'w-6 bg-accent' : 'w-1.5 bg-muted'"
            aria-hidden="true"
          />
        </button>
      </div>
      <div class="flex shrink-0 items-center">
        <Button
          variant="ghost"
          size="icon"
          class="size-11 rounded-full text-muted hover:bg-accent-soft hover:text-accent [&_svg]:size-5"
          type="button"
          :aria-label="t(autoplay ? 'home.pauseBanners' : 'home.playBanners')"
          :aria-pressed="autoplay"
          @click="toggleAutoplay"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            aria-hidden="true"
          >
            <path v-if="autoplay" d="M8 5v14M16 5v14" />
            <path v-else d="m8 5 11 7-11 7V5Z" />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="size-11 rounded-full text-muted hover:bg-accent-soft hover:text-accent [&_svg]:size-5"
          type="button"
          :aria-label="t('home.nextBanner')"
          @click="navigate(activeIndex + 1)"
        >
          <StoreIcon name="chevron" />
        </Button>
      </div>
    </div>
  </div>
</template>
