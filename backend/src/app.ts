import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
// @ts-ignore
import hpp from 'hpp';
import { apiLimiter } from './middleware/rateLimiter.middleware';
import authRoutes from './routes/auth.routes';
import contestRoutes from './routes/contest.routes';
import problemRoutes from './routes/problem.routes';
import submissionRoutes from './routes/submission.routes';
import adminRoutes from './routes/admin.routes';
import userRoutes from './routes/user.routes';
import { globalErrorHandler } from './utils/errorHandler';

const app = express();

// Trust proxy for rate limiting on Google Cloud Run
app.set('trust proxy', 1);

// Set strict CSP headers and general security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws://localhost:4000", "wss://"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Enable CORS with credentials for cookies
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parser, reading data from body into req.body, limit 10kb to prevent payload attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser for reading secure httpOnly cookies
app.use(cookieParser(process.env.COOKIE_SECRET));

// Data sanitization against XSS (cross-site scripting) attacks
// Note: xss-clean removed due to Express 5 incompatibility. React escapes HTML by default.

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Global API rate limiter
app.use('/api', apiLimiter);

import { uuidParamMiddleware } from './utils/validators';
app.use('/api', uuidParamMiddleware);

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api', problemRoutes);
app.use('/api', submissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

import { AppError } from './utils/errorHandler';
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler must be at the bottom
app.use(globalErrorHandler);

export default app;
