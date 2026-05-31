import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findByEmail, formatUser } from '../services/users.js';
import { authenticate, loadUser } from '../middleware/auth.js';

const router = Router();

function isDbConnectionError(err) {
  const code = err?.code;
  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    code === '57P01' ||
    code === '53300'
  );
}

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Укажите email и пароль' });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(503).json({
        error: 'Сервер не настроен: отсутствует JWT_SECRET в backend/.env',
      });
    }

    let user;
    try {
      user = await findByEmail(email);
    } catch (err) {
      if (isDbConnectionError(err)) {
        console.error('Ошибка входа: база данных недоступна', err.message);
        return res.status(503).json({
          error: 'База данных недоступна. Запустите PostgreSQL: docker compose up -d',
        });
      }
      if (err.code === '42P01') {
        console.error('Ошибка входа: таблицы не найдены', err.message);
        return res.status(503).json({
          error: 'Таблицы не найдены. Пересоздайте БД: docker compose down -v && docker compose up -d',
        });
      }
      throw err;
    }

    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    res.json({ token, user: formatUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, loadUser, (req, res) => {
  res.json({ user: formatUser(req.dbUser) });
});

export default router;
