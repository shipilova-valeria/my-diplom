import pool from '../config/db.js';
import { parseMonthQuery, projectMonthSql } from '../utils/month.js';
import { getTrackedMinutesByProject, minutesToHours } from './taskTime.js';
import { participantAssignedTasksSql } from './access.js';

export function withTrackedTime(project, trackedMinutes = 0) {
  const trackedHours = minutesToHours(trackedMinutes);
  const allocated = Number(project.allocatedHours) || 0;
  const hoursProgress =
    allocated > 0
      ? Math.min(100, Math.round((trackedHours / allocated) * 100))
      : trackedHours > 0
        ? 100
        : 0;
  return {
    ...project,
    trackedMinutes,
    trackedHours,
    loggedHours: trackedHours,
    hoursProgress,
  };
}

async function enrichWithTrackedTime(projects, period) {
  if (!period?.start || !period?.end || !projects.length) return projects;
  const map = await getTrackedMinutesByProject(
    projects.map((p) => p.id),
    period.start,
    period.end
  );
  return projects.map((p) => withTrackedTime(p, map[p.id] || 0));
}

const STATUS_LABELS = {
  active: 'Активный',
  on_review: 'На проверке',
  paused: 'На паузе',
  completed: 'Завершён',
  archived: 'Архив',
};

export function formatProject(row, extra = {}) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    startDate: row.start_date,
    deadline: row.deadline,
    pmId: row.pm_id,
    pmName: extra.pmName,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status] || row.status,
    allocatedHours: row.allocated_hours,
    progress: row.progress,
    tasksInProgress: extra.tasksInProgress ?? 0,
    createdAt: row.created_at,
  };
}

export async function listProjects(filters = {}, user = null) {
  let query = `
    SELECT p.*, u.last_name AS pm_last, u.first_name AS pm_first,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status NOT IN ('done')) AS tasks_active
    FROM projects p
    LEFT JOIN users u ON u.id = p.pm_id
    WHERE 1=1
  `;
  const params = [];
  let i = 1;

  if (user?.role === 'manager') {
    query += ` AND p.pm_id = $${i++}`;
    params.push(user.id);
  } else if (user?.role === 'participant') {
    query += ` AND ${participantAssignedTasksSql('p', `$${i}`)}`;
    params.push(user.id);
    i++;
  } else if (user?.role === 'admin') {
    query += ' AND 1=0';
  }

  if (filters.year || filters.month) {
    const period = parseMonthQuery(filters);
    query += projectMonthSql('p', `$${i}`, `$${i + 1}`);
    params.push(period.start, period.end);
    i += 2;
  }

  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'by_deadline') {
      query += ` AND p.deadline IS NOT NULL ORDER BY p.deadline ASC`;
    } else {
      query += ` AND p.status = $${i++}`;
      params.push(filters.status);
    }
  }
  if (filters.search) {
    query += ` AND (p.name ILIKE $${i} OR p.description ILIKE $${i})`;
    params.push(`%${filters.search}%`);
    i++;
  }
  if (filters.status !== 'by_deadline') {
    query += ` ORDER BY p.updated_at DESC`;
  }

  const { rows } = await pool.query(query, params);
  const period = filters.year || filters.month ? parseMonthQuery(filters) : null;
  const list = rows.map((r) =>
    formatProject(r, {
      pmName: r.pm_last ? `${r.pm_last} ${r.pm_first[0]}.` : null,
      tasksInProgress: Number(r.tasks_active),
    })
  );
  return enrichWithTrackedTime(list, period);
}

export async function getProject(id, period = null) {
  const { rows } = await pool.query(
    `SELECT p.*, u.last_name AS pm_last, u.first_name AS pm_first
     FROM projects p LEFT JOIN users u ON u.id = p.pm_id WHERE p.id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  const project = formatProject(r, { pmName: r.pm_last ? `${r.pm_last} ${r.pm_first[0]}.` : null });
  if (!period?.start) return withTrackedTime(project, 0);
  const [enriched] = await enrichWithTrackedTime([project], period);
  return enriched;
}

export async function createProject(data, user) {
  const pmId = user?.role === 'manager' ? user.id : data.pmId || null;
  const { rows } = await pool.query(
    `INSERT INTO projects (name, description, start_date, deadline, pm_id, status, allocated_hours, progress)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      data.name,
      data.description || null,
      data.startDate || null,
      data.deadline || null,
      pmId,
      data.status || 'active',
      data.allocatedHours || 0,
      data.progress || 0,
    ]
  );
  return formatProject(rows[0]);
}

export async function updateProject(id, data) {
  const cur = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
  if (!cur.rows[0]) return null;
  const c = cur.rows[0];
  const pmId = data.pmId !== undefined ? data.pmId : c.pm_id;

  const { rows } = await pool.query(
    `UPDATE projects SET
      name = COALESCE($2, name),
      description = COALESCE($3, description),
      start_date = COALESCE($4, start_date),
      deadline = COALESCE($5, deadline),
      pm_id = $6,
      status = COALESCE($7, status),
      allocated_hours = COALESCE($8, allocated_hours),
      progress = COALESCE($9, progress),
      updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [
      id,
      data.name,
      data.description,
      data.startDate,
      data.deadline,
      pmId,
      data.status,
      data.allocatedHours,
      data.progress,
    ]
  );
  return rows[0] ? formatProject(rows[0]) : null;
}

export async function deleteProject(id) {
  await pool.query('DELETE FROM projects WHERE id = $1', [id]);
}

export async function getUserProjects(userId, period = null) {
  const { rows } = await pool.query(
    `SELECT p.*, pm.allocated_hours AS member_hours, pm.logged_hours,
      u.last_name AS pm_last, u.first_name AS pm_first
     FROM projects p
     LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
     LEFT JOIN users u ON u.id = p.pm_id
     WHERE p.status NOT IN ('archived')
       AND ${participantAssignedTasksSql('p', '$1')}
     ORDER BY p.name`,
    [userId]
  );
  const list = rows.map((r) =>
    formatProject(r, { pmName: r.pm_last ? `${r.pm_last} ${r.pm_first[0]}.` : null })
  );
  const enriched = await enrichWithTrackedTime(list, period);
  return enriched.map((p, i) => ({
    ...p,
    memberHours: Number(rows[i].member_hours) || p.allocatedHours,
  }));
}

export async function getCriticalEvents(start = null, end = null) {
  const monthFilter = start && end
    ? projectMonthSql('p', '$1', '$2')
    : '';
  const params = start && end ? [start, end] : [];
  const { rows } = await pool.query(`
    SELECT p.id, p.name,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id
        AND t.deadline < CURRENT_DATE AND t.status != 'done'
        ${start && end ? 'AND t.deadline BETWEEN $1 AND $2' : ''}) AS overdue_count,
      p.deadline,
      (SELECT ROUND(AVG(pm.logged_hours / NULLIF(pm.allocated_hours, 0) * 100)) FROM project_members pm WHERE pm.project_id = p.id) AS load_pct
    FROM projects p
    WHERE p.status IN ('active', 'on_review')${monthFilter}
    ORDER BY overdue_count DESC NULLS LAST
    LIMIT 6
  `, params);
  return rows.map((r) => {
    let message = '';
    let severity = 'info';
    if (Number(r.overdue_count) > 0) {
      message = `${r.overdue_count} просрочки`;
      severity = 'danger';
    } else if (r.deadline) {
      const days = Math.ceil((new Date(r.deadline) - new Date()) / (86400000));
      if (days <= 7 && days >= 0) {
        message = `срок через ${days} дн.`;
        severity = 'warning';
      }
    }
    if (!message && Number(r.load_pct) >= 90) {
      message = `нагрузка ${r.load_pct}%`;
      severity = 'danger';
    }
    if (!message) message = 'нужен отчёт';
    return { id: r.id, name: r.name, message, severity };
  });
}

export async function listManagers() {
  const { rows } = await pool.query(
    `SELECT id, last_name, first_name, middle_name FROM users
     WHERE status = 'active' AND role = 'manager'
     ORDER BY last_name, first_name`
  );
  return rows.map((r) => ({
    id: r.id,
    name: `${r.last_name} ${r.first_name[0]}.`,
    fullName: [r.last_name, r.first_name, r.middle_name].filter(Boolean).join(' '),
  }));
}
