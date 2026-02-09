import type { UserProfile } from "@/types/common";
import { API_BASE_URL } from '@/config/api';
import { authenticatedFetch } from '@/api/client';

export const userProfilesApi = {
  // Get user profile
  async getProfile(): Promise<UserProfile | null> {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/profile`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },

  // Update user profile
  async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.profile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },
};

