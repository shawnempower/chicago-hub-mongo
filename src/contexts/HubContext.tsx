/**
 * HubContext
 * 
 * Manages the currently selected hub across the application
 * Provides hub selection state and filtering capabilities
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Hub } from '@/integrations/mongodb/hubSchema';
import { useHubs } from '@/hooks/useHubs';
import { useAuth } from './CustomAuthContext';

interface HubContextType {
  selectedHub: Hub | null;
  setSelectedHub: (hub: Hub | null) => void;
  selectedHubId: string | null;
  setSelectedHubId: (hubId: string | null) => void;
  hubs: Hub[];
  loading: boolean;
  error: string | null;
}

const HubContext = createContext<HubContextType | undefined>(undefined);

export const HubProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { hubs: allHubs, loading, error, refetch } = useHubs({ status: 'active' });
  const { user } = useAuth();
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);
  const [selectedHub, setSelectedHub] = useState<Hub | null>(null);

  // Log hub context state for debugging
  useEffect(() => {
    console.log('🎯 HubContext State:', {
      loading,
      error,
      hubsCount: allHubs.length,
      selectedHubId,
      hasUser: !!user
    });
  }, [loading, error, allHubs.length, selectedHubId, user]);

  // Create a stable reference for user hub permissions to detect changes
  const userHubPermissionsKey = useMemo(() => {
    if (!user?.permissions?.assignedHubIds) return '';
    return user.permissions.assignedHubIds.sort().join(',');
  }, [user?.permissions?.assignedHubIds]);

  // Refetch hubs when user permissions change (e.g., after accepting an invite)
  useEffect(() => {
    if (userHubPermissionsKey && refetch) {
      console.log('🔄 HubContext: User hub permissions changed, refetching hubs');
      refetch();
    }
  }, [userHubPermissionsKey, refetch]);

  // Filter hubs based on user permissions (if not admin)
  const hubs = useMemo(() => {
    // Admins see all hubs
    if (user?.isAdmin || user?.role === 'admin') {
      return allHubs;
    }

    // If user has no permissions data, show all (backward compatible)
    if (!user?.permissions?.assignedHubIds) {
      return allHubs;
    }

    // Filter to only assigned hubs
    const assignedHubIds = user.permissions.assignedHubIds;
    if (assignedHubIds.length === 0) {
      return allHubs; // No filtering if empty array (backward compatible)
    }

    return allHubs.filter(hub => assignedHubIds.includes(hub.hubId));
  }, [allHubs, user]);

  // Auto-select first hub on load
  useEffect(() => {
    if (hubs.length > 0 && !selectedHubId) {
      const defaultHubId = hubs[0].hubId;
      setSelectedHubId(defaultHubId);
      setSelectedHub(hubs[0]);
      
      // Store in localStorage for persistence
      localStorage.setItem('selectedHubId', defaultHubId);
    }
  }, [hubs, selectedHubId]);

  // Load saved hub from localStorage
  useEffect(() => {
    const savedHubId = localStorage.getItem('selectedHubId');
    if (savedHubId && hubs.length > 0) {
      const hub = hubs.find(h => h.hubId === savedHubId);
      if (hub) {
        setSelectedHubId(savedHubId);
        setSelectedHub(hub);
      }
    }
  }, [hubs]);

  // Update selectedHub when selectedHubId changes
  useEffect(() => {
    if (selectedHubId) {
      const hub = hubs.find(h => h.hubId === selectedHubId);
      if (hub) {
        setSelectedHub(hub);
        localStorage.setItem('selectedHubId', selectedHubId);
      }
    }
  }, [selectedHubId, hubs]);

  const handleSetSelectedHubId = (hubId: string | null) => {
    setSelectedHubId(hubId);
    if (hubId) {
      localStorage.setItem('selectedHubId', hubId);
    } else {
      localStorage.removeItem('selectedHubId');
    }
  };

  const handleSetSelectedHub = (hub: Hub | null) => {
    setSelectedHub(hub);
    if (hub) {
      setSelectedHubId(hub.hubId);
      localStorage.setItem('selectedHubId', hub.hubId);
    } else {
      setSelectedHubId(null);
      localStorage.removeItem('selectedHubId');
    }
  };

  return (
    <HubContext.Provider
      value={{
        selectedHub,
        setSelectedHub: handleSetSelectedHub,
        selectedHubId,
        setSelectedHubId: handleSetSelectedHubId,
        hubs,
        loading,
        error,
      }}
    >
      {children}
    </HubContext.Provider>
  );
};

export const useHubContext = () => {
  const context = useContext(HubContext);
  if (context === undefined) {
    throw new Error('useHubContext must be used within a HubProvider');
  }
  return context;
};

