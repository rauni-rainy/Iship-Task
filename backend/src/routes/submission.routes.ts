import { Router } from 'express';
import {
  submitCode,
  getSubmissions,
  getLeaderboard,
  flagUser,
  getAntiCheatStatus
} from '../controllers/submission.controller';
import { authenticate, optionalAuth, verifyCsrf, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.post('/submissions', authenticate, verifyCsrf, submitCode);
router.get('/submissions', authenticate, getSubmissions);
router.get('/contests/:contestId/leaderboard', optionalAuth, getLeaderboard);

// Anti-Cheat Routes
router.post('/contests/:contestId/anti-cheat/flag', authenticate, verifyCsrf, flagUser);
router.get('/contests/:contestId/anti-cheat/status', authenticate, getAntiCheatStatus);

export default router;
