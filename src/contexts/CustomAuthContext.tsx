import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authAPI, AuthResponse } from '@/api/auth';

export type UserRole = 'admin' | 'hub_user' | 'publication_user' | 'standard';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone?: string;
  isEmailVerified: boolean;
  isAdmin?: boolean; // Keep for backward compatibility
  role?: UserRole; // New role-based system
  permissions?: {
    assignedHubIds?: string[];
    assignedPublicationIds?: string[];
    canInviteUsers?: boolean;
  };
  lastLoginAt?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: {
    first_name?: string;
    last_name?: string;
    company_name?: string;
  }) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    phone?: string;
  }) => Promise<{ error: any }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: any }>;
  refreshUser: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = authAPI.getToken();
      if (token) {
        const response = await authAPI.getCurrentUser();
        if (response.user) {
          setUser(response.user);
        } else {
          // Clear invalid token
          authAPI.clearToken();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const signUp = async (email: string, password: string, metadata?: {
    first_name?: string;
    last_name?: string;
    company_name?: string;
  }) => {
    try {
      setLoading(true);
      
      const response = await authAPI.signUp({
        email,
        password,
        firstName: metadata?.first_name,
        lastName: metadata?.last_name,
        companyName: metadata?.company_name
      });

      if (response.error) {
        return { error: { message: response.error } };
      }

      if (response.user) {
        setUser(response.user);
      }

      return { error: null };
    } catch (error) {
      console.error('SignUp error:', error);
      return { error: { message: 'Failed to create account' } };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const response = await authAPI.signIn(email, password);

      if (response.error) {
        return { error: { message: response.error } };
      }

      if (response.user) {
        setUser(response.user);
      }

      return { error: null };
    } catch (error) {
      console.error('SignIn error:', error);
      return { error: { message: 'Failed to sign in' } };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await authAPI.signOut();
      setUser(null);
    } catch (error) {
      console.error('SignOut error:', error);
      // Still clear user on error
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    phone?: string;
  }) => {
    try {
      const response = await authAPI.updateProfile(updates);

      if (response.error) {
        return { error: { message: response.error } };
      }

      // Update local user state with the response
      if (response.user) {
        setUser(response.user);
      } else if (user) {
        // Fallback: update local state if no user returned
        setUser({
          ...user,
          ...updates
        });
      }

      return { error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      return { error: { message: 'Failed to update profile' } };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await authAPI.changePassword(currentPassword, newPassword);

      if (!response.success) {
        return { error: { message: response.error || 'Failed to change password' } };
      }

      return { error: null };
    } catch (error) {
      console.error('Change password error:', error);
      return { error: { message: 'Failed to change password' } };
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      if (response.user) {
        setUser(response.user);
        return { success: true };
      }
      return { success: false, error: 'Failed to refresh user data' };
    } catch (error) {
      console.error('Refresh user error:', error);
      return { success: false, error: 'Failed to refresh user data' };
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    changePassword,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
