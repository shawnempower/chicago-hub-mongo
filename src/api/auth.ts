// Authentication API endpoints for frontend
// This is a client-side API wrapper that will make requests to your backend
import { API_BASE_URL } from '@/config/api';

export interface AuthResponse {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    phone?: string;
    isEmailVerified: boolean;
    isAdmin?: boolean;
    lastLoginAt?: string;
    createdAt: string;
  };
  token?: string;
  error?: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

class AuthAPI {
  private baseUrl = `${API_BASE_URL}/auth`; // This will be your backend endpoint

  async signUp(data: SignUpData): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { error: result.error || 'Sign up failed' };
      }

      // Store token in localStorage
      if (result.token) {
        localStorage.setItem('auth_token', result.token);
      }

      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: 'Network error occurred' };
    }
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { error: result.error || 'Sign in failed' };
      }

      // Store token in localStorage
      if (result.token) {
        localStorage.setItem('auth_token', result.token);
      }

      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: 'Network error occurred' };
    }
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${this.baseUrl}/signout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      // Clear token regardless of response
      localStorage.removeItem('auth_token');

      if (!response.ok) {
        return { success: false, error: 'Sign out failed' };
      }

      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      // Still clear token on error
      localStorage.removeItem('auth_token');
      return { success: false, error: 'Network error occurred' };
    }
  }

  async getCurrentUser(): Promise<AuthResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        return { error: 'No authentication token found' };
      }

      const response = await fetch(`${this.baseUrl}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        // Clear invalid token
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
        }
        return { error: result.error || 'Failed to get user' };
      }

      return result;
    } catch (error) {
      console.error('Get current user error:', error);
      return { error: 'Network error occurred' };
    }
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/request-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, error: result.error || 'Password reset request failed' };
      }

      return { success: true };
    } catch (error) {
      console.error('Password reset request error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, error: result.error || 'Password reset failed' };
      }

      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  async verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, error: result.error || 'Email verification failed' };
      }

      return { success: true };
    } catch (error) {
      console.error('Email verification error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  async updateProfile(data: UpdateProfileData): Promise<AuthResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        return { error: 'No authentication token found' };
      }

      const response = await fetch(`${this.baseUrl}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { error: result.error || 'Failed to update profile' };
      }

      return result;
    } catch (error) {
      console.error('Update profile error:', error);
      return { error: 'Network error occurred' };
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        return { success: false, error: 'No authentication token found' };
      }

      const response = await fetch(`${this.baseUrl}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to change password' };
      }

      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  clearToken(): void {
    localStorage.removeItem('auth_token');
  }
}

export const authAPI = new AuthAPI();
