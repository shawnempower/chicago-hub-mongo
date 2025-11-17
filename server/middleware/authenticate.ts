import { Request, Response, NextFunction } from 'express';
import { authService } from '../../src/integrations/mongodb/authService';
import { permissionsService } from '../../src/integrations/mongodb/permissionsService';

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

/**
 * Check if user is admin (checks both legacy isAdmin flag and new role)
 */
export const requireAdmin = async (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const isAdmin = permissionsService.isAdmin(req.user);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

/**
 * Check if user has access to a specific hub
 * @param paramName - The name of the route parameter containing the hubId (defaults to 'hubId')
 */
export const requireHubAccess = (paramName: string = 'hubId') => {
  return async (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin users have access to everything
    if (permissionsService.isAdmin(req.user)) {
      return next();
    }

    const hubId = req.params[paramName] || req.query[paramName] || req.body[paramName];
    if (!hubId) {
      return res.status(400).json({ error: `${paramName} is required` });
    }

    const hasAccess = await permissionsService.canAccessHub(req.user.id, hubId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this hub' });
    }

    next();
  };
};

/**
 * Check if user has access to a specific publication
 * @param paramName - The name of the route parameter containing the publicationId (defaults to 'publicationId')
 */
export const requirePublicationAccess = (paramName: string = 'publicationId') => {
  return async (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin users have access to everything
    if (permissionsService.isAdmin(req.user)) {
      return next();
    }

    const publicationId = req.params[paramName] || req.query[paramName] || req.body[paramName];
    if (!publicationId) {
      return res.status(400).json({ error: `${paramName} is required` });
    }

    const hasAccess = await permissionsService.canAccessPublication(req.user.id, String(publicationId));
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this publication' });
    }

    next();
  };
};

/**
 * Check if user can invite others (admin or users with canInviteUsers permission)
 */
export const requireInvitePermission = async (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check if user is admin (checks both isAdmin flag and role)
  const isAdmin = req.user.isAdmin === true || req.user.role === 'admin';
  
  if (isAdmin) {
    console.log('✅ Admin user detected, allowing invite permission');
    return next();
  }

  // For non-admin users, also check their full permissions from DB
  try {
    const userPermissions = await permissionsService.getPermissions(req.user.id);
    
    // If they have admin role in permissions
    if (userPermissions?.role === 'admin') {
      console.log('✅ User has admin role in permissions, allowing invite');
      return next();
    }
    
    // Check if user has canInviteUsers permission
    if (userPermissions?.canInviteUsers || req.user.permissions?.canInviteUsers) {
      console.log('✅ User has canInviteUsers permission, allowing invite');
      return next();
    }
  } catch (error) {
    console.error('Error checking user permissions:', error);
  }

  console.log('❌ User does not have invite permission', {
    isAdmin: req.user.isAdmin,
    role: req.user.role,
    permissions: req.user.permissions
  });
  
  return res.status(403).json({ 
    error: 'You do not have permission to invite users',
    debug: {
      isAdmin: req.user.isAdmin,
      role: req.user.role,
      hasPermissions: !!req.user.permissions
    }
  });
};

