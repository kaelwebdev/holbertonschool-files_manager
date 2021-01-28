import express from 'express';

import { getStatus, getStats } from '../controllers/AppController';
import { newUser } from '../controllers/UsersController';

const router = express.Router();

router.get('/status', getStatus);
router.get('/stats', getStats);
router.post('/users', newUser);

export default router;
