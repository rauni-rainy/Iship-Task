import { Router } from 'express';
import {
  addProblem,
  getProblemsForContest,
  getProblemById,
  updateProblem,
  deleteProblem
} from '../controllers/problem.controller';
import { authenticate, optionalAuth, verifyCsrf } from '../middleware/auth.middleware';

const router = Router();

// Problem routes nested under contest
router.post('/contests/:contestId/problems', authenticate, verifyCsrf, addProblem);
router.get('/contests/:contestId/problems', optionalAuth, getProblemsForContest);

// Independent problem routes
router.get('/problems/:problemId', optionalAuth, getProblemById);
router.put('/problems/:problemId', authenticate, verifyCsrf, updateProblem);
router.delete('/problems/:problemId', authenticate, verifyCsrf, deleteProblem);

export default router;
