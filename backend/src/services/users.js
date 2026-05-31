import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { calcWorkloadPercent } from '../utils/workload.js';

export function formatUser(row) {
  return {
    id: row.id,
    email: row.email,
    lastName: row.last_name,
    firstName: row.first_name,
    middleName: row.middle_name,
    fullName: [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' '),
    position: row.position,
    phone: row.phone,
    role: row.role,
    status: row.status,
    mustChangePassword: Boolean(row.must_change_password),
    startDate: row.start_date,
    initials: `${row.first_name?.[0] || ''}${row.last_name?.[0] || ''}`.toUpperCase(),
  };
}

const ROLE_LABELS = {
  admin: 'Администратор',
  head: 'Руководитель',
  manager: 'Менеджер',
  participant: 'Участник',
};
export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}

export async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  return rows[0];
}

export async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0];
}

export async function listUsers() {
  const { rows } = await pool.query(
    'SELECT * FROM users ORDER BY last_name, first_name'
  );
  return rows.map(formatUser);
}

export async function createUser(data) {
  const hash = await bcrypt.hash(data.password || 'password123', 10);
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, last_name, first_name, middle_name, position, phone, role, start_date, must_change_password)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true) RETURNING *`,
    [
      data.email.toLowerCase(),
      hash,
      data.lastName,
      data.firstName,
      data.middleName || null,
      data.position,
      data.phone || null,
      data.role || 'participant',
      data.startDate || new Date().toISOString().slice(0, 10),
    ]
  );
  return formatUser(rows[0]);
}

export async function updateUser(id, data, canEditRole) {
  const fields = [];
  const values = [];
  let i = 1;

  const map = {
    lastName: 'last_name',
    firstName: 'first_name',
    middleName: 'middle_name',
    position: 'position',
    phone: 'phone',
    email: 'email',
    status: 'status',
  };

  for (const [key, col] of Object.entries(map)) {
    if (data[key] !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push(key === 'email' ? data[key].toLowerCase() : data[key]);
    }
  }
  if (canEditRole && data.role !== undefined) {
    fields.push(`role = $${i++}`);
    values.push(data.role);
  }
  if (data.password) {
    fields.push(`password_hash = $${i++}`);
    values.push(await bcrypt.hash(data.password, 10));
    fields.push(`must_change_password = $${i++}`);
    values.push(data.mustChangePassword === true);
  } else if (data.mustChangePassword === true) {
    fields.push(`must_change_password = $${i++}`);
    values.push(true);
  }
  fields.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0] ? formatUser(rows[0]) : null;
}

export async function getWorkloadStats(start, end) {
  const params = start && end ? [start, end] : [];
  const periodFilter =
    start && end
      ? ` AND (
          t.deadline BETWEEN $1 AND $2
          OR t.created_at::date BETWEEN $1 AND $2
        )`
      : '';

  const { rows } = await pool.query(
    `SELECT u.id, u.last_name, u.first_name,
      COALESCE(tc.task_count, 0)::int AS task_count,
      COALESCE(tc.weighted_points, 0)::int AS weighted_points
    FROM users u
    LEFT JOIN (
      SELECT t.assignee_id,
        COUNT(*)::int AS task_count,
        SUM(CASE t.priority
          WHEN 'high' THEN 3
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 1
          ELSE 2
        END)::int AS weighted_points
      FROM tasks t
      JOIN projects p ON p.id = t.project_id AND p.status IN ('active', 'on_review')
      WHERE t.assignee_id IS NOT NULL
        AND t.status != 'done'
        ${periodFilter}
      GROUP BY t.assignee_id
    ) tc ON tc.assignee_id = u.id
    WHERE u.status = 'active' AND u.role = 'participant'
    ORDER BY u.last_name, u.first_name`,
    params
  );

  return rows.map((r) => {
    const taskCount = Number(r.task_count) || 0;
    const weightedPoints = Number(r.weighted_points) || 0;
    return {
      id: r.id,
      name: `${r.last_name} ${r.first_name[0]}.`,
      workload: calcWorkloadPercent(weightedPoints),
      taskCount,
      weightedPoints,
    };
  });
}
