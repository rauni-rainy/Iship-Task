import rateLimit from 'express-rate-limit';
import { Request } from 'express';

const keyGenerator = (req: Request) => {
  return (req as any).user?.userId || req.ip;
};

// Limits login attempts
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator
});

// Limits registration attempts (10 req/hour)
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, message: 'Too many registration attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator
});

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator
});

// Stricter limit for code submissions
export const submissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { success: false, message: 'Too many submissions, please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator
});

// Limit contest creation
export const contestCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many contests created. Limit is 5 per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator
});

// Admin limit
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { success: false, message: 'Too many admin requests.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator
});
