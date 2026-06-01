import pool from '../config/db.js';
import { getSummariesForTasks } from './taskTime.js';
import { ensureProjectMember } from './access.js';

const STATUS_MAP = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  in_review: 'На проверке',
  done: 'Завершено',
};

export function formatTask(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    statusLabel: STATUS_MAP[row.status],
    priority: row.priority,
    assigneeId: row.assignee_id,
    assigneeName: row.assignee_name || null,
    deadline: row.deadline,
    createdAt: row.created_at,
  };
}

export async function listByProject(projectId, { search, assigneeId, status } = {}) {
  let query = `
    SELECT t.*, CONCAT(u.last_name, ' ', LEFT(u.first_name, 1), '.') AS assignee_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.project_id = $1
  `;
  const params = [projectId];
  let i = 2;

  if (search) {
    query += ` AND (t.title ILIKE $${i} OR t.description ILIKE $${i})`;
    params.push(`%${search}%`);
    i++;
  }
  if (assigneeId) {
    query += ` AND t.assignee_id = $${i++}`;
    params.push(assigneeId);
  }
  if (status) {
    query += ` AND t.status = $${i++}`;
    params.push(status);
  }
  query += ' ORDER BY t.deadline NULLS LAST, t.id';

  const { rows } = await pool.query(query, params);
  return rows.map(formatTask);
}

export async function getKanban(projectId, search, currentUserId = null) {
  const tasks = await listByProject(projectId, { search });
  const timeMap = await getSummariesForTasks(
    tasks.map((t) => t.id),
    currentUserId
  );
  const tasksWithTime = tasks.map((t) => ({
    ...t,
    timeTracking: timeMap[t.id] || {
      totalMinutes: 0,
      totalLabel: '0м',
      trackers: [],
      myIsActive: false,
      myStartedAt: null,
      myMinutes: 0,
      myLabel: '0м',
    },
  }));
  const columns = {
    todo: { id: 'todo', title: 'К выполнению', tasks: [] },
    in_progress: { id: 'in_progress', title: 'В работе', tasks: [] },
    in_review: { id: 'in_review', title: 'На проверке', tasks: [] },
    done: { id: 'done', title: 'Завершено', tasks: [], isDone: true },
  };
  for (const t of tasksWithTime) {
    if (columns[t.status]) columns[t.status].tasks.push(t);
  }
  return Object.values(columns).map((c) => ({ ...c, count: c.tasks.length }));
}

export async function createTask(data) {
  const { rows } = await pool.query(
    `INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, deadline)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      data.projectId,
      data.title,
      data.description || null,
      data.status || 'todo',
      data.priority || 'medium',
      data.assigneeId || null,
      data.deadline || null,
    ]
  );
  if (data.assigneeId) {
    await ensureProjectMember(data.projectId, data.assigneeId);
  }
  return formatTask(rows[0]);
}

export async function updateTask(id, data) {
  const cur = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
  if (!cur.rows[0]) return null;
  const c = cur.rows[0];
  const { rows } = await pool.query(
    `UPDATE tasks SET
      title = COALESCE($2, title),
      description = COALESCE($3, description),
      status = COALESCE($4, status),
      priority = COALESCE($5, priority),
      assignee_id = $6,
      deadline = COALESCE($7, deadline),
      updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [
      id,
      data.title ?? c.title,
      data.description !== undefined ? data.description : c.description,
      data.status ?? c.status,
      data.priority ?? c.priority,
      data.assigneeId !== undefined ? data.assigneeId : c.assignee_id,
      data.deadline !== undefined ? data.deadline : c.deadline,
    ]
  );
  const withName = await pool.query(
    `SELECT t.*, CONCAT(u.last_name, ' ', LEFT(u.first_name, 1), '.') AS assignee_name
     FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id WHERE t.id = $1`,
    [id]
  );
  const assigneeId = data.assigneeId !== undefined ? data.assigneeId : c.assignee_id;
  if (assigneeId) {
    await ensureProjectMember(c.project_id, assigneeId);
  }
  return formatTask(withName.rows[0] || rows[0]);
}

export async function updateStatus(id, status) {
  const { rows } = await pool.query(
    `UPDATE tasks SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, status]
  );
  if (!rows[0]) return null;
  const task = formatTask(rows[0]);
  await recalcProjectProgress(task.projectId);
  return task;
}

export async function getComments(taskId) {
  const { rows } = await pool.query(
    `SELECT c.*, u.first_name, u.last_name
     FROM task_comments c JOIN users u ON u.id = c.user_id
     WHERE c.task_id = $1 ORDER BY c.created_at`,
    [taskId]
  );
  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    author: `${r.last_name} ${r.first_name[0]}.`,
    createdAt: r.created_at,
  }));
}

export async function addComment(taskId, userId, content) {
  const { rows } = await pool.query(
    `INSERT INTO task_comments (task_id, user_id, content) VALUES ($1,$2,$3) RETURNING *`,
    [taskId, userId, content]
  );
  return rows[0];
}

export async function countOverdue(userId = null, start = null, end = null) {
  let query = `SELECT COUNT(*)::int AS count FROM tasks t WHERE t.status != 'done'`;
  const params = [];
  let i = 1;

  if (start && end) {
    query += ` AND t.deadline BETWEEN $${i++} AND $${i++}`;
    params.push(start, end);
    query += ` AND t.deadline < LEAST(CURRENT_DATE, $${i++}::date + interval '1 day')`;
    params.push(end);
  } else {
    query += ` AND t.deadline < CURRENT_DATE`;
  }
  if (userId) {
    query += ` AND t.assignee_id = $${i++}`;
    params.push(userId);
  }
  const { rows } = await pool.query(query, params);
  return Number(rows[0].count);
}

export async function deleteTask(id) {
  const { rows } = await pool.query(
    'DELETE FROM tasks WHERE id = $1 RETURNING project_id',
    [id]
  );
  if (rows[0]) await recalcProjectProgress(rows[0].project_id);
}

export async function getTaskProjectId(taskId) {
  const { rows } = await pool.query('SELECT project_id FROM tasks WHERE id = $1', [taskId]);
  return rows[0]?.project_id;
}

export async function listAssignees() {
  const { rows } = await pool.query(
    `SELECT id, last_name, first_name FROM users
     WHERE status = 'active' AND role IN ('participant', 'manager')
     ORDER BY last_name, first_name`
  );
  return rows.map((r) => ({
    id: r.id,
    name: `${r.last_name} ${r.first_name[0]}.`,
  }));
}

export async function recalcProjectProgress(projectId) {
  await pool.query(
    `
    UPDATE projects SET progress = COALESCE((
      SELECT ROUND(COUNT(*) FILTER (WHERE status = 'done')::numeric / NULLIF(COUNT(*), 0) * 100)
      FROM tasks WHERE project_id = $1
    ), 0), updated_at = NOW() WHERE id = $1
  `,
    [projectId]
  );
}
