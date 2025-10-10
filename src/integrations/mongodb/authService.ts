import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDatabase } from './client';
import { User, UserSession, UserProfile, COLLECTIONS } from './schemas';
import { ObjectId } from 'mongodb';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

// Password configuration
const SALT_ROUNDS = 12;

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  isEmailVerified: boolean;
  isAdmin?: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

export interface LoginResult {
  user: AuthUser;
  token: string;
  refreshToken?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

export class AuthService {
  private usersCollection = getDatabase().collection<User>(COLLECTIONS.USERS);
  private sessionsCollection = getDatabase().collection<UserSession>(COLLECTIONS.USER_SESSIONS);
  private profilesCollection = getDatabase().collection<UserProfile>(COLLECTIONS.USER_PROFILES);

  // Helper to convert User to AuthUser with admin flag from profile
  private async userToAuthUser(user: User): Promise<AuthUser> {
    try {
      // Get user profile to check admin status
      const profile = await this.profilesCollection.findOne({ userId: user._id?.toString() });
      
      return {
        id: user._id?.toString() || '',
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        isEmailVerified: user.isEmailVerified,
        isAdmin: profile?.isAdmin || false,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt
      };
    } catch (error) {
      console.error('Error fetching user profile for admin status:', error);
      // Return without admin flag if profile fetch fails
      return {
        id: user._id?.toString() || '',
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        isEmailVerified: user.isEmailVerified,
        isAdmin: false,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt
      };
    }
  }

  // Generate JWT token
  private generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  // Generate refresh token
  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  // Verify JWT token
  public verifyToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      return decoded;
    } catch (error) {
      return null;
    }
  }

  // Hash password
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  // Verify password
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Sign up new user
  async signUp(signUpData: SignUpData): Promise<{ user: AuthUser; token: string; error?: string }> {
    try {
      const { email, password, firstName, lastName, companyName } = signUpData;

      // Check if user already exists
      const existingUser = await this.usersCollection.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return { user: {} as AuthUser, token: '', error: 'User already exists with this email' };
      }

      // Validate password strength
      if (password.length < 6) {
        return { user: {} as AuthUser, token: '', error: 'Password must be at least 6 characters long' };
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');

      // Create user
      const now = new Date();
      const newUser: User = {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        companyName,
        isEmailVerified: false, // TODO: Implement email verification
        emailVerificationToken,
        createdAt: now,
        updatedAt: now
      };

      const result = await this.usersCollection.insertOne(newUser);
      const userId = result.insertedId.toString();

      // Generate token
      const token = this.generateToken(userId);

      // Create session
      await this.createSession(userId, token);

      // Return user without sensitive data
      const user = await this.userToAuthUser({ ...newUser, _id: result.insertedId });
      
      return { user, token };
    } catch (error) {
      console.error('Error in signUp:', error);
      return { user: {} as AuthUser, token: '', error: 'Failed to create account' };
    }
  }

  // Sign in user
  async signIn(email: string, password: string): Promise<{ user: AuthUser; token: string; error?: string }> {
    try {
      // Find user
      const user = await this.usersCollection.findOne({ email: email.toLowerCase() });
      if (!user) {
        return { user: {} as AuthUser, token: '', error: 'Invalid email or password' };
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        return { user: {} as AuthUser, token: '', error: 'Invalid email or password' };
      }

      // Update last login
      await this.usersCollection.updateOne(
        { _id: user._id },
        { 
          $set: { 
            lastLoginAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      // Generate token
      const userId = user._id?.toString() || '';
      const token = this.generateToken(userId);

      // Create session
      await this.createSession(userId, token);

      // Return user without sensitive data
      const authUser = await this.userToAuthUser(user);
      
      return { user: authUser, token };
    } catch (error) {
      console.error('Error in signIn:', error);
      return { user: {} as AuthUser, token: '', error: 'Failed to sign in' };
    }
  }

  // Get user by ID
  async getUserById(userId: string): Promise<AuthUser | null> {
    try {
      const user = await this.usersCollection.findOne({ _id: new ObjectId(userId) });
      if (!user) return null;
      
      return await this.userToAuthUser(user);
    } catch (error) {
      console.error('Error in getUserById:', error);
      return null;
    }
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<AuthUser | null> {
    try {
      const user = await this.usersCollection.findOne({ email: email.toLowerCase() });
      if (!user) return null;
      
      return await this.userToAuthUser(user);
    } catch (error) {
      console.error('Error in getUserByEmail:', error);
      return null;
    }
  }

  // Get user by token
  async getUserByToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = this.verifyToken(token);
      if (!decoded) return null;

      return await this.getUserById(decoded.userId);
    } catch (error) {
      console.error('Error in getUserByToken:', error);
      return null;
    }
  }

  // Create session
  private async createSession(userId: string, token: string, userAgent?: string, ipAddress?: string): Promise<void> {
    try {
      const session: UserSession = {
        userId,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        createdAt: new Date(),
        userAgent,
        ipAddress
      };

      await this.sessionsCollection.insertOne(session);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  }

  // Sign out (invalidate session)
  async signOut(token: string): Promise<void> {
    try {
      await this.sessionsCollection.deleteOne({ token });
    } catch (error) {
      console.error('Error in signOut:', error);
    }
  }

  // Sign out all sessions for user
  async signOutAllSessions(userId: string): Promise<void> {
    try {
      await this.sessionsCollection.deleteMany({ userId });
    } catch (error) {
      console.error('Error in signOutAllSessions:', error);
    }
  }

  // Validate session
  async validateSession(token: string): Promise<boolean> {
    try {
      const session = await this.sessionsCollection.findOne({ 
        token,
        expiresAt: { $gt: new Date() }
      });
      
      return !!session;
    } catch (error) {
      console.error('Error in validateSession:', error);
      return false;
    }
  }

  // Clean up expired sessions
  async cleanupExpiredSessions(): Promise<void> {
    try {
      await this.sessionsCollection.deleteMany({
        expiresAt: { $lt: new Date() }
      });
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  }

  // Generate password reset token
  async generatePasswordResetToken(email: string): Promise<{ success: boolean; resetToken?: string; user?: AuthUser; error?: string }> {
    try {
      const user = await this.usersCollection.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal if email exists
        return { success: true };
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await this.usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            passwordResetToken: resetToken,
            passwordResetExpires: resetExpires,
            updatedAt: new Date()
          }
        }
      );

      return { 
        success: true, 
        resetToken,
        user: await this.userToAuthUser(user)
      };
    } catch (error) {
      console.error('Error generating password reset token:', error);
      return { success: false, error: 'Failed to generate reset token' };
    }
  }

  // Reset password with token
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.usersCollection.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      });

      if (!user) {
        return { success: false, error: 'Invalid or expired reset token' };
      }

      if (newPassword.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long' };
      }

      const passwordHash = await this.hashPassword(newPassword);

      await this.usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            passwordHash,
            updatedAt: new Date()
          },
          $unset: {
            passwordResetToken: '',
            passwordResetExpires: ''
          }
        }
      );

      // Sign out all sessions
      await this.signOutAllSessions(user._id?.toString() || '');

      return { success: true };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: 'Failed to reset password' };
    }
  }

  // Verify email with token
  async verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.usersCollection.findOne({ emailVerificationToken: token });
      
      if (!user) {
        return { success: false, error: 'Invalid verification token' };
      }

      await this.usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            isEmailVerified: true,
            updatedAt: new Date()
          },
          $unset: {
            emailVerificationToken: ''
          }
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Error verifying email:', error);
      return { success: false, error: 'Failed to verify email' };
    }
  }

  // Update user profile
  async updateProfile(userId: string, updates: Partial<Pick<User, 'firstName' | 'lastName' | 'companyName'>>): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      const result = await this.usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            ...updates,
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        return { success: false, error: 'User not found' };
      }

      const updatedUser = await this.getUserById(userId);
      return { success: true, user: updatedUser || undefined };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  }
}

// Export singleton instance
// Export service instance - will be initialized after env vars are loaded
export let authService: AuthService;

// Initialize auth service - call this after environment variables are loaded
export const initializeAuthService = () => {
  authService = new AuthService();
};
