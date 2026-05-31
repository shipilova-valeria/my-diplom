<template>
  <aside class="sidebar">
    <h1 class="sidebar__title">ERP-система</h1>
    <nav class="sidebar__nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="sidebar__link"
        active-class="sidebar__link--active"
      >
        {{ item.label }}
      </RouterLink>
    </nav>
    <button class="sidebar__logout" @click="onLogout">Выйти</button>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();

const navItems = computed(() => {
  if (auth.mustChangePassword) {
    return [{ to: '/profile', label: 'Профиль' }];
  }
  if (auth.isAdmin) {
    return [
      { to: '/dashboard', label: 'Дашборд' },
      { to: '/users', label: 'Пользователи' },
    ];
  }
  const items = [
    { to: '/dashboard', label: 'Дашборд' },
    { to: '/projects', label: 'Проекты' },
    { to: '/tasks', label: 'Задачи' },
  ];
  if (auth.canManageUsers) {
    items.push({ to: '/users', label: 'Пользователи' });
  }
  items.push({ to: '/profile', label: 'Профиль' });
  return items;
});

function onLogout() {
  auth.logout();
  router.push('/login');
}
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  min-height: 100vh;
  background: var(--bg-sidebar);
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar__title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 28px;
  padding-left: 4px;
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.sidebar__link {
  padding: 10px 14px;
  border-radius: 10px;
  color: var(--text-muted);
  font-size: 14px;
  transition: background 0.15s, color 0.15s;
}

.sidebar__link:hover {
  color: var(--text);
}

.sidebar__link--active {
  background: #3a3a3a;
  color: var(--text);
}

.sidebar__logout {
  background: none;
  border: none;
  color: #f87171;
  text-align: left;
  padding: 10px 14px;
  cursor: pointer;
  font-size: 14px;
  margin-top: auto;
}

.sidebar__logout:hover {
  opacity: 0.85;
}
</style>
