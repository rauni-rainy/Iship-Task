import { Router } from 'express';
import { getPublicProfile } from '../controllers/user.controller';

const router = Router();

router.get('/:username', getPublicProfile);

export default router;
