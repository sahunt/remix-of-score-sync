import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useUsername() {
  const { user } = useAuth();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsername = async () => {
      if (!user) {
        setUsername(null);
        setLoading(false);
        return;
      }

      try {
        // Get the username from the most recent user_scores entry
        const { data, error } = await supabase
          .from('user_scores')
          .select('username')
          .eq('user_id', user.id)
          .not('username', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data?.username) {
          setUsername(data.username);
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
    };

    fetchUsername();
  }, [user]);

  return { username, loading };
}
