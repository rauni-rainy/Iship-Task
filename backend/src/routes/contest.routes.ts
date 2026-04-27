import { Router } from 'express';
import {
  createContest,
  getContests,
  getContestById,
  updateContest,
  deleteContest,
  registerForContest,
  getMyRegisteredContests,
  getPublicStats
} from '../controllers/contest.controller';
import { authenticate, optionalAuth, requireRole, verifyCsrf } from '../middleware/auth.middleware';
import { contestCreationLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.post('/', authenticate, verifyCsrf, contestCreationLimiter, createContest);
router.get('/stats/public', getPublicStats);
router.get('/', optionalAuth, getContests);
router.get('/my', authenticate, getMyRegisteredContests);
router.get('/:id', optionalAuth, getContestById);
router.put('/:id', authenticate, verifyCsrf, updateContest);
router.delete('/:id', authenticate, verifyCsrf, deleteContest);
router.post('/:id/register', authenticate, verifyCsrf, registerForContest);

export default router;
