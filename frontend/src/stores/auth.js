import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api/client.js';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('erp_token') || '');
  const user = ref(JSON.parse(localStorage.getItem('erp_user') || 'null'));

  const role = computed(() => user.value?.role);
  const isAuthenticated = computed(() => !!token.value);
  const isHead = computed(() => role.value === 'head');
  const isManager = computed(() => role.value === 'manager');
  const isParticipant = computed(() => role.value === 'participant');
  const isAdmin = computed(() => role.value === 'admin');
  const isStaff = computed(() => ['head', 'manager', 'participant'].includes(role.value));
  const canManageProjects = computed(() => ['head', 'manager'].includes(role.value));
  const canManageUsers = computed(() => ['head', 'admin'].includes(role.value));
  const canCreateUsers = computed(() => role.value === 'admin');
  const canAssignUserRoles = computed(() => role.value === 'admin');
  const canDeleteTask = computed(() => ['head', 'manager'].includes(role.value));
  const canGenerateReport = computed(() => role.value === 'head');
  const mustChangePassword = computed(() => Boolean(user.value?.mustChangePassword));

  function persist() {
    if (token.value) localStorage.setItem('erp_token', token.value);
    else localStorage.removeItem('erp_token');
    if (user.value) localStorage.setItem('erp_user', JSON.stringify(user.value));
    else localStorage.removeItem('erp_user');
  }

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    token.value = data.token;
    user.value = data.user;
    persist();
    return data.user;
  }

  function logout() {
    token.value = '';
    user.value = null;
    persist();
  }

  async function fetchMe() {
    const { data } = await api.get('/auth/me');
    user.value = data.user;
    persist();
    return data.user;
  }

  return {
    token,
    user,
    role,
    isAuthenticated,
    isHead,
    isManager,
    isParticipant,
    isAdmin,
    isStaff,
    canManageProjects,
    canManageUsers,
    canCreateUsers,
    canAssignUserRoles,
    canDeleteTask,
    canGenerateReport,
    mustChangePassword,
    login,
    logout,
    fetchMe,
  };
});
