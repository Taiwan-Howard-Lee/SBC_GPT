import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

// Simple in-memory session storage
// In a production app, you'd use a proper session store
const sessions: Record<string, boolean> = {};

/**
 * Login controller
 */
export const login = (req: Request, res: Response) => {
  const { password } = req.body;

  // Get admin password from environment variables
  const adminPassword = process.env.ADMIN_PASSWORD || 'howard123';

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password is required'
    });
  }

  if (password === adminPassword) {
    // Generate a simple session ID
    // In a real app, you'd use a more secure method
    const sessionId = Math.random().toString(36).substring(2, 15);

    // Store session
    sessions[sessionId] = true;

    return res.json({
      success: true,
      message: 'Authentication successful',
      sessionId
    });
  } else {
    return res.status(401).json({
      success: false,
      message: 'Invalid password'
    });
  }
};

/**
 * Validate authentication
 */
export const validateAuth = (req: Request, res: Response) => {
  const sessionId = req.headers.authorization;

  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  return res.json({
    success: true,
    message: 'Session is valid'
  });
};

/**
 * Middleware to check if user is authenticated
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.headers.authorization;

  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  next();
};
