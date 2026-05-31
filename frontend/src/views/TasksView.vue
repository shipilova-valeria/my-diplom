<template>
  <div class="tasks-page">
    <h1 class="page-title">Задачи</h1>

    <MonthNavigator />

    <div class="project-select">
      <label class="text-muted">Выберите проект:</label>
      <select v-model="selectedProjectId" class="input" @change="onProjectChange">
        <option :value="null">—</option>
        <option v-for="p in projectList" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
    </div>

    <KanbanBoard
      :columns="displayBoard"
      :loading="loading && !!selectedProjectId"
      :draggable="!!selectedProjectId"
      :can-create-task="auth.isStaff && !!selectedProjectId"
      @create-task="openCreateTask"
      @drop="onDrop"
      @drag-start="onDragStart"
      @open-task="openTask"
      @time-changed="load"
    >
      <template v-if="selectedProjectId" #toolbar>
        <input
          v-model="search"
          type="search"
          class="input search-input"
          placeholder="Поиск по задачам..."
          @input="debouncedLoad"
        />
      </template>
    </KanbanBoard>

    <TaskFormModal
      v-if="selectedProjectId"
      :show="showCreate || !!selectedTask"
      :task="selectedTask"
      :project-id="Number(selectedProjectId)"
      :can-delete="auth.canDeleteTask"
      @close="closeModal"
      @saved="load"
      @delete="deleteTask"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import api from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';
import { useMonthFilter } from '../composables/useMonthFilter.js';
import MonthNavigator from '../components/MonthNavigator.vue';
import KanbanBoard from '../components/KanbanBoard.vue';
import TaskFormModal from '../components/TaskFormModal.vue';

const auth = useAuthStore();
const month = useMonthFilter();
const EMPTY_BOARD = [
  { id: 'todo', title: 'К выполнению', tasks: [], count: 0 },
  { id: 'in_progress', title: 'В работе', tasks: [], count: 0 },
  { id: 'in_review', title: 'На проверке', tasks: [], count: 0 },
  { id: 'done', title: 'Завершено', tasks: [], count: 0 },
];

const board = ref([...EMPTY_BOARD]);
const loading = ref(false);
const search = ref('');
const projectList = ref([]);
const selectedProjectId = ref(null);
const showCreate = ref(false);
const selectedTask = ref(null);
const draggedTask = ref(null);
let debounceTimer;

const displayBoard = computed(() =>
  selectedProjectId.value ? board.value : EMPTY_BOARD
);

async function loadProjects() {
  const { data } = await api.get('/projects', { params: month.params() });
  projectList.value = data;
}

async function load() {
  if (!selectedProjectId.value) {
    board.value = [...EMPTY_BOARD];
    return;
  }
  loading.value = true;
  try {
    const { data } = await api.get(`/tasks/project/${selectedProjectId.value}/kanban`, {
      params: { ...month.params(), search: search.value || undefined },
    });
    board.value = data;
  } finally {
    loading.value = false;
  }
}

function onProjectChange() {
  search.value = '';
  load();
}

function debouncedLoad() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(load, 300);
}

function onDragStart({ task }) {
  draggedTask.value = task;
}

async function onDrop({ status }) {
  const task = draggedTask.value;
  if (!task || task.status === status) return;
  await api.patch(`/tasks/${task.id}/status`, { status });
  draggedTask.value = null;
  load();
}

function openCreateTask() {
  if (!selectedProjectId.value) return;
  selectedTask.value = null;
  showCreate.value = true;
}

function openTask(task) {
  if (!selectedProjectId.value) return;
  selectedTask.value = task;
}

function closeModal() {
  showCreate.value = false;
  selectedTask.value = null;
}

async function deleteTask() {
  if (!selectedTask.value || !confirm('Удалить задачу?')) return;
  await api.delete(`/tasks/${selectedTask.value.id}`);
  closeModal();
  load();
}

onMounted(loadProjects);
watch(selectedProjectId, load);
watch([month.year, month.month], () => {
  loadProjects();
  load();
});
</script>

<style scoped>
.page-title {
  font-size: 1.75rem;
  margin-bottom: 24px;
}

.project-select {
  margin-bottom: 16px;
  max-width: 100%;
}

.project-select label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
}

.project-select .input {
  max-width: 480px;
}

.search-bar {
  margin-bottom: 20px;
  max-width: 480px;
}
</style>
