import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    next();
  };
}

export async function ensurePasswordChanged(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT must_change_password FROM users WHERE id = $1 AND status = $2',
      [req.user.id, 'active']
    );
    if (rows[0]?.must_change_password) {
      return res.status(403).json({
        error: 'Необходимо сменить пароль в разделе «Профиль»',
        code: 'MUST_CHANGE_PASSWORD',
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}

export async function loadUser(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, last_name, first_name, middle_name, position, phone, role, status, start_date, must_change_password
       FROM users WHERE id = $1 AND status = 'active'`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Пользователь не найден' });
    req.dbUser = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}
