import { Request, Response, NextFunction } from 'express';
import { authService } from '../../src/integrations/mongodb/authService';

/**
 * Authentication middleware
 * Verifies JWT token and attaches full user object to request
 */
export const authenticateToken = async (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Verify token and extract userId
    const decoded = authService.verifyToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    // Fetch full user from database (includes isAdmin from User record or Profile)
    const user = await authService.getUserById(decoded.userId);
    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

