import pool from '../config/db.js';

const PLACEHOLDER_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

const NEW_USERS = [
  ['s.kuznetsov@ilavista.by', 'Кузнецов', 'Сергей', 'Игоревич', 'Project Manager', 'manager'],
  ['s.sokolova@ilavista.by', 'Соколова', 'Светлана', 'Павловна', 'Project Manager', 'manager'],
  ['j.antonova@ilavista.by', 'Антонова', 'Юлия', 'Михайловна', 'Business Analyst', 'participant'],
];

export async function ensureUsers() {
  await pool.query(
    `UPDATE users SET email = 'e.smirnova@ilavista.by' WHERE email = 'manager@ilavista.by'`
  );
  await pool.query(
    `UPDATE users SET email = 'v.ershov@ilavista.by' WHERE email = 'a.ershov@ilavista.by'`
  );
  await pool.query(
    `UPDATE users SET email = 'm.gromova@ilavista.by', first_name = 'Марина' WHERE email = 'm.gromov@ilavista.by'`
  );

  for (const [email, lastName, firstName, middleName, position, role] of NEW_USERS) {
    await pool.query(
      `INSERT INTO users (email, password_hash, last_name, first_name, middle_name, position, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       ON CONFLICT (email) DO UPDATE SET
         last_name = EXCLUDED.last_name,
         first_name = EXCLUDED.first_name,
         middle_name = EXCLUDED.middle_name,
         position = EXCLUDED.position,
         role = EXCLUDED.role,
         status = 'active'`,
      [email, PLACEHOLDER_HASH, lastName, firstName, middleName, position, role]
    );
  }

  await pool.query(
    `DELETE FROM project_members pm
     USING users u, projects p
     WHERE pm.user_id = u.id AND pm.project_id = p.id
       AND u.email = 'a.petrov@ilavista.by' AND p.name = 'CRM Portal'`
  );
  await pool.query(
    `UPDATE tasks t SET assignee_id = NULL
     FROM projects p, users u
     WHERE t.project_id = p.id AND t.assignee_id = u.id
       AND p.name = 'CRM Portal' AND u.email = 'a.petrov@ilavista.by'`
  );
}
