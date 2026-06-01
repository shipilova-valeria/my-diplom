import pool from '../config/db.js';

function userShortName(lastName, firstName) {
  return `${lastName} ${firstName?.[0] || ''}.`.trim();
}

function liveMinutes(startedAt) {
  const ms = Date.now() - new Date(startedAt).getTime();
  return Math.max(1, Math.round(ms / 60000));
}

function entryMinutes(entry) {
  if (entry.ended_at) return Number(entry.minutes) || 0;
  return liveMinutes(entry.started_at);
}

export function entryMinutesSql(alias = 'e') {
  return `CASE
    WHEN ${alias}.ended_at IS NOT NULL THEN COALESCE(${alias}.minutes, 0)
    ELSE GREATEST(1, ROUND(EXTRACT(EPOCH FROM (NOW() - ${alias}.started_at)) / 60))::int
  END`;
}

export function minutesToHours(minutes) {
  return Math.round((Number(minutes) / 60) * 10) / 10;
}

export async function getTrackedMinutesByProject(projectIds, start, end) {
  if (!projectIds?.length || !start || !end) return {};
  const { rows } = await pool.query(
    `SELECT t.project_id, SUM(${entryMinutesSql('e')})::int AS tracked_minutes
     FROM task_time_entries e
     JOIN tasks t ON t.id = e.task_id
     WHERE t.project_id = ANY($1::int[])
       AND COALESCE(e.ended_at, e.started_at)::date BETWEEN $2 AND $3
     GROUP BY t.project_id`,
    [projectIds, start, end]
  );
  const map = {};
  for (const r of rows) {
    map[r.project_id] = Number(r.tracked_minutes) || 0;
  }
  return map;
}

export async function getTrackedMinutesForProject(projectId, start, end) {
  const map = await getTrackedMinutesByProject([projectId], start, end);
  return map[projectId] || 0;
}

export function formatDuration(totalMinutes) {
  const m = Math.max(0, Math.round(totalMinutes));
  if (m < 60) return `${m}м`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}ч ${rest}м` : `${h}ч`;
}

function buildTaskSummary(entries, currentUserId) {
  const byUser = new Map();

  for (const e of entries) {
    const mins = entryMinutes(e);
    if (!byUser.has(e.user_id)) {
      byUser.set(e.user_id, {
        userId: e.user_id,
        userName: userShortName(e.last_name, e.first_name),
        minutes: 0,
        isActive: false,
        startedAt: null,
        entryId: null,
      });
    }
    const row = byUser.get(e.user_id);
    row.minutes += mins;
    if (!e.ended_at) {
      row.isActive = true;
      row.startedAt = e.started_at;
      row.entryId = e.id;
    }
  }

  const trackers = [...byUser.values()].sort((a, b) => b.minutes - a.minutes);
  const totalMinutes = trackers.reduce((s, t) => s + t.minutes, 0);
  const mine = trackers.find((t) => t.userId === currentUserId);

  return {
    totalMinutes,
    totalLabel: formatDuration(totalMinutes),
    trackers,
    myIsActive: Boolean(mine?.isActive),
    myStartedAt: mine?.startedAt || null,
    myMinutes: mine?.minutes || 0,
    myLabel: formatDuration(mine?.minutes || 0),
  };
}

export async function getSummariesForTasks(taskIds, currentUserId) {
  if (!taskIds.length) return {};
  const { rows } = await pool.query(
    `SELECT e.*, u.last_name, u.first_name
     FROM task_time_entries e
     JOIN users u ON u.id = e.user_id
     WHERE e.task_id = ANY($1::int[])
     ORDER BY e.started_at`,
    [taskIds]
  );

  const grouped = new Map();
  for (const id of taskIds) grouped.set(id, []);
  for (const row of rows) {
    grouped.get(row.task_id).push(row);
  }

  const result = {};
  for (const id of taskIds) {
    result[id] = buildTaskSummary(grouped.get(id), currentUserId);
  }
  return result;
}

export async function getTaskTimeDetail(taskId, currentUserId) {
  const { rows } = await pool.query(
    `SELECT e.*, u.last_name, u.first_name
     FROM task_time_entries e
     JOIN users u ON u.id = e.user_id
     WHERE e.task_id = $1
     ORDER BY e.started_at DESC`,
    [taskId]
  );

  const summary = buildTaskSummary(rows, currentUserId);
  const entries = rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    userName: userShortName(r.last_name, r.first_name),
    startedAt: r.started_at,
    endedAt: r.ended_at,
    minutes: entryMinutes(r),
    minutesLabel: formatDuration(entryMinutes(r)),
    isActive: !r.ended_at,
  }));

  return { summary, entries };
}

async function stopActiveEntry(client, userId) {
  const { rows } = await client.query(
    `SELECT * FROM task_time_entries WHERE user_id = $1 AND ended_at IS NULL`,
    [userId]
  );
  for (const entry of rows) {
    const minutes = liveMinutes(entry.started_at);
    await client.query(
      `UPDATE task_time_entries SET ended_at = NOW(), minutes = $2 WHERE id = $1`,
      [entry.id, minutes]
    );
  }
  return rows;
}

export async function startTimer(taskId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await stopActiveEntry(client, userId);

    const { rows } = await client.query(
      `INSERT INTO task_time_entries (task_id, user_id) VALUES ($1, $2) RETURNING *`,
      [taskId, userId]
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function stopTimer(taskId, userId) {
  const { rows } = await pool.query(
    `SELECT * FROM task_time_entries
     WHERE task_id = $1 AND user_id = $2 AND ended_at IS NULL`,
    [taskId, userId]
  );
  const entry = rows[0];
  if (!entry) return null;

  const minutes = liveMinutes(entry.started_at);
  const { rows: updated } = await pool.query(
    `UPDATE task_time_entries SET ended_at = NOW(), minutes = $2 WHERE id = $1 RETURNING *`,
    [entry.id, minutes]
  );
  return updated[0];
}

export async function logManualTime(taskId, userId, minutes) {
  const m = Math.max(1, Math.round(Number(minutes)));
  const { rows } = await pool.query(
    `INSERT INTO task_time_entries (task_id, user_id, started_at, ended_at, minutes)
     VALUES ($1, $2, NOW(), NOW(), $3) RETURNING *`,
    [taskId, userId, m]
  );
  return rows[0];
}
