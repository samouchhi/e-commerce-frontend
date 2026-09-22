<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { assetUrl } from '../../services/api'

const AUTOPLAY_DELAY = 5000

const props = defineProps({
  banners: {
    type: Array,
    required: true,
  },
})

const track = ref(null)
const activeIndex = ref(0)
let autoplayTimer = null

const bannerLabel = (banner) => banner.title || 'Promotional banner'

const goTo = (index) => {
  const element = track.value
  const count = props.banners.length
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
  if (props.banners.length < 2) return

  autoplayTimer = window.setInterval(() => {
    goTo(activeIndex.value + 1)
  }, AUTOPLAY_DELAY)
}

onMounted(startAutoplay)
onUnmounted(() => {
  if (autoplayTimer) clearInterval(autoplayTimer)
})

watch(
  () => props.banners.length,
  () => {
    activeIndex.value = 0
    if (track.value) track.value.scrollLeft = 0
    startAutoplay()
  },
)
</script>

<template>
  <div
    v-if="banners.length"
    class="relative"
    role="region"
    aria-roledescription="carousel"
    aria-label="Featured promotions"
  >
    <div
      ref="track"
      class="scrollbar-none flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth motion-reduce:scroll-auto"
      tabindex="0"
      @scroll.passive="handleScroll"
    >
      <div
        v-for="(banner, index) in banners"
        :key="banner.id"
        class="relative flex-[0_0_100%] snap-center snap-always"
        role="group"
        aria-roledescription="slide"
        :aria-label="`${index + 1} of ${banners.length}`"
      >
        <img
          class="block aspect-[10/3] w-full bg-accent-soft object-cover"
          :src="assetUrl(banner.image)"
          :alt="banner.title || `Promotional banner ${index + 1}`"
          :loading="index === 0 ? 'eager' : 'lazy'"
        />
        <p
          v-if="banner.title"
          class="absolute right-0 bottom-0 left-0 m-0 bg-linear-to-t from-black/75 to-transparent px-5 pt-11 pb-[1.1rem] text-[0.72rem] leading-[1.4] font-bold tracking-[0.08em] text-white uppercase"
        >
          {{ banner.title }}
        </p>
      </div>
    </div>

    <template v-if="banners.length > 1">
      <button
        class="absolute top-1/2 left-4 z-[2] hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center border-0 bg-white/90 text-ink md:flex md:hover:bg-accent md:hover:text-white focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[2px] focus-visible:outline-accent"
        type="button"
        aria-label="Previous banner"
        @click="goTo(activeIndex - 1)"
      >
        <svg
          class="h-5 w-5 fill-none stroke-current stroke-[2] [stroke-linecap:round] [stroke-linejoin:round]"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="m14 6-6 6 6 6" />
        </svg>
      </button>
      <button
        class="absolute top-1/2 right-4 z-[2] hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center border-0 bg-white/90 text-ink md:flex md:hover:bg-accent md:hover:text-white focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[2px] focus-visible:outline-accent"
        type="button"
        aria-label="Next banner"
        @click="goTo(activeIndex + 1)"
      >
        <svg
          class="h-5 w-5 fill-none stroke-current stroke-[2] [stroke-linecap:round] [stroke-linejoin:round]"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="m10 6 6 6-6 6" />
        </svg>
      </button>
      <div class="absolute right-0 bottom-[0.7rem] left-0 z-[2] flex justify-center gap-[0.4rem]">
        <button
          v-for="(banner, index) in banners"
          :key="banner.id"
          class="h-2 w-2 cursor-pointer rounded-full border-0 bg-white/55 p-0 transition-[background-color,width] duration-[180ms] motion-reduce:transition-none focus-visible:outline-solid focus-visible:outline-[2px] focus-visible:outline-offset-[3px] focus-visible:outline-white"
          :class="{ 'w-[1.35rem] bg-white': activeIndex === index }"
          type="button"
          :aria-label="`Go to banner ${index + 1}`"
          :aria-current="activeIndex === index ? 'true' : undefined"
          @click="goTo(index)"
        />
      </div>
    </template>
  </div>
</template>
