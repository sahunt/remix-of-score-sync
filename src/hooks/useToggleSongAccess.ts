import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import type { ScoreWithSong } from '@/types/scores';

/**
 * Hook to toggle song access (has_access) for all charts of a song.
 * When toggling OFF access: upserts user_scores rows for all charts with has_access=false.
 * When toggling ON access: sets has_access=true on all existing rows.
 *
 * Uses optimistic cache updates for immediate UI feedback.
 */
export function useToggleSongAccess() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleAccess = useCallback(async (songId: number, hasAccess: boolean) => {
    if (!user?.id) return;
    setIsUpdating(true);

    // Optimistically update the React Query cache for immediate UI feedback
    const previousCacheEntries: Array<{ queryKey: unknown[]; data: unknown }> = [];
    queryClient.getQueriesData<ScoreWithSong[]>({ queryKey: ['user-scores'] }).forEach(
      ([queryKey, data]) => {
        if (!data) return;
        previousCacheEntries.push({ queryKey: queryKey as unknown[], data });
        const updated = data.map(score => {
          const scoreSongId = score.musicdb?.song_id ?? score.song_id;
          if (scoreSongId === songId) {
            return { ...score, has_access: hasAccess };
          }
          return score;
        });
        queryClient.setQueryData(queryKey, updated);
      }
    );

    try {
      // 1. Get all SP charts for this song from musicdb
      const { data: charts, error: chartsError } = await supabase
        .from('musicdb')
        .select('id, song_id')
        .eq('song_id', songId)
        .eq('playstyle', 'SP')
        .eq('deleted', false)
        .not('difficulty_level', 'is', null);

      if (chartsError) throw chartsError;
      if (!charts || charts.length === 0) return;

      const musicdbIds = charts.map(c => c.id);

      // 2. Find which charts already have user_scores rows
      const { data: existingScores, error: existingError } = await supabase
        .from('user_scores')
        .select('musicdb_id')
        .eq('user_id', user.id)
        .in('musicdb_id', musicdbIds);

      if (existingError) throw existingError;

      const existingIds = new Set((existingScores || []).map(s => s.musicdb_id));

      if (hasAccess) {
        // Toggling ON: just update existing rows
        if (existingIds.size > 0) {
          const { error } = await supabase
            .from('user_scores')
            .update({ has_access: true })
            .eq('user_id', user.id)
            .in('musicdb_id', musicdbIds);
          if (error) throw error;
        }
      } else {
        // Toggling OFF: update existing + insert missing
        if (existingIds.size > 0) {
          const { error } = await supabase
            .from('user_scores')
            .update({ has_access: false })
            .eq('user_id', user.id)
            .in('musicdb_id', Array.from(existingIds));
          if (error) throw error;
        }

        // Insert rows for charts without scores
        const missingCharts = charts.filter(c => !existingIds.has(c.id));
        if (missingCharts.length > 0) {
          // We need an upload_id - create a synthetic one for access-only rows
          // Use a deterministic upload_id based on user
          const { data: latestUpload } = await supabase
            .from('uploads')
            .select('id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // If no upload exists, we need to create a minimal upload record
          let uploadId = latestUpload?.id;
          if (!uploadId) {
            const { data: newUpload, error: uploadError } = await supabase
              .from('uploads')
              .insert({
                user_id: user.id,
                file_name: 'access-toggle',
                source_type: 'access_toggle',
                parse_status: 'complete',
              })
              .select('id')
              .single();
            if (uploadError) throw uploadError;
            uploadId = newUpload.id;
          }

          const inserts = missingCharts.map(c => ({
            user_id: user.id,
            musicdb_id: c.id,
            song_id: c.song_id,
            has_access: false,
            upload_id: uploadId!,
            source_type: 'access_toggle',
            score: null,
            rank: null,
            flare: null,
            halo: null,
          }));

          const { error } = await supabase
            .from('user_scores')
            .insert(inserts);
          if (error) throw error;
        }
      }

      // Background-refresh to sync with server state (non-blocking)
      queryClient.invalidateQueries({ queryKey: ['user-scores'] });
    } catch (error) {
      // Rollback optimistic update on failure
      for (const entry of previousCacheEntries) {
        queryClient.setQueryData(entry.queryKey, entry.data);
      }
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [user, queryClient]);

  return { toggleAccess, isUpdating };
}
