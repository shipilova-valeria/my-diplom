<template>
  <div class="month-nav">
    <button type="button" class="month-nav__btn" aria-label="Предыдущий месяц" @click="month.prev">
      ‹
    </button>
    <span class="month-nav__label">{{ month.label }}</span>
    <button type="button" class="month-nav__btn" aria-label="Следующий месяц" @click="month.next">
      ›
    </button>
  </div>
</template>

<script setup>
import { useMonthFilter } from '../composables/useMonthFilter.js';

const month = useMonthFilter();
</script>

<style scoped>
.month-nav {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding: 8px 4px;
}

.month-nav__btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.month-nav__btn:hover {
  background: #333;
}

.month-nav__label {
  min-width: 200px;
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}
</style>
