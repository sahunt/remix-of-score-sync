import { createContext, useContext, ReactNode } from 'react';
import { useUserScores } from '@/hooks/useUserScores';
import type { ScoreWithSong } from '@/types/scores';

interface ScoresContextValue {
  scores: ScoreWithSong[];
  isLoading: boolean;
  error: Error | null;
}

const ScoresContext = createContext<ScoresContextValue | null>(null);

interface ScoresProviderProps {
  children: ReactNode;
}

/**
 * Provides a shared, cached source of user scores across all protected routes.
 * This eliminates redundant fetching between Home, Scores, and Goal Detail pages.
 * The underlying useUserScores hook handles pagination and caching.
 */
export function ScoresProvider({ children }: ScoresProviderProps) {
  const { data: scores = [], isLoading, error } = useUserScores({ 
    enabled: true,
    queryKeySuffix: 'global'
  });

  return (
    <ScoresContext.Provider value={{ 
      scores, 
      isLoading, 
      error: error as Error | null 
    }}>
      {children}
    </ScoresContext.Provider>
  );
}

/**
 * Hook to access the shared scores cache.
 * Must be used within a ScoresProvider.
 */
export function useScores(): ScoresContextValue {
  const context = useContext(ScoresContext);
  if (!context) {
    throw new Error('useScores must be used within a ScoresProvider');
  }
  return context;
}
