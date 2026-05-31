<template>
  <div class="users-page">
    <header class="page-header">
      <div>
        <h1>Управление пользователями</h1>
        <p class="subtitle">Добавление сотрудников, назначение ролей и управление доступом</p>
      </div>
      <div v-if="auth.canCreateUsers" class="page-header__actions">
        <button type="button" class="btn btn-outline" @click="openCreate">
          Добавить пользователя
        </button>
      </div>
    </header>

    <div class="card table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Сотрудник</th>
            <th>Должность</th>
            <th>Роль</th>
            <th>Статус</th>
            <th class="th-actions">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ displayName(u) }}</td>
            <td>{{ u.position }}</td>
            <td><span class="badge">{{ roleLabel(u.role) }}</span></td>
            <td><span class="text-success">{{ u.status === 'active' ? 'Активен' : 'Отключён' }}</span></td>
            <td class="actions-cell">
              <button type="button" class="icon-btn" title="Изменить" @click="editUser(u)">
                <IconEdit />
              </button>
              <button
                v-if="canDisable(u)"
                type="button"
                class="icon-btn icon-btn--danger"
                title="Отключить"
                @click="disableUser(u)"
              >
                <IconBan />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <h2>{{ modalTitle }}</h2>
        <form @submit.prevent="saveUser">
          <div class="input-group">
            <label>Email</label>
            <input v-model="form.email" type="email" class="input" required />
          </div>
          <div class="input-group">
            <label>Фамилия</label>
            <input v-model="form.lastName" class="input" required />
          </div>
          <div class="input-group">
            <label>Имя</label>
            <input v-model="form.firstName" class="input" required />
          </div>
          <div class="input-group">
            <label>Отчество</label>
            <input v-model="form.middleName" class="input" />
          </div>
          <div class="input-group">
            <label>Должность</label>
            <input v-model="form.position" class="input" required />
          </div>
          <div v-if="auth.canAssignUserRoles" class="input-group">
            <label>Роль</label>
            <select v-model="form.role" class="input">
              <option value="participant">Участник</option>
              <option value="manager">Менеджер</option>
              <option value="head">Руководитель</option>
              <option value="admin">Администратор</option>
            </select>
          </div>
          <div v-if="!form.id" class="input-group">
            <label>Пароль</label>
            <input v-model="form.password" type="password" class="input" placeholder="password123" />
          </div>
          <div class="modal-actions" :class="{ 'modal-actions--spread': form.id && auth.isAdmin }">
            <div class="modal-actions__left">
              <button type="submit" class="btn btn-primary">Сохранить</button>
              <button type="button" class="btn btn-outline" @click="showModal = false">Отмена</button>
            </div>
            <button
              v-if="form.id && auth.isAdmin"
              type="button"
              class="btn-link text-muted"
              @click="resetPassword"
            >
              Сбросить пароль
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';
import { roleLabel } from '../utils/roles.js';
import IconEdit from '../components/IconEdit.vue';
import IconBan from '../components/IconBan.vue';

const auth = useAuthStore();
const users = ref([]);
const showModal = ref(false);
const form = ref({
  id: null,
  email: '',
  lastName: '',
  firstName: '',
  middleName: '',
  position: '',
  role: 'participant',
  password: '',
});

const modalTitle = computed(() => (form.value.id ? 'Изменить пользователя' : 'Новый пользователь'));

function displayName(u) {
  return [u.lastName, u.firstName, u.middleName].filter(Boolean).join(' ');
}

function canDisable(u) {
  return u.status === 'active' && u.id !== auth.user?.id && u.role !== 'admin';
}

function openCreate() {
  form.value = {
    id: null,
    email: '',
    lastName: '',
    firstName: '',
    middleName: '',
    position: '',
    role: 'participant',
    password: '',
  };
  showModal.value = true;
}

function editUser(u) {
  form.value = { ...u, password: '' };
  showModal.value = true;
}

async function disableUser(u) {
  if (!confirm(`Отключить ${displayName(u)}?`)) return;
  await api.patch(`/users/${u.id}`, { status: 'disabled' });
  load();
}

async function resetPassword() {
  if (!confirm('Сбросить пароль на password123?')) return;
  await api.post(`/users/${form.value.id}/reset-password`);
  alert('Пароль сброшен на password123');
}

async function load() {
  const { data } = await api.get('/users');
  users.value = data;
}

async function saveUser() {
  if (form.value.id) {
    await api.patch(`/users/${form.value.id}`, form.value);
  } else {
    await api.post('/users', form.value);
  }
  showModal.value = false;
  load();
}

onMounted(load);
</script>

<style scoped>
.subtitle {
  color: var(--text-muted);
  font-size: 14px;
  margin-top: 4px;
}

.table-wrap {
  overflow-x: auto;
  padding: 0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 14px 20px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
}

.data-table th {
  color: var(--text-muted);
  font-weight: 600;
}

.th-actions {
  text-align: right;
  width: 140px;
}

.icon-btn--danger:hover {
  color: var(--danger);
  border-color: rgba(239, 68, 68, 0.4);
}

.modal-actions--spread {
  justify-content: space-between;
  align-items: center;
}

.modal-actions__left {
  display: flex;
  gap: 12px;
}

.btn-link {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
}
</style>
