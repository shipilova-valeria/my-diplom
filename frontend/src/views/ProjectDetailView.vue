<template>
  <div class="project-detail">
    <header class="page-header">
      <div class="header-left">
        <h1>{{ project?.name || 'Проект' }}</h1>
        <button type="button" class="btn-link" @click="showEdit = true">Информация о проекте</button>
      </div>
      <div class="header-actions">
        <button
          v-if="auth.canManageProjects"
          type="button"
          class="btn-link text-danger"
          @click="confirmDeleteProject"
        >
          Удалить проект
        </button>
        <button
          v-if="auth.canGenerateReport"
          type="button"
          class="btn btn-outline"
          :disabled="reportLoading"
          @click="onReport"
        >
          {{ reportLoading ? 'Формирование...' : 'Сформировать отчёт' }}
        </button>
      </div>
    </header>

    <MonthNavigator />

    <div v-if="project" class="card project-hours">
      <div class="project-hours__row">
        <span class="project-hours__label">Затрачено за {{ month.label }}</span>
        <span class="project-hours__value">{{ hoursLabel(project) }}</span>
      </div>
      <div class="progress-bar">
        <div
          class="progress-bar__fill"
          :class="{ overloaded: hoursProgress(project) >= 90 }"
          :style="{ width: hoursProgress(project) + '%' }"
        />
      </div>
      <p class="text-muted project-hours__hint">
        Учтено время из трекинга задач на канбан-доске
      </p>
    </div>

    <KanbanBoard
      :columns="board"
      :loading="loading"
      :can-create-task="auth.isStaff"
      @create-task="openCreateTask"
      @drop="onDrop"
      @drag-start="onDragStart"
      @open-task="openTask"
      @time-changed="onTimeChanged"
    >
      <template #toolbar>
        <input
          v-model="search"
          type="search"
          class="input search-input"
          placeholder="Поиск по задачам..."
          @input="debouncedLoad"
        />
      </template>
    </KanbanBoard>

    <ProjectFormModal
      :show="showEdit"
      :project="project"
      :can-delete="auth.canManageProjects"
      @close="showEdit = false"
      @saved="onProjectSaved"
      @delete="confirmDeleteProject"
    />

    <TaskFormModal
      :show="showCreateTask || !!selectedTask"
      :task="selectedTask"
      :project-id="projectId"
      :can-delete="auth.canDeleteTask"
      @close="closeTaskModal"
      @saved="loadBoard"
      @delete="deleteTask"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';
import { useMonthFilter } from '../composables/useMonthFilter.js';
import MonthNavigator from '../components/MonthNavigator.vue';
import KanbanBoard from '../components/KanbanBoard.vue';
import ProjectFormModal from '../components/ProjectFormModal.vue';
import TaskFormModal from '../components/TaskFormModal.vue';
import { downloadExcelReport } from '../utils/downloadReport.js';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const month = useMonthFilter();

const project = ref(null);
const board = ref([]);
const loading = ref(true);
const search = ref('');
const showEdit = ref(false);
const showCreateTask = ref(false);
const selectedTask = ref(null);
const draggedTask = ref(null);
const reportLoading = ref(false);
let debounceTimer;

const projectId = computed(() => Number(route.params.id));

function hoursProgress(p) {
  return p?.hoursProgress ?? 0;
}

function hoursLabel(p) {
  if (!p) return '0 / 0 ч.';
  const tracked = p.trackedHours ?? 0;
  const plan = p.allocatedHours || 0;
  return `${formatHours(tracked)} / ${plan} ч.`;
}

function formatHours(h) {
  const n = Number(h);
  if (Number.isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

async function loadProject() {
  const { data } = await api.get(`/projects/${projectId.value}`, {
    params: month.params(),
  });
  project.value = data;
}

async function onTimeChanged() {
  await loadBoard();
  await loadProject();
}

async function loadBoard() {
  loading.value = true;
  try {
    const { data } = await api.get(`/tasks/project/${projectId.value}/kanban`, {
      params: { ...month.params(), search: search.value || undefined },
    });
    board.value = data;
  } finally {
    loading.value = false;
  }
}

function debouncedLoad() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadBoard, 300);
}

function onDragStart({ task }) {
  draggedTask.value = task;
}

async function onDrop({ status }) {
  const task = draggedTask.value;
  if (!task || task.status === status) return;
  await api.patch(`/tasks/${task.id}/status`, { status });
  draggedTask.value = null;
  loadBoard();
}

function openCreateTask() {
  selectedTask.value = null;
  showCreateTask.value = true;
}

function openTask(task) {
  selectedTask.value = task;
}

function closeTaskModal() {
  showCreateTask.value = false;
  selectedTask.value = null;
}

async function deleteTask() {
  if (!selectedTask.value || !confirm('Удалить задачу?')) return;
  await api.delete(`/tasks/${selectedTask.value.id}`);
  closeTaskModal();
  loadBoard();
}

async function confirmDeleteProject() {
  if (!confirm('Удалить проект? Все задачи будут удалены.')) return;
  await api.delete(`/projects/${projectId.value}`);
  router.push('/projects');
}

function onProjectSaved(data) {
  project.value = data;
  showEdit.value = false;
}

async function onReport() {
  reportLoading.value = true;
  try {
    await downloadExcelReport({ ...month.params(), projectId: projectId.value });
  } catch (e) {
    alert(e.response?.data?.error || 'Не удалось сформировать отчёт');
  } finally {
    reportLoading.value = false;
  }
}

onMounted(async () => {
  await loadProject();
  await loadBoard();
});

watch(() => route.params.id, async () => {
  await loadProject();
  await loadBoard();
});

watch([month.year, month.month], () => {
  loadProject();
  loadBoard();
});
</script>

<style scoped>
.header-left {
  display: flex;
  align-items: baseline;
  gap: 16px;
  flex-wrap: wrap;
}

.header-left h1 {
  font-size: 1.75rem;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.btn-link {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  padding: 0;
}

.btn-link:hover {
  color: var(--text);
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  align-items: center;
}

.search-input {
  flex: 1;
  max-width: 480px;
}

.report-json {
  background: var(--bg-input);
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  overflow: auto;
  max-height: 400px;
}

.project-hours {
  margin-bottom: 20px;
  padding: 18px 20px;
}

.project-hours__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.project-hours__label {
  font-size: 14px;
  color: var(--text-muted);
}

.project-hours__value {
  font-size: 1.1rem;
  font-weight: 700;
}

.project-hours .progress-bar {
  margin-bottom: 8px;
}

.project-hours .progress-bar__fill.overloaded {
  background: var(--danger);
}

.project-hours__hint {
  font-size: 12px;
  margin: 0;
}
</style>
