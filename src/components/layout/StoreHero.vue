<script setup>
import { ref, watch } from 'vue'
import { assetUrl } from '../../services/api'

const props = defineProps({ image: String, alt: { type: String, default: '' } })
const emit = defineEmits(['image-error'])
const failed = ref(false)
const handleImageError = () => {
  failed.value = true
  emit('image-error')
}
watch(
  () => props.image,
  () => {
    failed.value = false
  },
)
</script>

<template>
  <section v-if="image && !failed" class="store-banner overflow-hidden rounded-xl bg-accent-soft">
    <img
      :src="assetUrl(image)"
      :alt="alt"
      width="1920"
      height="1080"
      class="block h-auto w-full object-contain"
      @error="handleImageError"
    />
  </section>
</template>
