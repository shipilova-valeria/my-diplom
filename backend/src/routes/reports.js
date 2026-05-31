import { Router } from 'express';
import { authenticate, ensurePasswordChanged, requireRoles } from '../middleware/auth.js';
import { generateExcelReport } from '../services/reports.js';

const router = Router();
router.use(authenticate, ensurePasswordChanged, requireRoles('head'));

router.get('/excel', async (req, res, next) => {
  try {
    const { buffer, filename } = await generateExcelReport(req.query);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

export default router;
