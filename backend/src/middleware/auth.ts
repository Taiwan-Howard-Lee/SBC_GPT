import { Request, Response, NextFunction } from 'express';

// Import the sessions from the auth controller
// In a real app, you'd use a proper session store
import { isAuthenticated } from '../controllers/authController';

export { isAuthenticated };
