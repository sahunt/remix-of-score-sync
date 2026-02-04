import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { biasToUserOffset, userOffsetToBias } from '@/lib/offsetUtils';

interface OffsetData {
  /** User-facing offset value (already converted from bias_ms) */
  effectiveOffset: number | null;
  /** Global offset from song_bias table */
  globalOffset: number | null;
  /** User's custom offset (if set) */
  customOffset: number | null;
  /** Whether user has a custom offset set */
  hasCustomOffset: boolean;
  /** Loading state */
  loading: boolean;
}

interface UseOffsetReturn extends OffsetData {
  /** Save a custom offset for this song */
  saveCustomOffset: (offset: number) => Promise<void>;
  /** Delete the custom offset, reverting to global */
  clearCustomOffset: () => Promise<void>;
  /** Refresh offset data */
  refetch: () => Promise<void>;
}

export function useOffset(songId: number | null): UseOffsetReturn {
  const { user } = useAuth();
  const [globalOffset, setGlobalOffset] = useState<number | null>(null);
  const [customOffset, setCustomOffset] = useState<number | null>(null);
  const [customOffsetId, setCustomOffsetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchOffsets = useCallback(async () => {
    if (!songId) {
      setGlobalOffset(null);
      setCustomOffset(null);
      setCustomOffsetId(null);
      return;
    }

    setLoading(true);
    try {
      // Fetch global offset from song_bias
      const { data: biasData } = await supabase
        .from('song_bias')
        .select('bias_ms')
        .eq('song_id', songId)
        .maybeSingle();

      if (biasData?.bias_ms !== undefined && biasData?.bias_ms !== null) {
        setGlobalOffset(biasToUserOffset(biasData.bias_ms));
      } else {
        setGlobalOffset(null);
      }

      // Fetch user's custom offset if logged in
      if (user) {
        const { data: customData } = await supabase
          .from('user_song_offsets')
          .select('id, custom_bias_ms')
          .eq('song_id', songId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (customData?.custom_bias_ms !== undefined && customData?.custom_bias_ms !== null) {
          setCustomOffset(biasToUserOffset(customData.custom_bias_ms));
          setCustomOffsetId(customData.id);
        } else {
          setCustomOffset(null);
          setCustomOffsetId(null);
        }
      }
    } catch (err) {
      console.error('Error fetching offsets:', err);
    } finally {
      setLoading(false);
    }
  }, [songId, user]);

  useEffect(() => {
    fetchOffsets();
  }, [fetchOffsets]);

  const saveCustomOffset = useCallback(async (offset: number) => {
    if (!songId || !user) return;

    const biasMs = userOffsetToBias(offset);

    try {
      if (customOffsetId) {
        // Update existing
        await supabase
          .from('user_song_offsets')
          .update({ custom_bias_ms: biasMs, updated_at: new Date().toISOString() })
          .eq('id', customOffsetId);
      } else {
        // Insert new
        await supabase
          .from('user_song_offsets')
          .insert({
            song_id: songId,
            user_id: user.id,
            custom_bias_ms: biasMs,
          });
      }
      
      // Refetch to get updated data
      await fetchOffsets();
    } catch (err) {
      console.error('Error saving custom offset:', err);
      throw err;
    }
  }, [songId, user, customOffsetId, fetchOffsets]);

  const clearCustomOffset = useCallback(async () => {
    if (!customOffsetId) return;

    try {
      await supabase
        .from('user_song_offsets')
        .delete()
        .eq('id', customOffsetId);

      setCustomOffset(null);
      setCustomOffsetId(null);
    } catch (err) {
      console.error('Error clearing custom offset:', err);
      throw err;
    }
  }, [customOffsetId]);

  const hasCustomOffset = customOffset !== null;
  const effectiveOffset = hasCustomOffset ? customOffset : globalOffset;

  return {
    effectiveOffset,
    globalOffset,
    customOffset,
    hasCustomOffset,
    loading,
    saveCustomOffset,
    clearCustomOffset,
    refetch: fetchOffsets,
  };
}
