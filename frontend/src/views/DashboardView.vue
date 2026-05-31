<template>
  <div class="dashboard">
    <header class="page-header">
      <h1>{{ title }}</h1>
      <div v-if="auth.canGenerateReport" class="page-header__actions">
        <button type="button" class="btn btn-outline" :disabled="reportLoading" @click="onReport">
          {{ reportLoading ? 'Формирование...' : 'Сформировать отчёт' }}
        </button>
      </div>
    </header>

    <MonthNavigator />

    <div v-if="loading" class="text-muted">Загрузка...</div>

    <template v-else-if="auth.isHead && headData">
      <div class="stats-grid stats-grid--4">
        <div class="card stat-card">
          <p class="stat-label">Активные проекты</p>
          <p class="stat-value">{{ headData.activeProjects }}</p>
          <p class="text-success stat-sub">+{{ headData.projectsGrowth }} за период</p>
        </div>
        <div class="card stat-card">
          <p class="stat-label">Просроченные задачи</p>
          <p class="stat-value">{{ headData.overdueTasks }}</p>
          <p class="text-danger stat-sub">требуют контроля</p>
        </div>
        <div class="card stat-card">
          <p class="stat-label">Средняя загрузка</p>
          <p class="stat-value">{{ headData.avgWorkload }}%</p>
          <p class="text-muted stat-sub">по активным задачам</p>
        </div>
        <div class="card stat-card">
          <p class="stat-label">Выполнение планов</p>
          <p class="stat-value">{{ headData.planFulfillment }}%</p>
          <p class="text-muted stat-sub">по срокам</p>
        </div>
      </div>
      <div class="widgets-row">
        <div class="card widget">
          <h3>Загрузка сотрудников</h3>
          <div v-for="emp in headData.employeeWorkload" :key="emp.id" class="workload-row">
            <span class="workload-name">
              {{ emp.name }}
              <span class="workload-tasks">{{ taskCountLabel(emp.taskCount) }}</span>
            </span>
            <div class="progress-bar flex-grow">
              <div
                class="progress-bar__fill"
                :class="{ overloaded: emp.workload >= 90 }"
                :style="{ width: emp.workload + '%' }"
              />
            </div>
            <span class="workload-pct" :class="{ 'text-danger': emp.workload >= 90 }">{{ emp.workload }}%</span>
          </div>
          <p v-if="!headData.employeeWorkload?.length" class="text-muted">Нет данных за период</p>
        </div>
        <div class="card widget">
          <h3>Критические события</h3>
          <ul class="events-list">
            <li v-for="ev in headData.criticalEvents" :key="ev.id">
              <span>{{ ev.name }}</span>
              <span :class="severityClass(ev.severity)">{{ ev.message }}</span>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <template v-else-if="auth.isAdmin && adminData">
      <div class="stats-grid stats-grid--2">
        <div class="card stat-card">
          <p class="stat-label">Всего пользователей</p>
          <p class="stat-value">{{ adminData.totalUsers }}</p>
          <p class="text-success stat-sub">зарегистрировано в системе</p>
        </div>
        <div class="card stat-card">
          <p class="stat-label">Активные пользователи</p>
          <p class="stat-value">{{ adminData.activeUsers }}</p>
        </div>
        <div class="card stat-card">
          <p class="stat-label">Новые за период</p>
          <p class="stat-value">{{ adminData.registeredInMonth }}</p>
          <p class="text-muted stat-sub">приняты на работу</p>
        </div>
      </div>
    </template>

    <template v-else-if="staffData">
      <div class="stats-grid stats-grid--2">
        <div class="card stat-card">
          <p class="stat-label">Активные проекты</p>
          <p class="stat-value">{{ staffData.activeProjects }}</p>
          <p v-if="staffData.projectsGrowth > 0" class="growth-badge">↑ +{{ staffData.projectsGrowth }} за период</p>
          <p v-else class="text-success stat-sub">участие в проектах</p>
        </div>
        <div class="card stat-card">
          <p class="stat-label">Просроченные задачи</p>
          <p class="stat-value">{{ staffData.overdueTasks }}</p>
          <p class="text-danger stat-sub">требуют контроля</p>
        </div>
      </div>
      <div class="card widget">
        <h3>Работа на проектах</h3>
        <div v-for="p in staffData.projects" :key="p.id" class="project-row">
          <span>{{ p.name }}</span>
          <div class="progress-bar flex-grow">
            <div
              class="progress-bar__fill"
              :class="{ overloaded: progressPct(p) >= 90 }"
              :style="{ width: progressPct(p) + '%' }"
            />
          </div>
          <span class="hours">{{ hoursLabel(p) }}</span>
        </div>
        <p v-if="!staffData.projects?.length" class="text-muted">Нет проектов за выбранный месяц</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import api from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';
import { useMonthFilter } from '../composables/useMonthFilter.js';
import MonthNavigator from '../components/MonthNavigator.vue';
import { downloadExcelReport } from '../utils/downloadReport.js';

const auth = useAuthStore();
const month = useMonthFilter();
const loading = ref(true);
const reportLoading = ref(false);
const headData = ref(null);
const adminData = ref(null);
const staffData = ref(null);

const title = computed(() => {
  if (auth.isHead) return 'Панель руководителя';
  if (auth.isAdmin) return 'Панель администратора';
  if (auth.isManager) return 'Панель менеджера';
  return 'Панель сотрудника';
});

function severityClass(s) {
  return { danger: 'text-danger', warning: 'text-warning', info: 'text-muted' }[s] || 'text-muted';
}

function progressPct(p) {
  if (p.hoursProgress != null) return p.hoursProgress;
  const total = p.allocatedHours || p.memberHours || 1;
  const tracked = p.trackedHours ?? p.loggedHours ?? 0;
  return Math.min(100, Math.round((tracked / total) * 100));
}

function hoursLabel(p) {
  const tracked = p.trackedHours ?? p.loggedHours ?? 0;
  const plan = p.allocatedHours || p.memberHours || 0;
  return `${formatHours(tracked)}ч / ${plan}ч`;
}

function formatHours(h) {
  const n = Number(h);
  if (Number.isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function taskCountLabel(count) {
  const n = Number(count) || 0;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} задача`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} задачи`;
  return `${n} задач`;
}

async function load() {
  loading.value = true;
  const p = month.params();
  try {
    if (auth.isHead) {
      const { data } = await api.get('/dashboard/head', { params: p });
      headData.value = data;
    } else if (auth.isAdmin) {
      const { data } = await api.get('/dashboard/admin', { params: p });
      adminData.value = data;
    } else if (auth.isManager) {
      const { data } = await api.get('/dashboard/manager', { params: p });
      staffData.value = data;
    } else {
      const { data } = await api.get('/dashboard/employee', { params: p });
      staffData.value = data;
    }
  } finally {
    loading.value = false;
  }
}

async function onReport() {
  reportLoading.value = true;
  try {
    await downloadExcelReport(month.params());
  } catch (e) {
    alert(e.response?.data?.error || 'Не удалось сформировать отчёт');
  } finally {
    reportLoading.value = false;
  }
}

watch([month.year, month.month], load);
onMounted(load);
</script>

<style scoped>
.stats-grid {
  display: grid;
  gap: 16px;
  margin-bottom: 24px;
}

.stats-grid--4 {
  grid-template-columns: repeat(4, 1fr);
}

.stats-grid--2 {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  max-width: 900px;
}

.stat-card .stat-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
}

.stat-sub {
  font-size: 13px;
  margin-top: 4px;
}

.growth-badge {
  display: inline-block;
  margin-top: 8px;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(34, 197, 94, 0.15);
  color: var(--success);
  font-size: 12px;
}

.widgets-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.widget h3 {
  font-size: 1rem;
  margin-bottom: 16px;
}

.workload-row,
.project-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.workload-name {
  width: 140px;
  font-size: 14px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.workload-tasks {
  font-size: 11px;
  color: var(--text-muted);
}

.flex-grow {
  flex: 1;
}

.workload-pct,
.hours {
  width: 56px;
  text-align: right;
  font-size: 14px;
}

.events-list {
  list-style: none;
}

.events-list li {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
}

@media (max-width: 1100px) {
  .stats-grid--4 { grid-template-columns: repeat(2, 1fr); }
  .widgets-row { grid-template-columns: 1fr; }
}
</style>
