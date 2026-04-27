import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { AppError } from '../utils/errorHandler';

// Authenticate middleware: validates JWT from httpOnly cookie
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.access_token;
  if (!token) {
    return next(new AppError('Not authenticated', 401));
  }

  try {
    const decoded = verifyAccessToken(token) as { userId: string; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    return next(new AppError('Invalid or expired token', 401));
  }
};

// Optional auth: attempts to authenticate but doesn't throw if no token exists
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.access_token;
  if (!token) {
    return next();
  }

  try {
    const decoded = verifyAccessToken(token) as { userId: string; role: string };
    req.user = decoded;
  } catch (error) {
    // Ignore error for optional auth
  }
  next();
};

// Require Role middleware: ensures user has the specific role (e.g., admin)
export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return next(new AppError('Forbidden: insufficient permissions', 403));
    }
    next();
  };
};

// CSRF Protection: verifies the CSRF header matches the CSRF cookie value
export const verifyCsrf = (req: Request, res: Response, next: NextFunction) => {
  // Only apply to state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const csrfCookie = req.cookies?.csrf_token;
    const csrfHeader = req.headers['x-csrf-token'];

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return next(new AppError('CSRF token mismatch or missing', 403));
    }
  }
  next();
};
