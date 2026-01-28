import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useUsername() {
  const { user } = useAuth();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsername = useCallback(async () => {
    if (!user) {
      setUsername(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Get the display_name from user_profiles
      const { data, error } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.display_name) {
        setUsername(data.display_name);
      } else {
        // Fallback to email prefix
        const emailPrefix = user.email?.split('@')[0] || 'Player';
        setUsername(emailPrefix);
      }
    } catch (err) {
      console.error('Error fetching username:', err);
      // Fallback to email prefix on error
      const emailPrefix = user.email?.split('@')[0] || 'Player';
      setUsername(emailPrefix);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUsername();
  }, [fetchUsername]);

  return { username, loading, refetch: fetchUsername };
}
