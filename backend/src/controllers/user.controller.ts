import { Request, Response } from 'express';
import { asyncWrapper } from '../utils/asyncWrapper';
import * as userService from '../services/user.service';

export const getPublicProfile = asyncWrapper(async (req: Request, res: Response) => {
  const username = req.params.username as string;
  const profile = await userService.getPublicProfile(username);
  res.status(200).json({ success: true, ...profile });
});
