<script setup>
import cambodiaFlag from '../../assets/flags/cambodia.jpg'
import usaFlag from '../../assets/flags/usa.jpg'

defineProps({
  country: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <span class="inline-block w-[1.9rem] overflow-hidden border border-black/10" aria-hidden="true">
    <img class="block h-full w-full object-contain" :src="country === 'kh' ? cambodiaFlag : usaFlag" alt="" />
  </span>
</template>
