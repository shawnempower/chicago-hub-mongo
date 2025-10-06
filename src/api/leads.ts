// Admin API endpoints for lead management

const API_BASE_URL = '/api';

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Create headers with auth token
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export interface Lead {
  _id?: string;
  userId?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  businessName: string;
  websiteUrl?: string;
  budgetRange?: string;
  timeline?: string;
  marketingGoals?: string[];
  interestedOutlets?: string[];
  interestedPackages?: number[];
  conversationContext?: Record<string, any>;
  status?: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'closed_won' | 'closed_lost';
  assignedTo?: string;
  followUpDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadsListResponse {
  leads: Lead[];
}

export interface LeadUpdateResponse {
  lead: Lead;
}

export const leadsApi = {
  // Get all leads (admin only)
  async getAll(): Promise<LeadsListResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/leads`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching leads:', error);
      throw error;
    }
  },

  // Update lead (admin only)
  async update(leadId: string, updateData: Partial<Lead>): Promise<LeadUpdateResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/leads/${leadId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        if (response.status === 404) {
          throw new Error('Lead not found.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating lead:', error);
      throw error;
    }
  },
};


