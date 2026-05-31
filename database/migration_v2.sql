-- Миграция v2: роль head, дата начала проекта
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'head' BEFORE 'manager';

ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE;
