<template>
  <div class="app-shell">
    <AppSidebar />
    <main class="main-content">
      <div v-if="auth.mustChangePassword" class="password-banner" role="alert">
        Для продолжения работы необходимо сменить пароль. Укажите новый пароль в разделе «Профиль» и
        нажмите «Сохранить».
      </div>
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import AppSidebar from '../components/AppSidebar.vue';
import { RouterView } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
</script>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  padding: 32px 40px;
  overflow-x: auto;
}

.password-banner {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.45);
  color: #fecaca;
  padding: 14px 18px;
  border-radius: var(--radius);
  margin-bottom: 24px;
  font-size: 14px;
  line-height: 1.5;
}
</style>
