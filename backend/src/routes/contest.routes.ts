import { Router } from 'express';
import {
  createContest,
  getContests,
  getContestById,
  updateContest,
  deleteContest,
  registerForContest,
  getMyRegisteredContests,
  getMyInvitedContests,
  getPublicStats,
  getInvites,
  addInvite,
  removeInvite,
  requestToJoin,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
} from '../controllers/contest.controller';
import { authenticate, optionalAuth, verifyCsrf } from '../middleware/auth.middleware';
import { contestCreationLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.post('/', authenticate, verifyCsrf, contestCreationLimiter, createContest);
router.get('/stats/public', getPublicStats);
router.get('/', optionalAuth, getContests);
router.get('/my', authenticate, getMyRegisteredContests);
router.get('/my-invites', authenticate, getMyInvitedContests);

// Contest detail — optionalAuth so invite-token page can load without login
router.get('/:id', optionalAuth, getContestById);
router.put('/:id', authenticate, verifyCsrf, updateContest);
router.delete('/:id', authenticate, verifyCsrf, deleteContest);
router.post('/:id/register', authenticate, verifyCsrf, registerForContest);

// Join request flow (private contests)
router.post('/:id/request-join', authenticate, verifyCsrf, requestToJoin);
router.get('/:id/requests', authenticate, getJoinRequests);
router.post('/:id/requests/:requestId/approve', authenticate, verifyCsrf, approveJoinRequest);
router.post('/:id/requests/:requestId/reject', authenticate, verifyCsrf, rejectJoinRequest);

// Legacy invite management (kept for backward compat)
router.get('/:id/invites', authenticate, getInvites);
router.post('/:id/invites', authenticate, verifyCsrf, addInvite);
router.delete('/:id/invites/:username', authenticate, verifyCsrf, removeInvite);

export default router;
