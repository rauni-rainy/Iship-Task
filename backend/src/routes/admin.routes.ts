import { Router } from 'express';
import {
  getContestLiveStats,
  getFlaggedUsers,
  getOnlineUsers,
  getRegisteredUsers,
  getAllSubmissionsForAdmin,
  unflagUser,
  listAllContestsAdmin,
  requireAdminOrCreator
} from '../controllers/admin.controller';
import { authenticate, requireRole, verifyCsrf } from '../middleware/auth.middleware';
import { adminLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.use(authenticate);
router.use(adminLimiter);

router.get('/contests', requireRole('admin'), listAllContestsAdmin);

router.get('/contests/:contestId/stats', requireAdminOrCreator, getContestLiveStats);
router.get('/contests/:contestId/flagged', requireAdminOrCreator, getFlaggedUsers);
router.get('/contests/:contestId/online', requireAdminOrCreator, getOnlineUsers);
router.get('/contests/:contestId/registered', requireAdminOrCreator, getRegisteredUsers);
router.get('/contests/:contestId/submissions', requireAdminOrCreator, getAllSubmissionsForAdmin);
router.post('/contests/:contestId/unflag/:userId', verifyCsrf, requireAdminOrCreator, unflagUser);

export default router;
