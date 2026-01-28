import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TwelveMSModeContextType {
  is12MSMode: boolean;
  toggle12MSMode: () => void;
  transformHalo: (halo: string | null) => string | null;
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

  return (
    <TwelveMSModeContext.Provider value={{ is12MSMode, toggle12MSMode, transformHalo, loading }}>
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
