import { Router, Request, Response } from 'express';
import { authService } from '../../src/integrations/mongodb/authService';
import { userProfilesService } from '../../src/integrations/mongodb/allServices';
import { authenticateToken } from '../middleware/authenticate';

const router = Router();

/** Platform hubId for auth-related activities (login, logout, password reset) */
const PLATFORM_HUB_ID = '__platform';

// Lazy load email service to avoid loading before env vars
async function getEmailService() {
  const { emailService } = await import('../emailService');
  return emailService;
}

// Lazy load activity tracking so auth routes don't depend on full allServices at startup
async function trackAuthActivity(data: {
  userId: string;
  interactionType: 'user_login' | 'user_logout' | 'password_reset_request' | 'password_reset';
  metadata?: { userEmail?: string; userName?: string };
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    const { userInteractionsService } = await import('../../src/integrations/mongodb/allServices');
    if (!userInteractionsService) {
      console.warn('Activity tracking skipped: userInteractionsService not initialized');
      return;
    }
    await userInteractionsService.track({
      userId: data.userId,
      interactionType: data.interactionType,
      hubId: PLATFORM_HUB_ID,
      metadata: data.metadata,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  } catch (err) {
    console.error('Activity tracking failed (auth):', err);
  }
}

// Sign up
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, companyName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.signUp({
      email,
      password,
      firstName,
      lastName,
      companyName
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Send welcome email
    const emailService = await getEmailService();
    if (emailService && result.user) {
      try {
        await emailService.sendWelcomeEmail({
          firstName: result.user.firstName || '',
          email: result.user.email,
          verificationToken: undefined // Add verification token if email verification is enabled
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the signup if email fails
      }
    }

    res.status(201).json({
      user: result.user,
      token: result.token,
      ...(result.refreshToken && { refreshToken: result.refreshToken }),
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign in
router.post('/signin', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.signIn(email, password);

    if (result.error) {
      return res.status(401).json({ error: result.error });
    }

    void trackAuthActivity({
      userId: result.user.id,
      interactionType: 'user_login',
      metadata: {
        userEmail: result.user.email,
        userName: [result.user.firstName, result.user.lastName].filter(Boolean).join(' ') || undefined,
      },
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      user: result.user,
      token: result.token,
      ...(result.refreshToken && { refreshToken: result.refreshToken }),
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh access token (no auth required; uses refresh token in body)
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const result = await authService.refreshTokens(refreshToken);
    if ('error' in result) {
      return res.status(401).json({ error: result.error });
    }

    res.json({
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign out (by access token in Authorization header, or by refresh token in body when token expired)
router.post('/signout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader && authHeader.split(' ')[1];
    const refreshToken = req.body?.refreshToken;

    if (accessToken) {
      try {
        const decoded = authService.verifyToken(accessToken);
        if (decoded?.userId) {
          await authService.signOut(accessToken);
          const user = await authService.getUserById(decoded.userId);
          trackAuthActivity({
            userId: decoded.userId,
            interactionType: 'user_logout',
            metadata: user?.email ? { userEmail: user.email, userName: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined } : undefined,
            ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
          }).catch(() => {});
        }
      } catch {
        // Token invalid/expired; try refresh token if provided
      }
    }
    if (refreshToken) {
      await authService.signOutByRefreshToken(refreshToken);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Signout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: any, res: Response) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request password reset
router.post('/request-password-reset', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await authService.generatePasswordResetToken(email);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    if (result.user && result.resetToken) {
      trackAuthActivity({
        userId: result.user.id,
        interactionType: 'password_reset_request',
        metadata: { userEmail: result.user.email, userName: [result.user.firstName, result.user.lastName].filter(Boolean).join(' ') || undefined },
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
      }).catch(() => {});
    }

    // Send password reset email if user exists and token was generated
    const emailService = await getEmailService();
    if (emailService && result.resetToken && result.user) {
      try {
        await emailService.sendPasswordResetEmail({
          firstName: result.user.firstName || '',
          email: result.user.email,
          resetToken: result.resetToken
        });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Don't reveal if email sending failed for security
      }
    }

    res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const result = await authService.resetPassword(token, newPassword);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    if (result.userId) {
      trackAuthActivity({
        userId: result.userId,
        interactionType: 'password_reset',
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
      }).catch(() => {});
    }

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify email
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const result = await authService.verifyEmail(token);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: 'Email has been verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile (including admin status and extended profile)
router.get('/profile', authenticateToken, async (req: any, res: Response) => {
  try {
    const profile = await userProfilesService.getByUserId(req.user.id);
    
    if (!profile) {
      // Return basic profile from user data if no extended profile exists
      return res.json({
        profile: {
          userId: req.user.id,
          firstName: req.user.firstName || '',
          lastName: req.user.lastName || '',
          email: req.user.email,
          isAdmin: req.user.isAdmin || false,
          createdAt: req.user.createdAt,
          updatedAt: req.user.updatedAt,
          profileCompletionScore: 0
        }
      });
    }
    
    res.json({ profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile
router.put('/profile', authenticateToken, async (req: any, res: Response) => {
  try {
    const { firstName, lastName, companyName, phone } = req.body;
    const userId = req.user.id;

    const result = await authService.updateProfile(userId, {
      firstName,
      lastName,
      companyName,
      phone
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ user: result.user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password (requires current password verification)
router.post('/change-password', authenticateToken, async (req: any, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const result = await authService.changePassword(userId, currentPassword, newPassword);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

