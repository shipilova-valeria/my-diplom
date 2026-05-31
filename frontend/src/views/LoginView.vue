<template>
  <div class="login-page">
    <div class="login-card card">
      <h2>Вход в систему</h2>
      <form autocomplete="off" @submit.prevent="onSubmit">
        <div class="input-group">
          <label>Email</label>
          <input
            v-model="email"
            type="email"
            class="input"
            name="erp-email"
            autocomplete="off"
            placeholder="Введите Email"
            required
          />
        </div>
        <div class="input-group">
          <label>Пароль</label>
          <input
            v-model="password"
            type="password"
            class="input"
            name="erp-password"
            autocomplete="new-password"
            placeholder="Введите пароль"
            required
          />
        </div>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <button type="submit" class="btn btn-primary login-btn" :disabled="loading">
          {{ loading ? 'Вход...' : 'Войти' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    router.push(auth.mustChangePassword ? '/profile' : '/dashboard');
  } catch (e) {
    error.value = e.response?.data?.error || 'Ошибка входа';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 420px;
}

.login-card h2 {
  font-size: 1.35rem;
  margin-bottom: 24px;
}

.login-btn {
  width: 100%;
  margin-top: 8px;
  padding: 14px;
}
</style>
