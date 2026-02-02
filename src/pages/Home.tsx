import { useState, useCallback } from 'react';
import { useUsername } from '@/hooks/useUsername';
import { useSessionCharacter } from '@/hooks/useSessionCharacter';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useGoals } from '@/hooks/useGoals';
import { useServerGoalProgress } from '@/hooks/useServerGoalProgress';
import { use12MSMode } from '@/hooks/use12MSMode';
import { useSongCatalogSearch } from '@/hooks/useSongCatalogSearch';
import { useSongChartsCache } from '@/hooks/useSongChartsCache';
import { useScores } from '@/contexts/ScoresContext';
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
import type { FilterRule } from '@/components/filters/filterTypes';
import type { PreloadedChart } from '@/types/scores';

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

// Component to render a goal card with server-calculated progress
function GoalCardWithProgress({ goal }: { goal: Goal }) {
  // Use server-side RPC for progress calculation
  // This replaces both useMusicDbCount and useGoalProgress with a single query
  const { data: progress, isLoading } = useServerGoalProgress(
    goal.id,
    goal.criteria_rules as FilterRule[],
    goal.target_type as 'lamp' | 'grade' | 'flare' | 'score',
    goal.target_value,
    true
  );

  // For "count" mode, use goal_count as the denominator
  // For "all" mode, use server-calculated total
  const isAverageMode = goal.target_type === 'score' && goal.score_mode === 'average';
  
  const total = isAverageMode
    ? parseInt(goal.target_value, 10) // For average mode, total is the target average
    : goal.goal_mode === 'count' 
      ? (goal.goal_count ?? 0) 
      : (progress?.total ?? 0);

  const current = isAverageMode
    ? (progress?.averageScore ?? 0) // Use average from RPC
    : (progress?.completed ?? 0);

  return (
    <GoalCard
      id={goal.id}
      title={goal.name}
      targetType={goal.target_type as 'lamp' | 'grade' | 'flare' | 'score'}
      targetValue={goal.target_value}
      current={current}
      total={total}
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
  const [createGoalOpen, setCreateGoalOpen] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const { results: searchResults, isLoading: searchLoading } = useSongCatalogSearch(searchQuery);
  const isSearching = searchQuery.trim().length > 0;
  
  // Modal state
  const [selectedSong, setSelectedSong] = useState<SelectedSong | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Caches for modal preloading
  const { data: songChartsCache } = useSongChartsCache();
  const { scores: globalScores } = useScores();
  
  const handleSongClick = useCallback((song: { songId: number; name: string; artist: string | null; eamuseId: string | null }) => {
    // Get ALL charts for this song from the pre-cached data
    const allChartsForSong = songChartsCache?.get(song.songId) ?? [];
    
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
      era: null, // Not available in search results, modal will fetch if needed
      preloadedCharts,
    });
    setIsDetailModalOpen(true);
  }, [globalScores, songChartsCache]);

  const handleCloseModal = useCallback(() => {
    setIsDetailModalOpen(false);
  }, []);

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
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No songs found for "{searchQuery}"</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground mb-2">
                  {searchResults.length} song{searchResults.length !== 1 ? 's' : ''} found
                </p>
                {searchResults.map((song) => (
                  <SongSearchCard
                    key={song.songId}
                    songId={song.songId}
                    name={song.name}
                    artist={song.artist}
                    eamuseId={song.eamuseId}
                    onClick={() => handleSongClick(song)}
                  />
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
