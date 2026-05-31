<template>
  <div class="projects-page">
    <header class="page-header">
      <h1>Список проектов</h1>
      <div v-if="auth.canManageProjects" class="page-header__actions">
        <button type="button" class="btn btn-outline" @click="openCreate">
          Создать проект
        </button>
      </div>
    </header>

    <MonthNavigator />

    <div class="filters">
      <button
        v-for="f in filters"
        :key="f.value"
        type="button"
        class="chip"
        :class="{ active: activeFilter === f.value }"
        @click="activeFilter = f.value"
      >
        {{ f.label }}
      </button>
    </div>

    <div v-if="loading" class="text-muted">Загрузка...</div>
    <div v-else class="projects-grid">
      <div
        v-for="p in projects"
        :key="p.id"
        class="card project-card"
        @click="goProject(p)"
      >
        <div class="project-card__head">
          <h3>{{ p.name }}</h3>
          <span class="status" :class="'status--' + p.status">{{ p.statusLabel }}</span>
        </div>
        <p class="project-meta">
          Срок: {{ formatDate(p.deadline) }} · PM: {{ p.pmName || '—' }}
        </p>
        <div class="progress-bar progress-bar--hours">
          <div
            class="progress-bar__fill"
            :class="{ overloaded: hoursProgress(p) >= 90 }"
            :style="{ width: hoursProgress(p) + '%' }"
          />
        </div>
        <div class="project-card__foot">
          <span class="text-muted">
            {{ p.status === 'completed' || p.status === 'archived' ? 'Завершён' : `${p.tasksInProgress} задач в работе` }}
          </span>
          <span class="hours-badge">{{ hoursLabel(p) }}</span>
        </div>
      </div>
    </div>

    <ProjectFormModal
      :show="showModal"
      :project="null"
      @close="showModal = false"
      @saved="load"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';
import { useMonthFilter } from '../composables/useMonthFilter.js';
import MonthNavigator from '../components/MonthNavigator.vue';
import ProjectFormModal from '../components/ProjectFormModal.vue';

const auth = useAuthStore();
const month = useMonthFilter();
const router = useRouter();
const projects = ref([]);
const loading = ref(true);
const activeFilter = ref('all');
const showModal = ref(false);

const filters = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'paused', label: 'На паузе' },
  { value: 'completed', label: 'Завершённые' },
  { value: 'by_deadline', label: 'По сроку' },
];

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU');
}

function goProject(p) {
  router.push({ name: 'project-detail', params: { id: p.id } });
}

function openCreate() {
  showModal.value = true;
}

function hoursProgress(p) {
  return p.hoursProgress ?? 0;
}

function hoursLabel(p) {
  const tracked = p.trackedHours ?? 0;
  const plan = p.allocatedHours || 0;
  return `${formatHours(tracked)} / ${plan} ч.`;
}

function formatHours(h) {
  const n = Number(h);
  if (Number.isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/projects', {
      params: {
        ...month.params(),
        status: activeFilter.value === 'all' ? undefined : activeFilter.value,
      },
    });
    projects.value = data;
  } finally {
    loading.value = false;
  }
}

watch(activeFilter, load);
watch([month.year, month.month], load);
onMounted(load);
</script>

<style scoped>
.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.project-card {
  cursor: pointer;
  transition: transform 0.15s;
}

.project-card:hover {
  transform: translateY(-2px);
}

.project-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.project-card__head h3 {
  font-size: 1.1rem;
}

.status { font-size: 13px; font-weight: 500; }
.status--active { color: var(--success); }
.status--on_review { color: var(--warning); }
.status--paused { color: var(--text-muted); }
.status--archived, .status--completed { color: var(--text-dim); }

.project-meta {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.project-card .progress-bar {
  margin-bottom: 12px;
}

.progress-bar--hours .progress-bar__fill.overloaded {
  background: var(--danger);
}

.hours-badge {
  font-weight: 600;
  color: var(--text);
}

.project-card__foot {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

@media (max-width: 900px) {
  .projects-grid { grid-template-columns: 1fr; }
}
</style>
