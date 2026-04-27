import { Request, Response } from 'express';
import { asyncWrapper } from '../utils/asyncWrapper';
import * as problemService from '../services/problem.service';

const validateProblemInput = (data: any) => {
  const errors: Record<string, string> = {};
  if (!data.title || typeof data.title !== 'string') errors.title = 'Title is required';
  if (!data.statement || typeof data.statement !== 'string') errors.statement = 'Statement is required';

  if (Object.keys(errors).length > 0) {
    throw { statusCode: 400, isOperational: true, message: 'Validation failed', errors };
  }
};

export const addProblem = asyncWrapper(async (req: Request, res: Response) => {
  const contestId = req.params.contestId as string;
  const userId = req.user!.userId;

  try {
    validateProblemInput(req.body);
  } catch (err: any) {
    return res.status(400).json(err);
  }

  const problem = await problemService.addProblem(contestId, userId, req.body);
  res.status(201).json({ success: true, problem });
});

export const getProblemsForContest = asyncWrapper(async (req: Request, res: Response) => {
  const contestId = req.params.contestId as string;
  const userId = req.user?.userId;

  const problems = await problemService.getProblemsForContest(contestId, userId);
  res.status(200).json({ success: true, problems });
});

export const getProblemById = asyncWrapper(async (req: Request, res: Response) => {
  const problemId = req.params.problemId as string;
  const userId = req.user?.userId;

  const problem = await problemService.getProblemById(problemId, userId);
  res.status(200).json({ success: true, problem });
});

export const updateProblem = asyncWrapper(async (req: Request, res: Response) => {
  const problemId = req.params.problemId as string;
  const userId = req.user!.userId;

  const problem = await problemService.updateProblem(problemId, userId, req.body);
  res.status(200).json({ success: true, problem });
});

export const deleteProblem = asyncWrapper(async (req: Request, res: Response) => {
  const problemId = req.params.problemId as string;
  const userId = req.user!.userId;

  await problemService.deleteProblem(problemId, userId);
  res.status(200).json({ success: true, message: 'Problem deleted successfully' });
});
