import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL не задан. Скопируйте backend/.env.example в backend/.env и запустите PostgreSQL: docker compose up -d'
  );
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Ошибка подключения к БД', err);
});

export async function checkDbConnection() {
  await pool.query('SELECT 1');
}

export default pool;
