import { Router } from 'express';
import { authenticate, ensurePasswordChanged, requireRoles } from '../middleware/auth.js';
import * as projects from '../services/projects.js';
import { canAccessProject, canManageProject } from '../services/access.js';
import { parseMonthQuery } from '../utils/month.js';

const router = Router();
router.use(authenticate, ensurePasswordChanged);

router.get('/managers', requireRoles('head', 'manager'), async (req, res, next) => {
  try {
    if (req.user.role === 'manager') {
      const list = await projects.listManagers();
      const self = list.find((m) => m.id === req.user.id);
      res.json(self ? [self] : []);
      return;
    }
    res.json(await projects.listManagers());
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    const list = await projects.listProjects(
      {
        status: req.query.status,
        search: req.query.search,
        year: req.query.year,
        month: req.query.month,
      },
      req.user
    );
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!(await canAccessProject(req.user, id))) {
      return res.status(403).json({ error: 'Нет доступа к проекту' });
    }
    const period = parseMonthQuery(req.query);
    const p = await projects.getProject(id, period);
    if (!p) return res.status(404).json({ error: 'Проект не найден' });
    res.json({ ...p, period });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRoles('head', 'manager'), async (req, res, next) => {
  try {
    const p = await projects.createProject(req.body, req.user);
    res.status(201).json(p);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireRoles('head', 'manager'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!(await canManageProject(req.user, id))) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    const p = await projects.updateProject(id, req.body);
    if (!p) return res.status(404).json({ error: 'Проект не найден' });
    res.json(p);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRoles('head', 'manager'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!(await canManageProject(req.user, id))) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    await projects.deleteProject(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
