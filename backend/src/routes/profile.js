import { Router } from 'express';
import { authenticate, loadUser } from '../middleware/auth.js';
import { updateUser, formatUser } from '../services/users.js';

const router = Router();
router.use(authenticate, loadUser);

const MIN_PASSWORD_LENGTH = 6;

router.get('/', (req, res) => {
  res.json({ user: formatUser(req.dbUser) });
});

router.patch('/', async (req, res, next) => {
  try {
    const { lastName, firstName, middleName, phone, email, password } = req.body;
    const mustChange = Boolean(req.dbUser.must_change_password);

    if (mustChange) {
      if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          error: `Укажите новый пароль (не менее ${MIN_PASSWORD_LENGTH} символов)`,
        });
      }
    }

    const payload = { lastName, firstName, middleName, phone, email };
    if (password) payload.password = password;

    const user = await updateUser(req.user.id, payload, false);
    res.json({ user });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email уже используется' });
    next(err);
  }
});

export default router;
