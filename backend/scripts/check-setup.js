import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const url = process.env.DATABASE_URL;
const jwt = process.env.JWT_SECRET;

console.log('=== Проверка окружения ===\n');

if (!url) {
  console.error('[ошибка] DATABASE_URL не задан в backend/.env');
  process.exit(1);
}
console.log('[ok] DATABASE_URL задан');

if (!jwt) {
  console.error('[ошибка] JWT_SECRET не задан в backend/.env');
  process.exit(1);
}
console.log('[ok] JWT_SECRET задан');

try {
  const pool = new pg.Pool({ connectionString: url });
  await pool.query('SELECT 1');
  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM users');
  console.log(`[ok] PostgreSQL доступен, пользователей: ${rows[0].c}`);
  await pool.end();
  console.log('\nМожно запускать backend и frontend.');
} catch (err) {
  console.error(`\n[ошибка] PostgreSQL недоступен: ${err.message}`);
  console.error('\nИз корня проекта выполните:');
  console.error('  docker compose up -d');
  process.exit(1);
}
