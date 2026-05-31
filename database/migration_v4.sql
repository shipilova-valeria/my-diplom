-- Учёт времени по задачам (несколько участников на одну задачу)
CREATE TABLE IF NOT EXISTS task_time_entries (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_time_task ON task_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_user ON task_time_entries(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_time_user_active
  ON task_time_entries(user_id)
  WHERE ended_at IS NULL;
