<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { assetUrl } from '../../services/api'
import { Button } from '../ui/button.js'
import { t } from '../../services/i18n'

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
  if (
    visibleBanners.value.length < 2 ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return

  autoplayTimer = window.setInterval(() => {
    goTo(activeIndex.value + 1)
  }, AUTOPLAY_DELAY)
}

onMounted(startAutoplay)
onUnmounted(() => {
  if (autoplayTimer) clearInterval(autoplayTimer)
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
    class="relative"
    role="region"
    aria-roledescription="carousel"
    :aria-label="t('home.featuredPromotions')"
  >
    <div
      ref="track"
      class="scrollbar-none flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth motion-reduce:scroll-auto"
      tabindex="0"
      @scroll.passive="handleScroll"
    >
      <div
        v-for="(banner, index) in visibleBanners"
        :key="banner.id"
        class="relative flex-[0_0_100%] snap-center snap-always"
        role="group"
        aria-roledescription="slide"
        :aria-label="
          t('home.bannerPosition')
            .replace('{index}', index + 1)
            .replace('{count}', visibleBanners.length)
        "
      >
        <img
          class="block aspect-[10/3] w-full bg-accent-soft object-cover"
          :src="assetUrl(banner.image)"
          :alt="banner.title || t('home.featuredPromotions')"
          :loading="index === 0 ? 'eager' : 'lazy'"
          @error="failedImages.add(banner.image)"
        />
        <p v-if="banner.title" class="m-0 bg-paper px-5 py-4 text-sm font-semibold leading-relaxed">
          {{ banner.title }}
        </p>
      </div>
    </div>

    <template v-if="visibleBanners.length > 1">
      <Button
        variant="outline"
        size="icon"
        class="absolute top-1/2 left-4 hidden size-11 -translate-y-1/2 rounded-full md:flex"
        type="button"
        :aria-label="t('home.previousBanner')"
        @click="goTo(activeIndex - 1)"
      >
        <svg class="fill-none stroke-current stroke-[1.5]" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m14 6-6 6 6 6" />
        </svg>
      </Button>
      <Button
        variant="outline"
        size="icon"
        class="absolute top-1/2 right-4 hidden size-11 -translate-y-1/2 rounded-full md:flex"
        type="button"
        :aria-label="t('home.nextBanner')"
        @click="goTo(activeIndex + 1)"
      >
        <svg class="fill-none stroke-current stroke-[1.5]" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m10 6 6 6-6 6" />
        </svg>
      </Button>
      <div class="flex justify-center border-t border-line">
        <button
          v-for="(banner, index) in visibleBanners"
          :key="banner.id"
          class="flex size-11 cursor-pointer items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
          type="button"
          :aria-label="t('home.goToBanner').replace('{index}', index + 1)"
          :aria-current="activeIndex === index ? 'true' : undefined"
          @click="goTo(index)"
        >
          <span
            class="h-1.5 rounded-full bg-ink/25"
            :class="activeIndex === index ? 'w-5 bg-ink' : 'w-1.5'"
            aria-hidden="true"
          />
        </button>
      </div>
    </template>
  </div>
</template>
