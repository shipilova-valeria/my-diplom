import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, ensurePasswordChanged } from '../middleware/auth.js';
import { getWorkloadStats } from '../services/users.js';
import { getCriticalEvents, getUserProjects } from '../services/projects.js';
import { countOverdue } from '../services/tasks.js';
import { parseMonthQuery, projectMonthSql } from '../utils/month.js';
import { getTrackedMinutesByProject, minutesToHours } from '../services/taskTime.js';

const router = Router();
router.use(authenticate, ensurePasswordChanged);

router.get('/head', async (req, res, next) => {
  try {
    if (req.user.role !== 'head') {
      return res.status(403).json({ error: 'Доступ только для руководителя' });
    }
    const period = parseMonthQuery(req.query);
    const { start, end } = period;
    const pMonth = projectMonthSql('p', '$1', '$2');

    const [activeRes, overdue, workload, events, planRes, growth] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS c FROM projects p WHERE p.status = 'active' ${pMonth}`,
        [start, end]
      ),
      countOverdue(null, start, end),
      getWorkloadStats(start, end),
      getCriticalEvents(start, end),
      pool.query(
        `SELECT ROUND(
          COUNT(*) FILTER (WHERE t.deadline <= $2 OR t.status = 'done')::numeric
          / NULLIF(COUNT(*), 0) * 100
        )::int AS pct
         FROM tasks t JOIN projects p ON p.id = t.project_id
         WHERE 1=1 ${pMonth}
         AND (t.deadline BETWEEN $1 AND $2 OR t.created_at::date BETWEEN $1 AND $2)`,
        [start, end]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM projects p
         WHERE p.status = 'active' ${pMonth}
         AND p.created_at >= $1::date AND p.created_at < ($2::date + interval '1 day')`,
        [start, end]
      ),
    ]);

    const avgLoad = workload.length
      ? Math.round(workload.reduce((s, w) => s + w.workload, 0) / workload.length)
      : 0;

    res.json({
      period,
      activeProjects: activeRes.rows[0].c,
      projectsGrowth: growth.rows[0].c,
      overdueTasks: overdue,
      avgWorkload: avgLoad,
      planFulfillment: planRes.rows[0]?.pct ?? 0,
      employeeWorkload: workload,
      criticalEvents: events,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/manager', async (req, res, next) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Доступ только для менеджера' });
    }
    const period = parseMonthQuery(req.query);
    const { start, end } = period;
    const userId = req.user.id;
    const pMonth = projectMonthSql('p', '$2', '$3');

    const [activeRes, overdue, userProjects, growth] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS c FROM projects p
         WHERE p.pm_id = $1 AND p.status = 'active' ${pMonth}`,
        [userId, start, end]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM tasks t
         JOIN projects p ON p.id = t.project_id
         WHERE p.pm_id = $1 ${pMonth}
         AND t.deadline BETWEEN $2 AND $3
         AND t.status != 'done'
         AND t.deadline < LEAST(CURRENT_DATE, $3::date + interval '1 day')`,
        [userId, start, end]
      ),
      pool.query(
        `SELECT p.id, p.name, p.allocated_hours
         FROM projects p
         WHERE p.pm_id = $1 AND p.status NOT IN ('archived') ${pMonth}
         ORDER BY p.name`,
        [userId, start, end]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM projects p
         WHERE p.pm_id = $1 AND p.status = 'active' ${pMonth}
         AND p.created_at >= $2::date AND p.created_at < ($3::date + interval '1 day')`,
        [userId, start, end]
      ),
    ]);

    const projectRows = userProjects.rows;
    const trackedMap = await getTrackedMinutesByProject(
      projectRows.map((r) => r.id),
      start,
      end
    );

    res.json({
      period,
      activeProjects: activeRes.rows[0].c,
      projectsGrowth: growth.rows[0].c,
      overdueTasks: Number(overdue.rows[0].c),
      projects: projectRows.map((r) => {
        const trackedMinutes = trackedMap[r.id] || 0;
        const trackedHours = minutesToHours(trackedMinutes);
        const allocatedHours = Number(r.allocated_hours) || 0;
        return {
          id: r.id,
          name: r.name,
          allocatedHours,
          memberHours: allocatedHours,
          trackedMinutes,
          trackedHours,
          loggedHours: trackedHours,
          hoursProgress:
            allocatedHours > 0
              ? Math.min(100, Math.round((trackedHours / allocatedHours) * 100))
              : trackedHours > 0
                ? 100
                : 0,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/employee', async (req, res, next) => {
  try {
    if (req.user.role !== 'participant') {
      return res.status(403).json({ error: 'Доступ только для участника' });
    }
    const period = parseMonthQuery(req.query);
    const userId = req.user.id;

    const [overdue, userProjects] = await Promise.all([
      countOverdue(userId, period.start, period.end),
      getUserProjects(userId, period),
    ]);

    const activeStatuses = new Set(['active', 'on_review', 'paused']);
    const activeProjects = userProjects.filter((p) => activeStatuses.has(p.status)).length;

    res.json({
      period,
      activeProjects,
      projectsGrowth: 0,
      overdueTasks: overdue,
      projects: userProjects,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/admin', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ только для администратора' });
    }
    const period = parseMonthQuery(req.query);
    const { start, end } = period;

    const [total, active, registered] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS c FROM users'),
      pool.query(`SELECT COUNT(*)::int AS c FROM users WHERE status = 'active'`),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM users
         WHERE start_date BETWEEN $1 AND $2`,
        [start, end]
      ),
    ]);

    res.json({
      period,
      totalUsers: total.rows[0].c,
      activeUsers: active.rows[0].c,
      registeredInMonth: registered.rows[0].c,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
