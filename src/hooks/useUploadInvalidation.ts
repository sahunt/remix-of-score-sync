import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Centralized cache invalidation hook for post-upload data refresh.
 * 
 * Since score data only changes when a user uploads new scores,
 * we use aggressive caching everywhere and invalidate all score-related
 * caches only after a successful upload.
 */
export function useUploadInvalidation() {
  const queryClient = useQueryClient();
  
  const invalidateAfterUpload = useCallback(() => {
    // Invalidate all score-related queries
    queryClient.invalidateQueries({ queryKey: ['user-scores'] });
    queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    queryClient.invalidateQueries({ queryKey: ['goals'] });
    queryClient.invalidateQueries({ queryKey: ['goal-progress'] });
    queryClient.invalidateQueries({ queryKey: ['last-upload'] });
  }, [queryClient]);
  
  return { invalidateAfterUpload };
}
