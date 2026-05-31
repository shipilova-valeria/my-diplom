import { Router } from 'express';
import { authenticate, ensurePasswordChanged, requireRoles } from '../middleware/auth.js';
import * as tasks from '../services/tasks.js';
import * as taskTime from '../services/taskTime.js';
import { canAccessProject, canManageProject } from '../services/access.js';
import { parseMonthQuery } from '../utils/month.js';

const router = Router();
router.use(authenticate, ensurePasswordChanged);

router.get('/assignees', async (_req, res, next) => {
  try {
    res.json(await tasks.listAssignees());
  } catch (err) {
    next(err);
  }
});

router.get('/project/:projectId/kanban', async (req, res, next) => {
  try {
    const projectId = Number(req.params.projectId);
    if (!(await canAccessProject(req.user, projectId))) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    const period = parseMonthQuery(req.query);
    const board = await tasks.getKanban(
      projectId,
      req.query.search,
      period.start,
      period.end,
      req.user.id
    );
    res.json(board);
  } catch (err) {
    next(err);
  }
});

router.get('/project/:projectId', async (req, res, next) => {
  try {
    const projectId = Number(req.params.projectId);
    if (!(await canAccessProject(req.user, projectId))) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    const list = await tasks.listByProject(projectId, req.query);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const projectId = req.body.projectId;
    if (!(await canAccessProject(req.user, projectId))) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    const task = await tasks.createTask(req.body);
    await tasks.recalcProjectProgress(task.projectId);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const projectId = await tasks.getTaskProjectId(Number(req.params.id));
    if (!projectId || !(await canAccessProject(req.user, projectId))) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    const task = await tasks.updateTask(Number(req.params.id), req.body);
    if (!task) return res.status(404).json({ error: 'Задача не найдена' });
    await tasks.recalcProjectProgress(task.projectId);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const projectId = await tasks.getTaskProjectId(Number(req.params.id));
    if (!projectId || !(await canAccessProject(req.user, projectId))) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    const task = await tasks.updateStatus(Number(req.params.id), req.body.status);
    if (!task) return res.status(404).json({ error: 'Задача не найдена' });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRoles('head', 'manager'), async (req, res, next) => {
  try {
    const projectId = await tasks.getTaskProjectId(Number(req.params.id));
    if (!projectId || !(await canManageProject(req.user, projectId))) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    await tasks.deleteTask(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get('/:id/time', async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const projectId = await tasks.getTaskProjectId(taskId);
    if (!projectId || !(await canAccessProject(req.user, projectId))) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    res.json(await taskTime.getTaskTimeDetail(taskId, req.user.id));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/time/start', async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const projectId = await tasks.getTaskProjectId(taskId);
    if (!projectId || !(await canAccessProject(req.user, projectId))) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    await taskTime.startTimer(taskId, req.user.id);
    res.json(await taskTime.getTaskTimeDetail(taskId, req.user.id));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/time/stop', async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const projectId = await tasks.getTaskProjectId(taskId);
    if (!projectId || !(await canAccessProject(req.user, projectId))) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    await taskTime.stopTimer(taskId, req.user.id);
    res.json(await taskTime.getTaskTimeDetail(taskId, req.user.id));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/time/log', async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const projectId = await tasks.getTaskProjectId(taskId);
    if (!projectId || !(await canAccessProject(req.user, projectId))) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    const minutes = Number(req.body.minutes);
    if (!minutes || minutes < 1) {
      return res.status(400).json({ error: 'Укажите время в минутах (от 1)' });
    }
    await taskTime.logManualTime(taskId, req.user.id, minutes);
    res.json(await taskTime.getTaskTimeDetail(taskId, req.user.id));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/comments', async (req, res, next) => {
  try {
    const projectId = await tasks.getTaskProjectId(Number(req.params.id));
    if (!projectId || !(await canAccessProject(req.user, projectId))) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    const comments = await tasks.getComments(Number(req.params.id));
    res.json(comments);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/comments', async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const projectId = await tasks.getTaskProjectId(taskId);
    if (!projectId || !(await canAccessProject(req.user, projectId))) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Комментарий пуст' });
    await tasks.addComment(taskId, req.user.id, content.trim());
    const comments = await tasks.getComments(taskId);
    res.status(201).json(comments);
  } catch (err) {
    next(err);
  }
});

export default router;
