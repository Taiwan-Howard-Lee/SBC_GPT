import express from 'express';
import * as authController from '../controllers/authController';

const router = express.Router();

// Login route
router.post('/login', authController.login);

// Validate authentication route
router.get('/validate', authController.validateAuth);

export default router;
