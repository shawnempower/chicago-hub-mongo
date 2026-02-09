// Authentication API endpoints for frontend
// This is a client-side API wrapper that will make requests to your backend
import { API_BASE_URL } from '@/config/api';

const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

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
  refreshToken?: string;
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

/** Called when session is invalid (401 after refresh failed). Opens modal; modal then sets user null and redirects. */
let onSessionExpired: (() => void) | null = null;

class AuthAPI {
  private baseUrl = `${API_BASE_URL}/auth`; // This will be your backend endpoint

  registerSessionExpiredCallback(cb: (() => void) | null): void {
    onSessionExpired = cb;
  }

  /** Clear tokens and notify app to show session-expired modal. Does not set user to null (modal does that on dismiss). */
  notifySessionExpired(): void {
    this.clearToken();
    onSessionExpired?.();
  }

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

      if (result.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, result.token);
        if (result.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
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

      if (result.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, result.token);
        if (result.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
      }
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: 'Network error occurred' };
    }
  }

  /** Refresh access token using refresh token. On success stores new tokens; on failure clears tokens. */
  async refresh(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return { error: 'No refresh token' };
    try {
      const response = await fetch(`${this.baseUrl}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const result = await response.json();
      if (!response.ok) {
        this.clearToken();
        return { error: result.error || 'Refresh failed' };
      }
      if (result.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, result.token);
        if (result.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
      }
      return result;
    } catch (error) {
      console.error('Refresh error:', error);
      this.clearToken();
      return { error: 'Network error occurred' };
    }
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      const response = await fetch(`${this.baseUrl}/signout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });
      this.clearToken();
      if (!response.ok) return { success: false, error: 'Sign out failed' };
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      this.clearToken();
      return { success: false, error: 'Network error occurred' };
    }
  }

  async getCurrentUser(): Promise<AuthResponse> {
    try {
      let token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return { error: 'No authentication token found' };

      let response = await fetch(`${this.baseUrl}/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        const refreshResult = await this.refresh();
        if (refreshResult.token && refreshResult.user) {
          response = await fetch(`${this.baseUrl}/me`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${refreshResult.token}` },
          });
          const result = await response.json();
          if (response.ok) return result;
        }
        this.notifySessionExpired();
        return { error: refreshResult.error || 'Session expired' };
      }

      const result = await response.json();
      if (!response.ok) return { error: result.error || 'Failed to get user' };
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
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      
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
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      
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
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  clearToken(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export const authAPI = new AuthAPI();
