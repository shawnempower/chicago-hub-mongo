import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';

export interface DashboardStats {
  leads: number;
  publications: number;
  adInventory: number;
  conversations: number;
  packages: number;
  publicationFiles: number;
  
  // Marketplace-focused aggregates
  inventoryByType: {
    website: number;
    newsletter: number;
    print: number;
    events: number;
    social: number;
    crossChannel: number;
  };
  
  publicationsByType: {
    daily: number;
    weekly: number;
    monthly: number;
    other: number;
  };
  
  geographicCoverage: {
    local: number;
    regional: number;
    state: number;
    national: number;
    international: number;
  };
  
  contentTypes: {
    news: number;
    lifestyle: number;
    business: number;
    entertainment: number;
    sports: number;
    alternative: number;
    mixed: number;
  };
  
  audienceMetrics: {
    totalWebsiteVisitors: number;
    totalNewsletterSubscribers: number;
    totalSocialFollowers: number;
    averageEngagementRate: number;
  };
  
  pricingInsights: {
    averageWebsiteAdPrice: number;
    averageNewsletterAdPrice: number;
    averagePrintAdPrice: number;
    totalInventoryValue: number;
  };
}

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/admin/dashboard-stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchDashboardStats,
  };
};
