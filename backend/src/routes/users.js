import { Router } from 'express';
import { authenticate, ensurePasswordChanged, requireRoles } from '../middleware/auth.js';
import {
  listUsers,
  createUser,
  updateUser,
  formatUser,
  roleLabel,
  findById,
} from '../services/users.js';

const router = Router();
router.use(authenticate, ensurePasswordChanged);

router.get('/', requireRoles('admin', 'head'), async (req, res, next) => {
  try {
    const users = await listUsers();
    res.json(users.map((u) => ({ ...u, roleLabel: roleLabel(u.role) })));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRoles('admin'), async (req, res, next) => {
  try {
    const user = await createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email уже используется' });
    next(err);
  }
});

router.patch('/:id', requireRoles('admin', 'head'), async (req, res, next) => {
  try {
    const canEditRole = req.user.role === 'admin';
    const user = await updateUser(Number(req.params.id), req.body, canEditRole);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reset-password', requireRoles('admin'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const user = await updateUser(id, { password: 'password123', mustChangePassword: true }, false);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ message: 'Пароль сброшен на password123' });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireRoles('admin', 'head'), async (req, res, next) => {
  try {
    const row = await findById(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Не найден' });
    res.json(formatUser(row));
  } catch (err) {
    next(err);
  }
});

export default router;
