import React, { createContext, useContext, useState, useEffect } from 'react';
import { Agency } from '../types';
import { db } from '../db/db';
import { syncEngine } from '../sync/syncEngine';

interface AgencyContextType {
  currentAgency: Agency | null;
  allAgencies: Agency[];
  loading: boolean;
  selectAgency: (id: string) => void;
  createAgency: (data: Omit<Agency, 'id' | 'createdAt' | 'synced'>) => Promise<Agency>;
  clearAgency: () => void;
  refreshAgencies: () => Promise<void>;
}

const AgencyContext = createContext<AgencyContextType | undefined>(undefined);

export const AgencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentAgency, setCurrentAgency] = useState<Agency | null>(() => {
    try {
      const saved = localStorage.getItem('bunk_active_agency_data');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [allAgencies, setAllAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshAgencies = async () => {
    const agencies = await db.agencies.toArray();
    setAllAgencies(agencies);

    // Auto-select if only 1 agency exists and none currently selected
    if (!currentAgency && agencies.length === 1) {
      const single = agencies[0];
      setCurrentAgency(single);
      localStorage.setItem('bunk_active_agency_id', single.id);
      localStorage.setItem('bunk_active_agency_data', JSON.stringify(single));
      return;
    }

    // Validate current agency still exists
    if (currentAgency) {
      const stillExists = agencies.find(a => a.id === currentAgency.id);
      if (!stillExists && agencies.length > 0) {
        // If current agency ID not found, select first available agency
        const fallback = agencies[0];
        setCurrentAgency(fallback);
        localStorage.setItem('bunk_active_agency_id', fallback.id);
        localStorage.setItem('bunk_active_agency_data', JSON.stringify(fallback));
      } else if (!stillExists && agencies.length === 0) {
        setCurrentAgency(null);
        localStorage.removeItem('bunk_active_agency_id');
        localStorage.removeItem('bunk_active_agency_data');
      }
    }
  };

  useEffect(() => {
    refreshAgencies().finally(() => setLoading(false));

    // Push any un-synced existing local agencies to cloud so other devices get it immediately
    db.agencies.toArray().then(localAgencies => {
      if (localAgencies.length > 0) {
        for (const a of localAgencies) {
          syncEngine.enqueue('AGENCY', 'CREATE', a.id, a).catch(console.warn);
        }
        syncEngine.triggerSync().catch(console.warn);
      }
    });

    const handleSync = () => {
      refreshAgencies();
    };

    window.addEventListener('bunk_cloud_synced', handleSync);
    return () => {
      window.removeEventListener('bunk_cloud_synced', handleSync);
    };
  }, []);

  const selectAgency = (id: string) => {
    const agency = allAgencies.find(a => a.id === id);
    if (agency) {
      setCurrentAgency(agency);
      localStorage.setItem('bunk_active_agency_id', agency.id);
      localStorage.setItem('bunk_active_agency_data', JSON.stringify(agency));
    }
  };

  const createAgency = async (data: Omit<Agency, 'id' | 'createdAt' | 'synced'>): Promise<Agency> => {
    const agency: Agency = {
      ...data,
      id: 'agency-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      createdAt: new Date().toISOString(),
      synced: false,
    };
    await db.agencies.put(agency);
    setCurrentAgency(agency);
    localStorage.setItem('bunk_active_agency_id', agency.id);
    localStorage.setItem('bunk_active_agency_data', JSON.stringify(agency));
    
    // Enqueue for cloud sync so all other devices receive this agency immediately!
    await syncEngine.enqueue('AGENCY', 'CREATE', agency.id, agency);
    syncEngine.triggerSync().catch(console.warn);

    await refreshAgencies();
    return agency;
  };

  const clearAgency = () => {
    setCurrentAgency(null);
    localStorage.removeItem('bunk_active_agency_id');
    localStorage.removeItem('bunk_active_agency_data');
    // Also clear user session when switching agency
    localStorage.removeItem('bunk_active_user_id');
    localStorage.removeItem('bunk_active_user_data');
  };

  return (
    <AgencyContext.Provider
      value={{
        currentAgency,
        allAgencies,
        loading,
        selectAgency,
        createAgency,
        clearAgency,
        refreshAgencies,
      }}
    >
      {children}
    </AgencyContext.Provider>
  );
};

export const useAgency = () => {
  const context = useContext(AgencyContext);
  if (!context) throw new Error('useAgency must be used within an AgencyProvider');
  return context;
};
