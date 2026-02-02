import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Centralized cache invalidation hook for post-upload data refresh.
 * 
 * SIMPLIFIED ARCHITECTURE: Only 2 core caches need invalidation:
 * - user-scores: All user's played scores
 * - goals: User's goal definitions
 * 
 * All other data (stats, goal progress, counts) is derived client-side
 * from these two caches, so invalidating them refreshes everything.
 */
export function useUploadInvalidation() {
  const queryClient = useQueryClient();
  
  const invalidateAfterUpload = useCallback(() => {
    // Only these two need invalidation - everything else is derived
    queryClient.invalidateQueries({ queryKey: ['user-scores'] });
    queryClient.invalidateQueries({ queryKey: ['goals'] });
    queryClient.invalidateQueries({ queryKey: ['last-upload'] });
  }, [queryClient]);
  
  return { invalidateAfterUpload };
}
