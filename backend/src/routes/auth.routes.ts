import { Router } from 'express';
import { register, login, logout, refresh, getMe, getCsrfToken } from '../controllers/auth.controller';
import { authenticate, verifyCsrf } from '../middleware/auth.middleware';
import { authLimiter, registerLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Rate limited public routes
router.post('/register', registerLimiter, register);
router.post('/login', authLimiter, login);

router.get('/csrf-token', getCsrfToken);

// Protected routes requiring CSRF validation for state changes
router.post('/logout', authenticate, verifyCsrf, logout);
router.post('/refresh', verifyCsrf, refresh);

// Protected data route
router.get('/me', authenticate, getMe);

export default router;
