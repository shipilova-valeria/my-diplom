<template>
  <div v-if="show" class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <h2>{{ isEdit ? 'Редактирование проекта' : 'Новый проект' }}</h2>
      <form @submit.prevent="submit">
        <div class="input-group">
          <label>Название</label>
          <input v-model="form.name" class="input" required />
        </div>
        <div v-if="canManageProjects" class="input-group">
          <label>Менеджер</label>
          <select
            v-model="form.pmId"
            class="input"
            :disabled="managerSelectDisabled"
          >
            <option v-if="auth.isHead" :value="null">Не назначен</option>
            <option v-for="m in managers" :key="m.id" :value="m.id">
              {{ m.fullName || m.name }}
            </option>
          </select>
          <p v-if="managerSelectDisabled" class="field-hint">
            Менеджером проекта назначаетесь вы
          </p>
        </div>
        <div class="input-group">
          <label>Описание</label>
          <textarea v-model="form.description" class="input" rows="3" />
        </div>
        <div class="input-group">
          <label>{{ isEdit ? 'Срок' : 'Дата начала' }}</label>
          <input v-model="dateField" type="date" class="input" />
        </div>
        <div class="input-group">
          <label>Часов (план)</label>
          <input v-model.number="form.allocatedHours" type="number" class="input" min="0" />
        </div>
        <div v-if="isEdit" class="input-group">
          <label>Статус проекта</label>
          <select v-model="form.status" class="input">
            <option value="active">Активный</option>
            <option value="on_review">На проверке</option>
            <option value="paused">На паузе</option>
            <option value="completed">Завершён</option>
            <option value="archived">Архив</option>
          </select>
        </div>
        <div class="modal-actions" :class="{ 'modal-actions--spread': isEdit && canDelete }">
          <div class="modal-actions__left">
            <button type="submit" class="btn btn-primary">Сохранить</button>
            <button type="button" class="btn btn-outline" @click="emit('close')">Отмена</button>
          </div>
          <button
            v-if="isEdit && canDelete"
            type="button"
            class="btn-link text-danger"
            @click="emit('delete')"
          >
            Удалить проект
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import api from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';

const props = defineProps({
  show: Boolean,
  project: { type: Object, default: null },
  canDelete: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'saved', 'delete']);

const auth = useAuthStore();
const managers = ref([]);
const form = ref(emptyForm());

const isEdit = computed(() => !!props.project?.id);
const canManageProjects = computed(() => auth.canManageProjects);
const managerSelectDisabled = computed(() => auth.isManager && !auth.isHead);

const dateField = computed({
  get() {
    return isEdit.value
      ? form.value.deadline?.slice?.(0, 10) || form.value.deadline || ''
      : form.value.startDate?.slice?.(0, 10) || form.value.startDate || '';
  },
  set(v) {
    if (isEdit.value) form.value.deadline = v;
    else form.value.startDate = v;
  },
});

function emptyForm() {
  return {
    name: '',
    description: '',
    pmId: null,
    startDate: '',
    deadline: '',
    allocatedHours: 0,
    status: 'active',
  };
}

async function loadManagers() {
  if (!canManageProjects.value) return;
  const { data } = await api.get('/projects/managers');
  managers.value = data;
}

watch(
  () => [props.show, props.project],
  async () => {
    if (!props.show) return;
    await loadManagers();
    if (props.project) {
      form.value = {
        name: props.project.name,
        description: props.project.description || '',
        pmId: props.project.pmId ?? null,
        startDate: props.project.startDate,
        deadline: props.project.deadline,
        allocatedHours: props.project.allocatedHours,
        status: props.project.status,
      };
    } else {
      form.value = emptyForm();
      if (auth.isManager) {
        form.value.pmId = auth.user.id;
      } else if (managers.value.length === 1) {
        form.value.pmId = managers.value[0].id;
      }
    }
  }
);

async function submit() {
  const payload = { ...form.value };
  if (isEdit.value) {
    const { data } = await api.patch(`/projects/${props.project.id}`, payload);
    emit('saved', data);
  } else {
    const { data } = await api.post('/projects', payload);
    emit('saved', data);
  }
  emit('close');
}
</script>

<style scoped>
.field-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
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
  padding: 0;
}
</style>
