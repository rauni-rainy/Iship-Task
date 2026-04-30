import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';

const keyGenerator = (req: Request, res: any) => {
  // If authenticate middleware already ran
  if ((req as any).user?.userId) {
    return (req as any).user.userId;
  }
  
  // Since apiLimiter runs before auth middleware, try to extract from cookie directly
  const token = req.cookies?.access_token;
  if (token) {
    try {
      const decoded = verifyAccessToken(token) as any;
      if (decoded && decoded.userId) {
        return decoded.userId;
      }
    } catch (e) {
      // Ignore invalid tokens for rate limiting
    }
  }

  return req.ip ? ipKeyGenerator(req.ip) : 'unknown';
};

// Limits login attempts
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator
});

// Limits registration attempts (10 req/hour)
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: { success: false, message: 'Too many registration attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator
});

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator
});

// Stricter limit for code submissions
export const submissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 25,
  message: { success: false, message: 'Too many submissions, please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator
});

// Limit contest creation
export const contestCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { success: false, message: 'Too many contests created. Limit is 5 per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator
});

// Admin limit
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  message: { success: false, message: 'Too many admin requests.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator
});
