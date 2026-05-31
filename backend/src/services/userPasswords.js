import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { USER_PASSWORDS } from '../config/userPasswords.js';

export async function syncUserPasswords() {
  for (const [email, password] of Object.entries(USER_PASSWORDS)) {
    const hash = await bcrypt.hash(password, 10);
    const { rowCount } = await pool.query(
      `UPDATE users SET password_hash = $1, must_change_password = false WHERE email = $2`,
      [hash, email.toLowerCase()]
    );
    if (rowCount === 0) {
      console.warn(`Пользователь не найден: ${email}`);
    }
  }
}
