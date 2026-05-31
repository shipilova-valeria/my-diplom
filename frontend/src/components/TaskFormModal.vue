<template>
  <div v-if="show" class="modal-overlay" @click.self="emit('close')">
    <div class="modal modal--wide">
      <h2>{{ task ? 'Задача' : 'Новая задача' }}</h2>
      <form @submit.prevent="submit">
        <div class="input-group">
          <label>Название</label>
          <input v-model="form.title" class="input" required />
        </div>
        <div class="input-group">
          <label>Описание</label>
          <textarea v-model="form.description" class="input" rows="3" />
        </div>
        <div class="input-group">
          <label>Исполнитель</label>
          <select v-model.number="form.assigneeId" class="input">
            <option :value="null">Не назначен</option>
            <option v-for="a in assignees" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
        </div>
        <div class="input-group">
          <label>Приоритет</label>
          <select v-model="form.priority" class="input">
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div class="input-group">
          <label>Срок</label>
          <input v-model="form.deadline" type="date" class="input" />
        </div>
        <div v-if="task" class="time-section">
          <h4>Учёт времени</h4>
          <p class="time-summary">
            Всего: <strong>{{ timeSummaryLabel }}</strong>
            <span v-if="timeDetail?.summary?.myIsActive" class="time-running"> · идёт запись</span>
          </p>
          <ul v-if="timeDetail?.summary?.trackers?.length" class="time-list">
            <li v-for="tr in timeDetail.summary.trackers" :key="tr.userId">
              <span>{{ tr.userName }}</span>
              <span :class="{ 'text-success': tr.isActive }">{{ trackerLabel(tr) }}</span>
            </li>
          </ul>
          <div class="time-actions">
            <button
              v-if="!timeDetail?.summary?.myIsActive"
              type="button"
              class="btn btn-outline btn-sm"
              @click="startTimer"
            >
              ▶ Начать
            </button>
            <button v-else type="button" class="btn btn-outline btn-sm" @click="stopTimer">
              ■ Остановить
            </button>
            <div class="manual-time">
              <input
                v-model.number="manualMinutes"
                type="number"
                min="1"
                class="input input-sm"
                placeholder="мин"
              />
              <button type="button" class="btn btn-outline btn-sm" @click="logManual">Добавить</button>
            </div>
          </div>
        </div>

        <div v-if="task" class="comments">
          <h4>Комментарии</h4>
          <div v-for="c in comments" :key="c.id" class="comment">
            <strong>{{ c.author }}</strong>: {{ c.content }}
          </div>
          <div class="input-group">
            <input v-model="newComment" class="input" placeholder="Добавить комментарий..." />
            <button type="button" class="btn btn-outline comment-send" @click="sendComment">
              Отправить
            </button>
          </div>
        </div>
        <div class="modal-actions" :class="{ 'modal-actions--spread': task && canDelete }">
          <div class="modal-actions__left">
            <button type="submit" class="btn btn-primary">Сохранить</button>
            <button type="button" class="btn btn-outline" @click="emit('close')">Отмена</button>
          </div>
          <button
            v-if="task && canDelete"
            type="button"
            class="btn-link text-danger"
            @click="emit('delete')"
          >
            Удалить задачу
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import api from '../api/client.js';
import { formatDuration, taskTotalMinutes, trackerMinutes } from '../utils/timeFormat.js';

const props = defineProps({
  show: Boolean,
  task: { type: Object, default: null },
  projectId: { type: Number, required: true },
  canDelete: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'saved', 'delete']);

const assignees = ref([]);
const comments = ref([]);
const newComment = ref('');
const timeDetail = ref(null);
const manualMinutes = ref(30);
const timeNow = ref(Date.now());
const form = ref({
  title: '',
  description: '',
  assigneeId: null,
  priority: 'medium',
  deadline: '',
});

watch(
  () => [props.show, props.task],
  async () => {
    if (!props.show) return;
    const { data: list } = await api.get('/tasks/assignees');
    assignees.value = list;
    if (props.task) {
      form.value = {
        title: props.task.title,
        description: props.task.description || '',
        assigneeId: props.task.assigneeId,
        priority: props.task.priority,
        deadline: props.task.deadline ? props.task.deadline.slice(0, 10) : '',
      };
      await loadComments();
      await loadTime();
    } else {
      form.value = {
        title: '',
        description: '',
        assigneeId: null,
        priority: 'medium',
        deadline: '',
      };
      comments.value = [];
      timeDetail.value = null;
    }
  }
);

const timeSummaryLabel = computed(() => {
  if (!timeDetail.value?.summary) return '0м';
  return formatDuration(taskTotalMinutes(timeDetail.value.summary, timeNow.value));
});

function trackerLabel(tr) {
  return formatDuration(trackerMinutes(tr, timeNow.value));
}

async function loadTime() {
  if (!props.task) return;
  const { data } = await api.get(`/tasks/${props.task.id}/time`);
  timeDetail.value = data;
  timeNow.value = Date.now();
}

async function startTimer() {
  if (!props.task) return;
  const { data } = await api.post(`/tasks/${props.task.id}/time/start`);
  timeDetail.value = data;
  emit('saved');
}

async function stopTimer() {
  if (!props.task) return;
  const { data } = await api.post(`/tasks/${props.task.id}/time/stop`);
  timeDetail.value = data;
  emit('saved');
}

async function logManual() {
  if (!props.task || !manualMinutes.value) return;
  const { data } = await api.post(`/tasks/${props.task.id}/time/log`, {
    minutes: manualMinutes.value,
  });
  timeDetail.value = data;
  emit('saved');
}

async function loadComments() {
  if (!props.task) return;
  const { data } = await api.get(`/tasks/${props.task.id}/comments`);
  comments.value = data;
}

async function sendComment() {
  if (!newComment.value.trim() || !props.task) return;
  await api.post(`/tasks/${props.task.id}/comments`, { content: newComment.value });
  newComment.value = '';
  await loadComments();
}

async function submit() {
  const payload = { ...form.value, projectId: props.projectId };
  if (props.task) {
    await api.patch(`/tasks/${props.task.id}`, payload);
  } else {
    await api.post('/tasks', payload);
  }
  emit('saved');
  emit('close');
}
</script>

<style scoped>
.modal--wide {
  max-width: 560px;
}

.time-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.time-section h4 {
  margin-bottom: 10px;
  font-size: 14px;
}

.time-summary {
  font-size: 13px;
  margin-bottom: 10px;
}

.time-running {
  color: var(--success);
}

.time-list {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  font-size: 13px;
}

.time-list li {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.time-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.manual-time {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input-sm {
  width: 72px;
  padding: 8px 10px;
}

.btn-sm {
  padding: 8px 12px;
  font-size: 13px;
}

.comments {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.comments h4 {
  margin-bottom: 12px;
  font-size: 14px;
}

.comment {
  font-size: 13px;
  margin-bottom: 8px;
}

.comment-send {
  margin-top: 8px;
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
