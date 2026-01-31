import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserStats {
  total_count: number;
  mfc_count: number;
  pfc_count: number;
  gfc_count: number;
  fc_count: number;
  life4_count: number;
  clear_count: number;
  fail_count: number;
  aaa_count: number;
  avg_score: number;
}

/**
 * Fetches aggregated user stats from the server-side get_user_stats function.
 * This moves lamp counting and average score calculation to PostgreSQL,
 * reducing client-side memory usage and improving performance for large datasets.
 * 
 * @param level - Optional difficulty level to filter by (null for all levels)
 * @returns Query result with UserStats object
 */
export function useUserStats(level: number | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-stats', user?.id, level],
    queryFn: async (): Promise<UserStats | null> => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase.rpc('get_user_stats', {
        p_user_id: user.id,
        p_playstyle: 'SP',
        p_difficulty_level: level,
      });
      
      if (error) throw error;
      
      // RPC returns an array, get first row
      if (data && Array.isArray(data) && data.length > 0) {
        return data[0] as UserStats;
      }
      
      // Return zero stats if no data
      return {
        total_count: 0,
        mfc_count: 0,
        pfc_count: 0,
        gfc_count: 0,
        fc_count: 0,
        life4_count: 0,
        clear_count: 0,
        fail_count: 0,
        aaa_count: 0,
        avg_score: 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
}
