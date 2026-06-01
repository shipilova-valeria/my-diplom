import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import profileRoutes from './routes/profile.js';
import projectsRoutes from './routes/projects.js';
import tasksRoutes from './routes/tasks.js';
import dashboardRoutes from './routes/dashboard.js';
import reportsRoutes from './routes/reports.js';
import pool, { checkDbConnection } from './config/db.js';
import { syncUserPasswords } from './services/userPasswords.js';
import { ensureUsers } from './services/ensureUsers.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'db_unavailable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

async function runStartupMigrations() {
  try {
    try {
      await pool.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'head'`);
    } catch {}
    try {
      await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE`);
    } catch {}
    try {
      await pool.query(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false`
      );
    } catch {}
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS task_time_entries (
          id SERIAL PRIMARY KEY,
          task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          ended_at TIMESTAMPTZ,
          minutes INTEGER,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_task_time_task ON task_time_entries(task_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_task_time_user ON task_time_entries(user_id)`);
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_task_time_user_active
        ON task_time_entries(user_id) WHERE ended_at IS NULL
      `);
    } catch {}
    try {
      await pool.query(`
        INSERT INTO project_members (project_id, user_id, allocated_hours, logged_hours)
        SELECT DISTINCT t.project_id, t.assignee_id, 0, 0
        FROM tasks t
        WHERE t.assignee_id IS NOT NULL
        ON CONFLICT (project_id, user_id) DO NOTHING
      `);
    } catch {}
    await ensureUsers();
    await syncUserPasswords();
  } catch (e) {
    console.warn('Служебные миграции при старте пропущены:', e.message);
  }
}

async function waitForDb(maxAttempts = 10) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await checkDbConnection();
      return true;
    } catch (err) {
      if (attempt === maxAttempts) {
        console.error('\nНе удалось подключиться к PostgreSQL.');
        console.error('1. Запустите Docker');
        console.error('2. Выполните: docker compose up -d');
        console.error(`3. DATABASE_URL: ${process.env.DATABASE_URL || '(не задан)'}`);
        console.error(`Ошибка: ${err.message}\n`);
        return false;
      }
      console.warn(`Ожидание БД (${attempt}/${maxAttempts})...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return false;
}

app.listen(PORT, async () => {
  const dbOk = await waitForDb();
  if (dbOk) {
    await runStartupMigrations();
    console.log(`API: http://localhost:${PORT}`);
  } else {
    console.warn(`API запущен без БД: http://localhost:${PORT}`);
  }
});
