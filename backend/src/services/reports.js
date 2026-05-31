import XLSX from 'xlsx';
import pool from '../config/db.js';
import { parseMonthQuery, projectMonthSql, taskMonthSql } from '../utils/month.js';
import { getWorkloadStats } from './users.js';

const STATUS_LABELS = {
  active: 'Активный',
  on_review: 'На проверке',
  paused: 'На паузе',
  completed: 'Завершён',
  archived: 'Архив',
};

const TASK_STATUS_LABELS = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  in_review: 'На проверке',
  done: 'Завершено',
};

export async function buildReportData(query = {}) {
  const period = parseMonthQuery(query);
  const { start, end } = period;
  const projectId = query.projectId ? Number(query.projectId) : null;

  let projectFilter = projectMonthSql('p', '$1', '$2');
  const baseParams = [start, end];
  if (projectId) {
    projectFilter += ' AND p.id = $3';
    baseParams.push(projectId);
  }

  const [projects, tasks, workload, overdue, activeRes, planRes, projectList] = await Promise.all([
    pool.query(
      `SELECT status, COUNT(*)::int AS count FROM projects p WHERE 1=1 ${projectFilter} GROUP BY status`,
      baseParams
    ),
    pool.query(
      `SELECT t.status, COUNT(*)::int AS count
       FROM tasks t JOIN projects p ON p.id = t.project_id
       WHERE 1=1 ${projectFilter} ${taskMonthSql('t', '$1', '$2')}
       GROUP BY t.status`,
      baseParams
    ),
    getWorkloadStats(start, end),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE 1=1 ${projectFilter}
       ${taskMonthSql('t', '$1', '$2')}
       AND t.status != 'done'
       AND t.deadline < LEAST(CURRENT_DATE, $2::date + 1)`,
      baseParams
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM projects p
       WHERE p.status = 'active' ${projectFilter}`,
      baseParams
    ),
    pool.query(
      `SELECT ROUND(
        COUNT(*) FILTER (WHERE t.deadline <= $2 OR t.status = 'done')::numeric
        / NULLIF(COUNT(*), 0) * 100
      )::int AS pct
       FROM tasks t JOIN projects p ON p.id = t.project_id
       WHERE 1=1 ${projectFilter} ${taskMonthSql('t', '$1', '$2')}`,
      baseParams
    ),
    pool.query(
      `SELECT p.name, p.status, p.deadline, p.allocated_hours, p.progress,
        u.last_name, u.first_name
       FROM projects p
       LEFT JOIN users u ON u.id = p.pm_id
       WHERE 1=1 ${projectFilter}
       ORDER BY p.name`,
      baseParams
    ),
  ]);

  const growth = await pool.query(
    `SELECT COUNT(*)::int AS c FROM projects p
     WHERE p.status = 'active' ${projectFilter}
     AND p.created_at >= $1::date AND p.created_at < ($2::date + interval '1 day')`,
    baseParams
  );

  const avgWorkload = workload.length
    ? Math.round(workload.reduce((s, w) => s + w.workload, 0) / workload.length)
    : 0;

  return {
    period,
    summary: {
      activeProjects: activeRes.rows[0].count,
      projectsGrowth: growth.rows[0].c,
      overdueTasks: overdue.rows[0].count,
      planFulfillment: planRes.rows[0]?.pct ?? 0,
      avgWorkload,
    },
    projectsByStatus: projects.rows,
    tasksByStatus: tasks.rows,
    employeeWorkload: workload,
    projects: projectList.rows.map((r) => ({
      name: r.name,
      status: STATUS_LABELS[r.status] || r.status,
      deadline: r.deadline,
      pm: r.last_name ? `${r.last_name} ${r.first_name[0]}.` : '—',
      hours: r.allocated_hours,
      progress: r.progress,
    })),
  };
}

export function reportToExcelBuffer(data) {
  const wb = XLSX.utils.book_new();

  const summaryRows = [
    ['Период', data.period.label],
    ['Дата формирования', new Date().toLocaleString('ru-RU')],
    [],
    ['Показатель', 'Значение'],
    ['Активные проекты', data.summary.activeProjects],
    ['Новых за период', data.summary.projectsGrowth],
    ['Просроченные задачи', data.summary.overdueTasks],
    ['Выполнение планов, %', data.summary.planFulfillment],
    ['Средняя загрузка, %', data.summary.avgWorkload],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Сводка');

  if (data.projects?.length) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        data.projects.map((p) => ({
          Проект: p.name,
          Статус: p.status,
          Срок: p.deadline ? new Date(p.deadline).toLocaleDateString('ru-RU') : '',
          'PM': p.pm,
          'Часы (план)': p.hours,
          'Прогресс, %': p.progress,
        }))
      ),
      'Проекты'
    );
  }

  if (data.employeeWorkload?.length) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        data.employeeWorkload.map((e) => ({
          Сотрудник: e.name,
          'Загрузка, %': e.workload,
          'Задач в работе': e.taskCount,
          'Баллы нагрузки': e.weightedPoints,
        }))
      ),
      'Загрузка'
    );
  }

  if (data.tasksByStatus?.length) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        data.tasksByStatus.map((t) => ({
          Статус: TASK_STATUS_LABELS[t.status] || t.status,
          Количество: t.count,
        }))
      ),
      'Задачи'
    );
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export async function generateExcelReport(query) {
  const data = await buildReportData(query);
  return {
    buffer: reportToExcelBuffer(data),
    filename: `erp-otchet-${data.period.year}-${String(data.period.month).padStart(2, '0')}.xlsx`,
  };
}
