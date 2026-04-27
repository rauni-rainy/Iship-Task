import { Request, Response, NextFunction } from 'express';
import { asyncWrapper } from '../utils/asyncWrapper';
import * as adminService from '../services/admin.service';
import pool from '../db/pool';
import { AppError } from '../utils/errorHandler';

// Helper middleware to check if user is admin or contest creator
export const requireAdminOrCreator = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
  const contestId = req.params.contestId;
  if (!contestId) return next(new AppError('Contest ID required', 400));
  
  if (req.user!.role === 'admin') {
    return next();
  }

  const contestRes = await pool.query('SELECT created_by FROM contests WHERE id = $1', [contestId]);
  if (contestRes.rows.length === 0) return next(new AppError('Contest not found', 404));

  if (contestRes.rows[0].created_by === req.user!.userId) {
    return next();
  }

  return next(new AppError('Forbidden: Not an admin or contest creator', 403));
});

export const getContestLiveStats = asyncWrapper(async (req: Request, res: Response) => {
  const contestId = req.params.contestId as string;
  const stats = await adminService.getContestLiveStats(contestId);
  res.status(200).json({ success: true, stats });
});

export const getFlaggedUsers = asyncWrapper(async (req: Request, res: Response) => {
  const contestId = req.params.contestId as string;
  const flagged = await adminService.getFlaggedUsers(contestId);
  res.status(200).json({ success: true, flagged });
});

export const getOnlineUsers = asyncWrapper(async (req: Request, res: Response) => {
  const contestId = req.params.contestId as string;
  const onlineUsers = await adminService.getOnlineUsers(contestId);
  res.status(200).json({ success: true, onlineUsers });
});

export const getAllSubmissionsForAdmin = asyncWrapper(async (req: Request, res: Response) => {
  const contestId = req.params.contestId as string;
  const { page, limit, verdict, userId } = req.query;
  const submissions = await adminService.getAllSubmissionsForAdmin(contestId, {
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 20,
    verdict,
    userId
  });
  res.status(200).json({ success: true, ...submissions });
});

export const unflagUser = asyncWrapper(async (req: Request, res: Response) => {
  const contestId = req.params.contestId as string;
  const userId = req.params.userId as string;
  const adminUserId = req.user!.userId;
  
  await adminService.unflagUser(userId, contestId, adminUserId);
  res.status(200).json({ success: true, message: 'User unflagged successfully' });
});

export const listAllContestsAdmin = asyncWrapper(async (req: Request, res: Response) => {
  const { getContests } = require('../services/contest.service');
  const contests = await getContests({ ...req.query, role: 'admin' });
  res.status(200).json({ success: true, ...contests });
});
