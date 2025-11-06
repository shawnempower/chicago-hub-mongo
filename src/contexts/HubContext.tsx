/**
 * HubContext
 * 
 * Manages the currently selected hub across the application
 * Provides hub selection state and filtering capabilities
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Hub } from '@/integrations/mongodb/hubSchema';
import { useHubs } from '@/hooks/useHubs';

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
  const { hubs, loading, error } = useHubs({ status: 'active' });
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);
  const [selectedHub, setSelectedHub] = useState<Hub | null>(null);

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

