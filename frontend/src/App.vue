<template>
  <RouterView />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { RouterView } from 'vue-router';
import { syncMonthFilterToToday } from './composables/useMonthFilter.js';

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    syncMonthFilterToToday();
  }
}

onMounted(() => {
  syncMonthFilterToToday();
  document.addEventListener('visibilitychange', onVisibilityChange);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange);
});
</script>
