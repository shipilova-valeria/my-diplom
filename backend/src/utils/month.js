const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export function parseMonthQuery(query = {}) {
  const now = new Date();
  let year = parseInt(query.year, 10) || now.getFullYear();
  let month = parseInt(query.month, 10) || now.getMonth() + 1;

  if (month < 1) {
    month = 12;
    year -= 1;
  }
  if (month > 12) {
    month = 1;
    year += 1;
  }

  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return {
    year,
    month,
    start,
    end,
    label: `${MONTH_NAMES[month - 1]} ${year}`,
    shortLabel: MONTH_NAMES[month - 1],
  };
}

export function projectMonthSql(alias = 'p', startParam, endParam) {
  return ` AND (
    (${alias}.deadline BETWEEN ${startParam} AND ${endParam})
    OR (${alias}.start_date BETWEEN ${startParam} AND ${endParam})
    OR (${alias}.created_at::date BETWEEN ${startParam} AND ${endParam})
    OR EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.project_id = ${alias}.id AND (
        t.deadline BETWEEN ${startParam} AND ${endParam}
        OR t.created_at::date BETWEEN ${startParam} AND ${endParam}
      )
    )
  )`;
}

export function taskMonthSql(alias = 't', startParam, endParam) {
  return ` AND (
    (${alias}.deadline BETWEEN ${startParam} AND ${endParam})
    OR (${alias}.created_at::date BETWEEN ${startParam} AND ${endParam})
  )`;
}
