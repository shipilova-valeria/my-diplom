<template>
  <div class="profile-page">
    <h1 class="page-title">Профиль</h1>
    <div class="profile-layout">
      <div class="card profile-summary">
        <div class="avatar">{{ user?.initials }}</div>
        <h2>{{ user?.fullName }}</h2>
        <p class="text-muted">{{ user?.position }}</p>
        <span class="badge">{{ roleLabel(user?.role) }}</span>
        <p class="text-success status-active">Активен</p>
      </div>

      <form class="card profile-form" @submit.prevent="save">
        <section>
          <h3 class="section-title">ЛИЧНЫЕ ДАННЫЕ</h3>
          <div class="form-row">
            <div class="input-group">
              <label>Фамилия</label>
              <input v-model="form.lastName" class="input" />
            </div>
            <div class="input-group">
              <label>Имя</label>
              <input v-model="form.firstName" class="input" />
            </div>
          </div>
          <div class="input-group">
            <label>Отчество</label>
            <input v-model="form.middleName" class="input" />
          </div>
        </section>

        <section>
          <h3 class="section-title">КОНТАКТНЫЕ ДАННЫЕ</h3>
          <div class="input-group">
            <label>Адрес электронной почты</label>
            <input v-model="form.email" type="email" class="input" />
          </div>
          <div class="input-group">
            <label>Контактный телефон</label>
            <input v-model="form.phone" class="input" />
          </div>
        </section>

        <section>
          <h3 class="section-title">БЕЗОПАСНОСТЬ</h3>
          <div class="input-group">
            <label>Пароль</label>
            <input
              v-model="form.password"
              type="password"
              class="input"
              :class="{ 'input--password-required': highlightPassword }"
              :placeholder="auth.mustChangePassword ? 'Введите новый пароль' : 'Оставьте пустым, чтобы не менять'"
              autocomplete="new-password"
            />
            <p v-if="auth.mustChangePassword" class="field-hint field-hint--danger">
              Укажите новый пароль для продолжения работы в системе
            </p>
          </div>
        </section>

        <section>
          <h3 class="section-title">СЛУЖЕБНЫЕ ДАННЫЕ</h3>
          <div class="input-group locked">
            <label>Должность 🔒</label>
            <input :value="user?.position" class="input" disabled />
          </div>
          <div class="input-group locked">
            <label>Роль в системе 🔒</label>
            <input :value="roleLabel(user?.role)" class="input" disabled />
          </div>
        </section>

        <p v-if="message" :class="messageOk ? 'text-success' : 'text-danger'">{{ message }}</p>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="saving">Сохранить</button>
          <button type="button" class="btn btn-outline" @click="reset">Отмена</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';
import { roleLabel } from '../utils/roles.js';

const auth = useAuthStore();
const user = ref(null);
const form = ref({});
const saving = ref(false);
const message = ref('');
const messageOk = ref(true);

const highlightPassword = computed(() => auth.mustChangePassword);

function reset() {
  form.value = {
    lastName: user.value.lastName,
    firstName: user.value.firstName,
    middleName: user.value.middleName || '',
    email: user.value.email,
    phone: user.value.phone || '',
    password: '',
  };
}

async function load() {
  const { data } = await api.get('/profile');
  user.value = data.user;
    auth.$patch({ user: data.user });
    reset();
}

async function save() {
  saving.value = true;
  message.value = '';
  try {
    if (auth.mustChangePassword && (!form.value.password || form.value.password.length < 6)) {
      message.value = 'Укажите новый пароль (не менее 6 символов)';
      messageOk.value = false;
      return;
    }
    const payload = { ...form.value };
    if (!payload.password) delete payload.password;
    const wasRequired = auth.mustChangePassword;
    const { data } = await api.patch('/profile', payload);
    user.value = data.user;
    auth.$patch({ user: data.user });
    form.value.password = '';
    messageOk.value = true;
    message.value = wasRequired
      ? 'Пароль изменён. Теперь вы можете пользоваться системой.'
      : 'Профиль сохранён';
  } catch (e) {
    message.value = e.response?.data?.error || 'Ошибка сохранения';
    messageOk.value = false;
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.page-title {
  font-size: 1.75rem;
  margin-bottom: 28px;
}

.profile-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  align-items: start;
}

.profile-summary {
  text-align: center;
  padding: 28px 20px;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 auto 16px;
}

.profile-summary h2 {
  font-size: 1rem;
  margin-bottom: 4px;
}

.profile-summary .badge {
  margin: 12px 0;
}

.status-active {
  font-size: 14px;
  margin-top: 12px;
}

.profile-form section {
  margin-bottom: 28px;
}

.section-title {
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.locked .input:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  gap: 12px;
}

.input--password-required {
  border-color: var(--danger);
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.25);
}

.field-hint {
  font-size: 13px;
  margin-top: 6px;
}

.field-hint--danger {
  color: #fca5a5;
}

@media (max-width: 800px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}
</style>
