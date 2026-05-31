import pool from '../config/db.js';

export function participantAssignedTasksSql(projectAlias = 'p', userIdParam) {
  return `EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.project_id = ${projectAlias}.id AND t.assignee_id = ${userIdParam}
  )`;
}

export async function ensureProjectMember(projectId, userId) {
  if (!projectId || !userId) return;
  await pool.query(
    `INSERT INTO project_members (project_id, user_id, allocated_hours, logged_hours)
     VALUES ($1, $2, 0, 0)
     ON CONFLICT (project_id, user_id) DO NOTHING`,
    [projectId, userId]
  );
}

export async function canAccessProject(user, projectId) {
  if (user.role === 'head' || user.role === 'admin') return true;
  if (user.role === 'manager') {
    const { rows } = await pool.query(
      'SELECT 1 FROM projects WHERE id = $1 AND pm_id = $2',
      [projectId, user.id]
    );
    return !!rows[0];
  }
  if (user.role === 'participant') {
    const { rows } = await pool.query(
      `SELECT 1 FROM tasks WHERE project_id = $1 AND assignee_id = $2 LIMIT 1`,
      [projectId, user.id]
    );
    return !!rows[0];
  }
  return false;
}

export async function canManageProject(user, projectId) {
  if (user.role === 'head') return true;
  if (user.role === 'manager') {
    const { rows } = await pool.query(
      'SELECT 1 FROM projects WHERE id = $1 AND pm_id = $2',
      [projectId, user.id]
    );
    return !!rows[0];
  }
  return false;
}

export function projectListFilter(user) {
  if (user.role === 'head') return { sql: '', params: [] };
  if (user.role === 'manager') {
    return { sql: ' AND p.pm_id = $IDX', paramsKey: 'managerId' };
  }
  if (user.role === 'participant') {
    return {
      sql: ` AND ${participantAssignedTasksSql('p', '$IDX')}`,
      paramsKey: 'userId',
    };
  }
  return { sql: ' AND 1=0', params: [] };
}
