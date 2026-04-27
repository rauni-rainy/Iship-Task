import { Request, Response } from 'express';
import { asyncWrapper } from '../utils/asyncWrapper';
import * as submissionService from '../services/submission.service';
import pool from '../db/pool';

const validateSubmissionInput = (data: any) => {
  const errors: Record<string, string> = {};
  if (!data.problemId || typeof data.problemId !== 'string') errors.problemId = 'Valid problemId is required';
  if (!data.contestId || typeof data.contestId !== 'string') errors.contestId = 'Valid contestId is required';
  if (!data.code || typeof data.code !== 'string') errors.code = 'Code is required';
  if (!data.language || typeof data.language !== 'string') errors.language = 'Language is required';

  if (Object.keys(errors).length > 0) {
    throw { statusCode: 400, isOperational: true, message: 'Validation failed', errors };
  }
};

export const submitCode = asyncWrapper(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  
  try {
    validateSubmissionInput(req.body);
  } catch (err: any) {
    return res.status(400).json(err);
  }

  const { problemId, contestId, code, language } = req.body;
  
  const submission = await submissionService.submitCode(userId, problemId, contestId, { code, language });
  
  res.status(202).json({ success: true, submission });
});

export const getSubmissions = asyncWrapper(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const contestId = req.query.contestId as string;
  const problemId = req.query.problemId as string;

  if (!contestId) {
    return res.status(400).json({ success: false, message: 'contestId is required' });
  }

  const submissions = await submissionService.getSubmissions(userId, contestId, problemId);
  res.status(200).json({ success: true, submissions });
});

export const getLeaderboard = asyncWrapper(async (req: Request, res: Response) => {
  const contestId = req.params.contestId as string;
  
  const leaderboard = await submissionService.getLeaderboard(contestId);
  res.status(200).json({ success: true, leaderboard });
});

export const getSubmissionsForAdmin = asyncWrapper(async (req: Request, res: Response) => {
  const contestId = req.params.contestId as string;
  
  const submissions = await submissionService.getSubmissionsForAdmin(contestId);
  res.status(200).json({ success: true, submissions });
});

export const flagUser = asyncWrapper(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const contestId = req.params.contestId as string;
  const { reason, isAutoSubmit } = req.body;

  if (!reason || !['fullscreen_exit', 'tab_switch'].includes(reason)) {
    return res.status(400).json({ success: false, message: 'Invalid reason' });
  }

  const result = await pool.query(
    `UPDATE registrations 
     SET flag_count = flag_count + 1, is_flagged = true, flag_reason = $1 
     WHERE user_id = $2 AND contest_id = $3 
     RETURNING flag_count`,
    [reason, userId, contestId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Registration not found' });
  }

  const flagCount = result.rows[0].flag_count;

  if (isAutoSubmit) {
    await submissionService.autoSubmitAll(userId, contestId, reason);
  } else {
    const io = (global as any).io;
    if (io) {
      io.to(`admin:contest:${contestId}`).emit('admin:user_flagged', { 
        userId, contestId, reason, flagCount, timestamp: new Date() 
      });
    }
  }

  res.status(200).json({ success: true, flagCount, wasAutoSubmitted: isAutoSubmit });
});

export const getAntiCheatStatus = asyncWrapper(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const contestId = req.params.contestId as string;

  const result = await pool.query(
    `SELECT is_flagged, flag_count FROM registrations WHERE user_id = $1 AND contest_id = $2`,
    [userId, contestId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Registration not found' });
  }

  res.status(200).json({
    success: true,
    isFlagged: result.rows[0].is_flagged,
    flagCount: result.rows[0].flag_count
  });
});
