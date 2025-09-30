import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authAPI, AuthResponse } from '@/api/auth';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  isEmailVerified: boolean;
  isAdmin?: boolean;
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
  }) => Promise<{ error: any }>;
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
  }) => {
    try {
      // This would need to be implemented in the API
      // For now, just update local state
      if (user) {
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

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile
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
