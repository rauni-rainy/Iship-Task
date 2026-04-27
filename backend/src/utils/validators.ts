import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export const validateEmail = (email: string) => {
  if (!email || email.length > 255) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUsername = (username: string) => {
  if (!username) return false;
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
};

export const validatePassword = (password: string) => {
  if (!password || password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
};

export const validateUUID = (id: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export const validateDatetime = (dt: string) => {
  const date = new Date(dt);
  return !isNaN(date.getTime()) && date.getTime() > Date.now();
};

export const validateCodeLength = (code: string) => {
  return code && code.length <= 65536;
};

export const validateProblemStatement = (text: string) => {
  return text && text.length <= 50000;
};

export const uuidParamMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const uuidParams = ['id', 'contestId', 'problemId', 'userId'];
  for (const param of uuidParams) {
    if (req.params[param] && !validateUUID(req.params[param] as string)) {
      return next(new AppError(`Invalid ${param} format`, 400));
    }
  }
  next();
};
