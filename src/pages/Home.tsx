import { useState, useCallback, useMemo, useEffect } from 'react';
import { useUsername } from '@/hooks/useUsername';
import { useSessionCharacter } from '@/hooks/useSessionCharacter';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useGoals } from '@/hooks/useGoals';
import { useGoalProgress, meetsTarget } from '@/hooks/useGoalProgress';
import { use12MSMode } from '@/hooks/use12MSMode';
import { useSongCatalogSearch } from '@/hooks/useSongCatalogSearch';
import { useMusicDb, filterChartsByCriteria } from '@/hooks/useMusicDb';
import { useScores } from '@/contexts/ScoresContext';
import { filterScoresByRules } from '@/lib/filterMatcher';
import { UserAvatar } from '@/components/home/UserAvatar';
import { SearchBar } from '@/components/home/SearchBar';
import { SongSearchCard } from '@/components/home/SongSearchCard';
import { SongDetailModal } from '@/components/scores/SongDetailModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { GoalCard } from '@/components/home/GoalCard';
import { GoalsEmptyState } from '@/components/home/GoalsEmptyState';
import { CreateGoalSheet } from '@/components/goals/CreateGoalSheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import rainbowBg from '@/assets/rainbow-bg.png';
import rinonFilter from '@/assets/rinon-filter.png';
import type { FilterRule } from '@/components/filters/filterTypes';
import type { PreloadedChart, ScoreWithSong } from '@/types/scores';

interface Goal {
  id: string;
  name: string;
  target_type: string;
  target_value: string;
  criteria_rules: unknown[];
  criteria_match_mode: string;
  goal_mode: string;
  goal_count?: number | null;
  score_mode?: string;
  score_floor?: number | null;
}

// Component to render a goal card with client-calculated progress
function GoalCardWithProgress({ 
  goal, 
  scores, 
  allCharts, 
  isLoading,
  reverseTransformHalo,
}: { 
  goal: Goal; 
  scores: ScoreWithSong[];
  allCharts: ReturnType<typeof useMusicDb>['data'];
  isLoading: boolean;
  reverseTransformHalo: (target: string | null) => string | null;
}) {
  // Calculate progress client-side from scores and musicdb cache
  const progress = useMemo(() => {
    if (isLoading || !allCharts) {
      return { completed: 0, total: 0, averageScore: 0 };
    }

    const criteriaRules = goal.criteria_rules as FilterRule[];
    const targetType = goal.target_type as 'lamp' | 'grade' | 'flare' | 'score';
    const targetValue = goal.target_value;
    
    // Filter musicdb charts by goal criteria to get total
    const levelRule = criteriaRules.find(r => r.type === 'level');
    const difficultyRule = criteriaRules.find(r => r.type === 'difficulty');
    
    const matchingCharts = filterChartsByCriteria(
      allCharts.charts,
      levelRule ? { operator: levelRule.operator, value: levelRule.value as number[] | [number, number] } : null,
      difficultyRule ? { operator: difficultyRule.operator, value: difficultyRule.value as string[] } : null
    );
    
    const total = goal.goal_mode === 'count' 
      ? (goal.goal_count ?? 0) 
      : matchingCharts.length;
    
    // Filter user scores by goal criteria
    const matchingScores = filterScoresByRules(
      scores, 
      criteriaRules, 
      goal.criteria_match_mode as 'all' | 'any'
    );
    
    // Handle average score mode
    if (targetType === 'score' && goal.score_mode === 'average') {
      const playedWithScores = matchingScores.filter(s => s.score !== null);
      const avg = playedWithScores.length > 0
        ? Math.round(playedWithScores.reduce((sum, s) => sum + (s.score ?? 0), 0) / playedWithScores.length / 10) * 10
        : 0;
      return {
        completed: avg,
        total: parseInt(targetValue, 10),
        averageScore: avg,
      };
    }
    
    // Count completed scores
    const completedCount = matchingScores.filter(s => 
      meetsTarget(s, targetType, targetValue, reverseTransformHalo)
    ).length;
    
    return {
      completed: goal.goal_mode === 'count' 
        ? Math.min(completedCount, goal.goal_count ?? completedCount)
        : completedCount,
      total,
      averageScore: 0,
    };
  }, [goal, scores, allCharts, isLoading, reverseTransformHalo]);

  const isAverageMode = goal.target_type === 'score' && goal.score_mode === 'average';

  return (
    <GoalCard
      id={goal.id}
      title={goal.name}
      targetType={goal.target_type as 'lamp' | 'grade' | 'flare' | 'score'}
      targetValue={goal.target_value}
      current={progress.completed}
      total={progress.total}
      scoreMode={goal.score_mode as 'target' | 'average' | undefined}
      scoreFloor={goal.score_floor}
      isLoading={isLoading}
    />
  );
}

// Difficulty order for modal preloading
const DIFFICULTY_ORDER = ['CHALLENGE', 'EXPERT', 'DIFFICULT', 'BASIC', 'BEGINNER'];

interface SelectedSong {
  songId: number;
  songName: string;
  artist: string | null;
  eamuseId: string | null;
  era: number | null;
  preloadedCharts?: PreloadedChart[];
}

export default function Home() {
  const { username, loading: usernameLoading } = useUsername();
  const characterImage = useSessionCharacter();
  const { isVisible } = useScrollDirection({ threshold: 15 });
  const { goals, isLoading: goalsLoading } = useGoals();
  const { reverseTransformHalo } = use12MSMode();
  const [createGoalOpen, setCreateGoalOpen] = useState(false);
  
  // Debounced search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  // Debounce search input (200ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const { results: searchResults, isLoading: searchLoading } = useSongCatalogSearch(debouncedQuery);
  const isSearching = searchQuery.trim().length > 0;
  
  // Modal state
  const [selectedSong, setSelectedSong] = useState<SelectedSong | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Unified caches for goal progress calculation and modal preloading
  const { data: musicDb, isLoading: musicDbLoading } = useMusicDb();
  const { scores: globalScores, isLoading: scoresLoading } = useScores();
  
  const handleSongClick = useCallback((song: { songId: number; name: string; artist: string | null; eamuseId: string | null; era: number | null }) => {
    // Get ALL charts for this song from the pre-cached data
    const allChartsForSong = musicDb?.bySongId?.get(song.songId) ?? [];
    
    let preloadedCharts: PreloadedChart[] | undefined;
    
    // Only preload if we have charts from the cache
    if (allChartsForSong.length > 0) {
      // Build score lookup from ALL user scores
      const scoreMap = new Map(
        globalScores
          .filter(s => s.musicdb?.song_id === song.songId)
          .map(s => [s.difficulty_name?.toUpperCase(), s])
      );
      
      // Merge: all charts + user scores for instant, complete modal data
      preloadedCharts = allChartsForSong
        .map(chart => {
          const userScore = scoreMap.get(chart.difficulty_name);
          return {
            id: chart.id,
            difficulty_name: chart.difficulty_name,
            difficulty_level: chart.difficulty_level,
            score: userScore?.score ?? null,
            rank: userScore?.rank ?? null,
            flare: userScore?.flare ?? null,
            halo: userScore?.halo ?? null,
            source_type: null,
          };
        })
        .sort((a, b) => {
          const aIndex = DIFFICULTY_ORDER.indexOf(a.difficulty_name);
          const bIndex = DIFFICULTY_ORDER.indexOf(b.difficulty_name);
          return aIndex - bIndex;
        });
    }
    
    setSelectedSong({
      songId: song.songId,
      songName: song.name,
      artist: song.artist,
      eamuseId: song.eamuseId,
      era: song.era,
      preloadedCharts,
    });
    setIsDetailModalOpen(true);
  }, [globalScores, musicDb]);

  const handleCloseModal = useCallback(() => {
    setIsDetailModalOpen(false);
  }, []);

  // Combined loading state for goals
  const isGoalDataLoading = scoresLoading || musicDbLoading;

  return (
    <div className="relative min-h-screen">
      {/* Rainbow background - fixed */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${rainbowBg})` }}
      />
      
      {/* Character image - fixed, positioned top-right */}
      <img
        src={characterImage}
        alt="Character"
        className="fixed top-0 right-0 w-[240px] h-auto object-contain pointer-events-none z-[5]"
      />
      
      {/* Fixed fade overlay at bottom - reveals rainbow background, syncs with nav */}
      <div 
        className={cn(
          "fixed bottom-0 left-0 right-0 h-[200px] pointer-events-none z-[15]",
          "transition-transform duration-300 ease-out",
          isVisible ? "translate-y-0" : "translate-y-[120px]"
        )}
        style={{ 
          backgroundImage: `url(${rainbowBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 100%)'
        }}
      />
      
      {/* Content overlay */}
      <div className="relative z-10 flex flex-col min-h-screen px-[28px]">
        {/* Header section */}
        <header className="pt-[75px] pb-4">
          {/* Avatar and greeting */}
          <div className="flex items-start gap-2 mb-4">
            <UserAvatar size={40} className="mt-1" linkToProfile />
          </div>
          
          {/* Two-line greeting */}
          <div className="mb-6">
            <span className="text-foreground text-2xl">Hi </span>
            <span className="text-white text-2xl font-bold text-shadow-greeting">
              {usernameLoading ? '...' : username}
            </span>
          </div>

          {/* Search bar */}
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </header>

        {/* Content section - shows search results OR goals */}
        <section className="flex flex-col gap-[3px] mt-[3px] pb-32">
          {isSearching ? (
            // Search results
            searchLoading ? (
              <>
                <Skeleton className="h-16 w-full rounded-[10px]" />
                <Skeleton className="h-16 w-full rounded-[10px]" />
                <Skeleton className="h-16 w-full rounded-[10px]" />
              </>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
                <img 
                  src={rinonFilter} 
                  alt="No results" 
                  className="w-[80px] h-auto object-contain mb-4 opacity-70"
                />
                <p className="text-foreground font-medium mb-1">No songs found</p>
                <p className="text-muted-foreground text-sm">Try a different search term</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground mb-2">
                  {searchResults.length} song{searchResults.length !== 1 ? 's' : ''} found
                </p>
                {searchResults.map((song, index) => (
                  <div
                    key={song.songId}
                    className="animate-stagger-fade-in"
                    style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
                  >
                    <SongSearchCard
                      songId={song.songId}
                      name={song.name}
                      artist={song.artist}
                      eamuseId={song.eamuseId}
                      onClick={() => handleSongClick(song)}
                    />
                  </div>
                ))}
              </div>
            )
          ) : (
            // Goals section (default view)
            goalsLoading ? (
              <>
                <Skeleton className="h-32 w-full rounded-[10px]" />
                <Skeleton className="h-32 w-full rounded-[10px]" />
              </>
            ) : goals.length === 0 ? (
              <GoalsEmptyState onCreateGoal={() => setCreateGoalOpen(true)} />
            ) : (
              goals.map((goal) => (
                <GoalCardWithProgress
                  key={goal.id}
                  goal={goal}
                  scores={globalScores}
                  allCharts={musicDb}
                  isLoading={isGoalDataLoading}
                  reverseTransformHalo={reverseTransformHalo}
                />
              ))
            )
          )}
        </section>
      </div>

      {/* Floating Create Button - hide when searching */}
      {!isSearching && (
        <Button
          onClick={() => setCreateGoalOpen(true)}
          size="icon"
          className="fixed bottom-[120px] right-[28px] z-20 h-14 w-14 rounded-full shadow-lg"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Create Goal Sheet */}
      <CreateGoalSheet open={createGoalOpen} onOpenChange={setCreateGoalOpen} />
      
      {/* Song Detail Modal */}
      <SongDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
        songId={selectedSong?.songId ?? null}
        songName={selectedSong?.songName ?? ''}
        artist={selectedSong?.artist ?? null}
        eamuseId={selectedSong?.eamuseId ?? null}
        era={selectedSong?.era ?? null}
        preloadedCharts={selectedSong?.preloadedCharts}
      />
    </div>
  );
}
