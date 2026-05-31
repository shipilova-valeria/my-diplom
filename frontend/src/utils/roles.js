export const ROLE_LABELS = {
  admin: 'Администратор',
  head: 'Руководитель',
  manager: 'Менеджер',
  participant: 'Участник',
};

export const PROJECT_STATUS_LABELS = {
  active: 'Активный',
  on_review: 'На проверке',
  paused: 'На паузе',
  completed: 'Завершён',
  archived: 'Архив',
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}
