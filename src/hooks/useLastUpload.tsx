import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ParseSummary {
  total_rows?: number;
  mapped_rows?: number;
  skipped_rows?: number;
}

interface Upload {
  id: string;
  file_name: string;
  parse_status: string;
  parse_summary: ParseSummary | null;
  created_at: string;
}

interface LastUploadContextType {
  lastUpload: Upload | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const LastUploadContext = createContext<LastUploadContextType | undefined>(undefined);

export function LastUploadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lastUpload, setLastUpload] = useState<Upload | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLastUpload = async () => {
    if (!user) {
      setLastUpload(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('uploads')
        .select('id, file_name, parse_status, parse_summary, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setLastUpload({
          id: data.id,
          file_name: data.file_name,
          parse_status: data.parse_status,
          parse_summary: data.parse_summary as ParseSummary | null,
          created_at: data.created_at,
        });
      } else {
        setLastUpload(null);
      }
    } catch (err) {
      console.error('Error fetching last upload:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLastUpload();
  }, [user]);

  return (
    <LastUploadContext.Provider value={{ lastUpload, loading, refetch: fetchLastUpload }}>
      {children}
    </LastUploadContext.Provider>
  );
}

export function useLastUpload() {
  const context = useContext(LastUploadContext);
  if (context === undefined) {
    throw new Error('useLastUpload must be used within a LastUploadProvider');
  }
  return context;
}
