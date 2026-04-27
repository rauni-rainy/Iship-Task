import { Request, Response } from 'express';
import crypto from 'crypto';
import * as authService from '../services/auth.service';
import { asyncWrapper } from '../utils/asyncWrapper';

// Cookie options ensuring security
const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict' as const,
  path: '/',
};

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('access_token', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 mins
  });

  res.cookie('refresh_token', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

const generateAndSetCsrfToken = (res: Response) => {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  // CSRF token must not be httpOnly so the frontend can read it and send it in headers
  res.cookie('csrf_token', csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/',
  });
  return csrfToken;
};

export const getCsrfToken = asyncWrapper(async (req: Request, res: Response) => {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie('csrf_token', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  res.status(200).json({ success: true, csrfToken });
});

export const register = asyncWrapper(async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  const user = await authService.register(username, email, password);
  res.status(201).json({ success: true, user });
});

export const login = asyncWrapper(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.login(email, password);

  setAuthCookies(res, accessToken, refreshToken);
  generateAndSetCsrfToken(res);

  res.status(200).json({ success: true, user });
});

export const logout = asyncWrapper(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token;
  const userId = req.user?.userId;

  if (userId && refreshToken) {
    await authService.logout(userId, refreshToken);
  }

  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.clearCookie('csrf_token');

  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

export const refresh = asyncWrapper(async (req: Request, res: Response) => {
  const incomingRefreshToken = req.cookies?.refresh_token;
  const newAccessToken = await authService.refreshAccessToken(incomingRefreshToken);

  res.cookie('access_token', newAccessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 mins
  });

  res.status(200).json({ success: true, message: 'Token refreshed' });
});

export const getMe = asyncWrapper(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const user = await authService.getProfile(userId);
  res.status(200).json({ success: true, user });
});
