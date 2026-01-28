import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TwelveMSModeContextType {
  is12MSMode: boolean;
  toggle12MSMode: () => void;
  transformHalo: (halo: string | null) => string | null;
  transformHaloLabel: (label: string | null) => string | null;
  reverseTransformHalo: (target: string | null) => string | null;
  loading: boolean;
}

const TwelveMSModeContext = createContext<TwelveMSModeContextType | undefined>(undefined);

// 12MS Mode transforms halos: PFC → MFC, FC → GFC, GFC → PFC
function getTransformedHalo(halo: string | null, isActive: boolean): string | null {
  if (!halo || !isActive) return halo;
  
  const normalized = halo.toLowerCase();
  const transformMap: Record<string, string> = {
    'pfc': 'mfc',
    'fc': 'gfc',
    'gfc': 'pfc',
  };
  
  return transformMap[normalized] || halo;
}

// Transform labels (preserves case pattern)
function getTransformedLabel(label: string | null, isActive: boolean): string | null {
  if (!label || !isActive) return label;
  
  const transformMap: Record<string, string> = {
    'PFC': 'MFC',
    'pfc': 'mfc',
    'Pfc': 'Mfc',
    'FC': 'GFC',
    'fc': 'gfc',
    'Fc': 'Gfc',
    'GFC': 'PFC',
    'gfc': 'pfc',
    'Gfc': 'Pfc',
  };
  
  return transformMap[label] || label;
}

// Reverse transformation: given a visual target, returns what DB value would display as that target
// e.g., in 12MS mode, visual "PFC" comes from actual "GFC" in DB
function getReverseTransformedHalo(target: string | null, isActive: boolean): string | null {
  if (!target || !isActive) return target;
  
  const normalized = target.toLowerCase();
  const reverseMap: Record<string, string> = {
    'mfc': 'pfc',  // Visual MFC comes from actual PFC
    'pfc': 'gfc',  // Visual PFC comes from actual GFC
    'gfc': 'fc',   // Visual GFC comes from actual FC
  };
  
  return reverseMap[normalized] || target;
}

export function TwelveMSModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [is12MSMode, setIs12MSMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch preference from user_profiles on mount
  useEffect(() => {
    const fetchPreference = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('twelve_ms_mode')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching 12MS mode preference:', error);
        } else if (data) {
          setIs12MSMode(data.twelve_ms_mode);
        }
      } catch (err) {
        console.error('Error fetching 12MS mode preference:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPreference();
  }, [user]);

  const toggle12MSMode = async () => {
    if (!user) return;

    const newValue = !is12MSMode;
    setIs12MSMode(newValue);

    // Upsert to database
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert(
          { user_id: user.id, twelve_ms_mode: newValue },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('Error saving 12MS mode preference:', error);
        // Revert on error
        setIs12MSMode(!newValue);
      }
    } catch (err) {
      console.error('Error saving 12MS mode preference:', err);
      setIs12MSMode(!newValue);
    }
  };

  const transformHalo = (halo: string | null) => getTransformedHalo(halo, is12MSMode);
  const transformHaloLabel = (label: string | null) => getTransformedLabel(label, is12MSMode);
  const reverseTransformHalo = (target: string | null) => getReverseTransformedHalo(target, is12MSMode);

  return (
    <TwelveMSModeContext.Provider value={{ 
      is12MSMode, 
      toggle12MSMode, 
      transformHalo, 
      transformHaloLabel, 
      reverseTransformHalo, 
      loading 
    }}>
      {children}
    </TwelveMSModeContext.Provider>
  );
}

export function use12MSMode() {
  const context = useContext(TwelveMSModeContext);
  if (context === undefined) {
    throw new Error('use12MSMode must be used within a TwelveMSModeProvider');
  }
  return context;
}
