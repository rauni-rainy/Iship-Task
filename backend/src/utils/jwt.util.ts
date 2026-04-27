import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Ensures secure, short-lived access tokens
export const signAccessToken = (userId: string, role: string): string => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET as string, {
    expiresIn: '15m',
  });
};

// Ensures secure, longer-lived refresh tokens (can be revoked in DB)
export const signRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: '7d',
  });
};

export const verifyAccessToken = (token: string): any => {
  return jwt.verify(token, process.env.JWT_SECRET as string);
};

export const verifyRefreshToken = (token: string): any => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string);
};

// Hash tokens for secure DB storage (if DB compromised, tokens can't be used directly)
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
