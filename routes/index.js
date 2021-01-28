import express from 'express';

import { getStatus, getStats } from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

const router = express.Router();

router.get('/status', getStatus);
router.get('/stats', getStats);
router.post('/users', UsersController.newUser);

export default router;
