<script setup>
defineProps({ name: { type: String, default: 'info' } })
const paths = {
  home: 'm3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  bag: 'M6 7h12l1 14H5L6 7ZM9 7V5a3 3 0 0 1 6 0v2',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  back: 'M19 12H5m6-6-6 6 6 6',
  chevron: 'm9 5 7 7-7 7',
  down: 'm6 9 6 6 6-6',
  plus: 'M5 12h14M12 5v14',
  minus: 'M5 12h14',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  image: 'M3 3h18v18H3V3Zm0 14 6-6 4 4 3-3 5 5M8 7h.01',
  zoom: 'M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6',
  info: 'M12 8h.01M12 11v6M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
  package: 'm3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10M7.5 5l9 4',
  list: 'M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01',
  truck: 'M3 5h11v12H3V5Zm11 5h4l3 4v3h-7M5 17a2 2 0 1 0 4 0M16 17a2 2 0 1 0 4 0',
  tag: 'M3 3h8l10 10-8 8L3 11V3ZM7.5 7.5h.01',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z',
  spark: 'm12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3Z',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  mail: 'M3 5h18v14H3V5Zm0 1 9 7 9-7',
  lock: 'M5 10h14v11H5V10ZM8 10V7a4 4 0 0 1 8 0v3M12 14v3',
  logout: 'M9 3H4v18h5M10 12h11m-4-4 4 4-4 4',
  login: 'M15 3h5v18h-5M3 12h12m-4-4 4 4-4 4',
  pin: 'M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  phone:
    'M5 3h3l2 5-2 2c1.2 2.5 3 4.3 5.5 5.5L16 13l5 2v3c0 1.7-1.3 3-3 3C10.3 21 3 13.7 3 6c0-1.7 1-3 2-3Z',
  filters: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
  refresh: 'M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 2M18 18A8 8 0 0 1 5 16',
  search: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM15 15l6 6',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',
  card: 'M3 4h18v16H3V4ZM3 9h18M7 15h3',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
}
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="paths[name] || paths.info" />
  </svg>
</template>
