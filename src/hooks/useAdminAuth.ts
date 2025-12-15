import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/CustomAuthContext';
import { userProfilesApi } from '@/api/userProfiles';

export const useAdminAuth = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // First check if admin flag is already in user object
        if (user.isAdmin !== undefined) {
          setIsAdmin(user.isAdmin);
          setLoading(false);
          return;
        }

        // If not in user object, check user profile
        const profile = await userProfilesApi.getProfile();
        const isAdminUser = profile?.isAdmin || false;
        
        // Fallback to email check for backward compatibility
        if (!isAdminUser) {
          const emailCheck = user.email === 'admin@chicagohub.com' || user.email?.includes('admin');
          setIsAdmin(emailCheck);
        } else {
          setIsAdmin(isAdminUser);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        // Fallback to email check if API fails
        const emailCheck = user.email === 'admin@chicagohub.com' || user.email?.includes('admin');
        setIsAdmin(emailCheck);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, loading };
};