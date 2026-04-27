import { Request, Response } from 'express';
import { asyncWrapper } from '../utils/asyncWrapper';
import * as contestService from '../services/contest.service';
import { AppError } from '../utils/errorHandler';

const validateContestInput = (data: any) => {
  const errors: Record<string, string> = {};
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) errors.title = 'Title is required';
  if (!data.startTime || isNaN(Date.parse(data.startTime))) errors.startTime = 'Valid start time is required';
  if (!data.endTime || isNaN(Date.parse(data.endTime))) errors.endTime = 'Valid end time is required';
  if (data.isPublic !== undefined && typeof data.isPublic !== 'boolean') errors.isPublic = 'isPublic must be a boolean';

  if (Object.keys(errors).length > 0) {
    throw { statusCode: 400, isOperational: true, message: 'Validation failed', errors };
  }
};

export const createContest = asyncWrapper(async (req: Request, res: Response) => {
  try {
    validateContestInput(req.body);
  } catch (err: any) {
    return res.status(400).json(err);
  }

  const userId = req.user!.userId;
  const contest = await contestService.createContest(userId, req.body);
  res.status(201).json({ success: true, contest });
});

export const getContests = asyncWrapper(async (req: Request, res: Response) => {
  const { status, isPublic, page, limit, createdByMe } = req.query;
  const role = req.user?.role || 'user';
  const userId = req.user?.userId;
  
  let isPublicParsed: boolean | undefined;
  if (isPublic === 'true') isPublicParsed = true;
  else if (isPublic === 'false') isPublicParsed = false;

  const result = await contestService.getContests({
    status: status as string,
    isPublic: isPublicParsed,
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 20,
    role,
    createdByMe: createdByMe === 'true' ? userId : undefined
  });

  res.status(200).json({ success: true, ...result });
});

export const getContestById = asyncWrapper(async (req: Request, res: Response) => {
  const contestId = req.params.id as string;
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  const contest = await contestService.getContestById(contestId, userId, userRole);
  res.status(200).json({ success: true, contest });
});

export const updateContest = asyncWrapper(async (req: Request, res: Response) => {
  const contestId = req.params.id as string;
  const userId = req.user!.userId;
  
  // Validation (partial)
  if (req.body.title !== undefined && (typeof req.body.title !== 'string' || req.body.title.trim().length === 0)) {
    return res.status(400).json({ success: false, errors: { title: 'Title cannot be empty' } });
  }

  const contest = await contestService.updateContest(contestId, userId, req.body);
  res.status(200).json({ success: true, contest });
});

export const deleteContest = asyncWrapper(async (req: Request, res: Response) => {
  const contestId = req.params.id as string;
  const userId = req.user!.userId;
  const userRole = req.user!.role;

  await contestService.deleteContest(contestId, userId, userRole);
  res.status(200).json({ success: true, message: 'Contest deleted successfully' });
});

export const registerForContest = asyncWrapper(async (req: Request, res: Response) => {
  const contestId = req.params.id as string;
  const userId = req.user!.userId;
  const { inviteToken } = req.body;

  const registration = await contestService.registerForContest(userId, contestId, inviteToken);
  res.status(201).json({ success: true, registration });
});

export const getMyRegisteredContests = asyncWrapper(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const contests = await contestService.getMyRegisteredContests(userId);
  res.status(200).json({ success: true, contests });
});

export const getPublicStats = asyncWrapper(async (req: Request, res: Response) => {
  const stats = await contestService.getPublicStats();
  res.status(200).json({ success: true, stats });
});
