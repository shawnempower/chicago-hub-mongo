// Admin API endpoints for lead management
import { API_BASE_URL } from '@/config/api';

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

export type LeadSource = 'storefront_form' | 'ai_chat' | 'manual_entry' | 'other';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'closed_won' | 'closed_lost';

export interface Lead {
  _id?: string;
  userId?: string;
  
  // Lead Source and Association
  leadSource: LeadSource;
  hubId: string;
  publicationId?: string;
  
  // Contact Information
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  businessName: string;
  websiteUrl?: string;
  
  // Lead Details
  budgetRange?: string;
  timeline?: string;
  marketingGoals?: string[];
  interestedOutlets?: string[];
  interestedPackages?: number[];
  
  // Enhanced fields for different form types
  message?: string;
  targetLaunchDate?: string;
  campaignGoals?: string | string[];
  
  // Flexible storage for form-specific data
  conversationContext?: {
    formType?: string;
    rawFormData?: Record<string, any>;
    [key: string]: any;
  };
  
  // Lead Management
  status?: LeadStatus;
  assignedTo?: string;
  followUpDate?: string;
  
  // Archiving
  archivedAt?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface LeadNote {
  _id?: string;
  leadId: string;
  authorId: string;
  authorName: string;
  noteContent: string;
  noteType: 'note' | 'status_change' | 'assignment' | 'system';
  metadata?: {
    previousStatus?: string;
    newStatus?: string;
    previousAssignee?: string;
    newAssignee?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LeadFilters {
  hubId?: string;
  publicationId?: string;
  status?: LeadStatus;
  leadSource?: LeadSource;
  includeArchived?: boolean;
}

export interface LeadsListResponse {
  leads: Lead[];
}

export interface LeadResponse {
  lead: Lead;
}

export interface LeadNotesResponse {
  notes: LeadNote[];
}

export interface LeadNoteResponse {
  note: LeadNote;
}

export interface LeadStatsResponse {
  stats: {
    total: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
    archived: number;
  };
}

export const leadsApi = {
  // Get all leads with filtering (admin only)
  async getAll(filters?: LeadFilters): Promise<LeadsListResponse> {
    try {
      const params = new URLSearchParams();
      if (filters?.hubId) params.append('hubId', filters.hubId);
      if (filters?.publicationId) params.append('publicationId', filters.publicationId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.leadSource) params.append('leadSource', filters.leadSource);
      if (filters?.includeArchived) params.append('includeArchived', 'true');

      const url = `${API_BASE_URL}/admin/leads${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
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

  // Get single lead by ID (admin only)
  async getById(leadId: string): Promise<LeadResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/leads/${leadId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
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
      console.error('Error fetching lead:', error);
      throw error;
    }
  },

  // Create new lead
  async create(leadData: Omit<Lead, '_id' | 'createdAt' | 'updatedAt'>): Promise<LeadResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/leads`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating lead:', error);
      throw error;
    }
  },

  // Update lead (admin only)
  async update(leadId: string, updateData: Partial<Lead>): Promise<LeadResponse> {
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

  // Archive lead (admin only)
  async archive(leadId: string): Promise<LeadResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/leads/${leadId}/archive`, {
        method: 'PUT',
        headers: getAuthHeaders(),
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
      console.error('Error archiving lead:', error);
      throw error;
    }
  },

  // Unarchive lead (admin only)
  async unarchive(leadId: string): Promise<LeadResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/leads/${leadId}/unarchive`, {
        method: 'PUT',
        headers: getAuthHeaders(),
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
      console.error('Error unarchiving lead:', error);
      throw error;
    }
  },

  // Get lead stats (admin only)
  async getStats(hubId?: string): Promise<LeadStatsResponse> {
    try {
      const url = `${API_BASE_URL}/admin/leads-stats${hubId ? `?hubId=${hubId}` : ''}`;
      const response = await fetch(url, {
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
      console.error('Error fetching lead stats:', error);
      throw error;
    }
  },

  // ===== LEAD NOTES API =====

  // Get all notes for a lead (admin only)
  async getNotes(leadId: string): Promise<LeadNotesResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/leads/${leadId}/notes`, {
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
      console.error('Error fetching lead notes:', error);
      throw error;
    }
  },

  // Add a note to a lead (admin only)
  async addNote(
    leadId: string,
    noteData: { noteContent: string; noteType?: LeadNote['noteType']; metadata?: LeadNote['metadata'] }
  ): Promise<LeadNoteResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/leads/${leadId}/notes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(noteData),
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding lead note:', error);
      throw error;
    }
  },

  // Update a note (admin only)
  async updateNote(
    leadId: string,
    noteId: string,
    noteData: { noteContent: string; metadata?: LeadNote['metadata'] }
  ): Promise<LeadNoteResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/leads/${leadId}/notes/${noteId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(noteData),
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied.');
        }
        if (response.status === 404) {
          throw new Error('Note not found.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating lead note:', error);
      throw error;
    }
  },

  // Delete a note (admin only)
  async deleteNote(leadId: string, noteId: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/leads/${leadId}/notes/${noteId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied.');
        }
        if (response.status === 404) {
          throw new Error('Note not found.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting lead note:', error);
      throw error;
    }
  },
};


