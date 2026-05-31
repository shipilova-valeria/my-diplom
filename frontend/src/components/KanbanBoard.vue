<template>
  <div class="kanban-board">
    <div class="kanban-toolbar">
      <button
        v-if="canCreateTask"
        type="button"
        class="btn btn-outline"
        @click="emit('create-task')"
      >
        Создать задачу
      </button>
      <slot name="toolbar" />
    </div>

    <div v-if="loading" class="text-muted">Загрузка...</div>
    <div v-else class="kanban">
    <div
      v-for="col in columns"
      :key="col.id"
      class="kanban-column"
      @dragover.prevent
      @drop="emitDrop($event, col.id)"
    >
      <h3 class="column-title">
        {{ col.title }} <span class="count">{{ col.count }}</span>
      </h3>
      <div
        v-for="task in col.tasks"
        :key="task.id"
        class="task-card"
        :draggable="draggable"
        @dragstart="emitDrag($event, task)"
        @click="emit('open-task', task)"
      >
        <p class="task-title">{{ task.title }}</p>
        <span v-if="task.priority" class="badge" :class="'badge-' + task.priority">
          {{ priorityLabel(task.priority) }}
        </span>
        <p class="task-meta">{{ task.assigneeName || 'Не назначен' }}</p>
        <p v-if="task.deadline" class="task-deadline">до {{ formatDeadline(task.deadline) }}</p>

        <div v-if="timeEnabled" class="task-time" @click.stop>
          <div class="time-header">
            <span class="time-total" title="Всего по задаче">⏱ {{ totalLabel(task) }}</span>
            <button
              v-if="!task.timeTracking?.myIsActive"
              type="button"
              class="btn-time"
              :disabled="timeBusy === task.id"
              @click="startTime(task)"
            >
              ▶
            </button>
            <button
              v-else
              type="button"
              class="btn-time btn-time--stop"
              :disabled="timeBusy === task.id"
              @click="stopTime(task)"
            >
              ■
            </button>
          </div>
          <ul v-if="task.timeTracking?.trackers?.length" class="time-trackers">
            <li
              v-for="tr in task.timeTracking.trackers"
              :key="tr.userId"
              :class="{ 'time-tracker--active': tr.isActive }"
            >
              <span class="tracker-name">{{ tr.userName }}</span>
              <span class="tracker-mins">{{ trackerLabel(tr) }}</span>
            </li>
          </ul>
        </div>

        <span v-if="col.id === 'done'" class="badge badge-done">Done</span>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import api from '../api/client.js';
import { formatDuration, taskTotalMinutes, trackerMinutes } from '../utils/timeFormat.js';

defineProps({
  columns: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  draggable: { type: Boolean, default: true },
  timeEnabled: { type: Boolean, default: true },
  canCreateTask: { type: Boolean, default: true },
});

const emit = defineEmits(['drop', 'drag-start', 'open-task', 'time-changed', 'create-task']);

const timeBusy = ref(null);
const now = ref(Date.now());
let ticker;

onMounted(() => {
  ticker = setInterval(() => {
    now.value = Date.now();
  }, 15000);
});

onUnmounted(() => {
  if (ticker) clearInterval(ticker);
});

function priorityLabel(p) {
  return { high: 'High', medium: 'Medium', low: 'Low' }[p] || p;
}

function formatDeadline(d) {
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function totalLabel(task) {
  return formatDuration(taskTotalMinutes(task.timeTracking, now.value));
}

function trackerLabel(tr) {
  return formatDuration(trackerMinutes(tr, now.value));
}

async function startTime(task) {
  timeBusy.value = task.id;
  try {
    await api.post(`/tasks/${task.id}/time/start`);
    emit('time-changed');
  } finally {
    timeBusy.value = null;
  }
}

async function stopTime(task) {
  timeBusy.value = task.id;
  try {
    await api.post(`/tasks/${task.id}/time/stop`);
    emit('time-changed');
  } finally {
    timeBusy.value = null;
  }
}

function emitDrop(e, status) {
  emit('drop', { event: e, status });
}

function emitDrag(e, task) {
  emit('drag-start', { event: e, task });
}
</script>

<style scoped>
.kanban-board {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.kanban-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.kanban-toolbar :deep(.search-input) {
  flex: 1;
  min-width: 200px;
  max-width: 480px;
}

.kanban {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  align-items: start;
}

.kanban-column {
  background: #252525;
  border-radius: var(--radius);
  padding: 14px;
  min-height: 320px;
}

.column-title {
  font-size: 14px;
  margin-bottom: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

.count {
  background: #333;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  margin-left: 4px;
}

.task-card {
  background: var(--bg-card);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
  cursor: pointer;
}

.task-card[draggable='true'] {
  cursor: grab;
}

.task-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
}

.task-meta,
.task-deadline {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
}

.task-time {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.time-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.time-total {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.btn-time {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #333;
  color: var(--success);
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
}

.btn-time:hover:not(:disabled) {
  border-color: var(--success);
}

.btn-time--stop {
  color: #f87171;
}

.btn-time--stop:hover:not(:disabled) {
  border-color: #f87171;
}

.btn-time:disabled {
  opacity: 0.5;
  cursor: wait;
}

.time-trackers {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.time-trackers li {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-muted);
}

.time-tracker--active {
  color: var(--success);
}

.tracker-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 65%;
}

.badge-done {
  margin-top: 8px;
  background: #444;
  color: var(--text-muted);
}

@media (max-width: 1200px) {
  .kanban {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
