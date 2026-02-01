import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGoal, useGoals } from '@/hooks/useGoals';
import { useGoalProgress } from '@/hooks/useGoalProgress';
import { useMusicDbCount } from '@/hooks/useMusicDbCount';
import { useUserScores } from '@/hooks/useUserScores';
import { useScores } from '@/contexts/ScoresContext';
import { useAllChartsCache, filterChartsByCriteria } from '@/hooks/useAllChartsCache';
import { useSongChartsCache } from '@/hooks/useSongChartsCache';
import { use12MSMode } from '@/hooks/use12MSMode';
import { GoalDetailHeader } from '@/components/goals/GoalDetailHeader';
import { GoalCard } from '@/components/home/GoalCard';
import { GoalSongTabs } from '@/components/goals/GoalSongTabs';
import { SongDetailModal } from '@/components/scores/SongDetailModal';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { FilterRule } from '@/components/filters/filterTypes';
import type { ScoreWithSong } from '@/hooks/useGoalProgress';
import type { PreloadedChart } from '@/types/scores';

// Difficulty order for display (highest to lowest)
const DIFFICULTY_ORDER = ['CHALLENGE', 'EXPERT', 'DIFFICULT', 'BASIC', 'BEGINNER'];

interface SelectedSong {
  songId: number;
  songName: string;
  artist: string | null;
  eamuseId: string | null;
  era: number | null;
  preloadedCharts?: PreloadedChart[];
}

export default function GoalDetail() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { deleteGoal } = useGoals();
  const { reverseTransformHalo } = use12MSMode();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Modal state
  const [selectedSong, setSelectedSong] = useState<SelectedSong | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch the goal
  const { data: goal, isLoading: goalLoading } = useGoal(goalId);

  // Extract criteria for queries
  const criteriaRules = (goal?.criteria_rules as FilterRule[]) ?? [];

  // Get total from musicdb based on goal criteria
  const { data: musicDbData } = useMusicDbCount(
    criteriaRules,
    goal?.criteria_match_mode ?? 'all',
    !!goal
  );
  const musicDbTotal = musicDbData?.total ?? 0;

  // Use shared hook for consistent score data - pass filter rules for DB-level optimization
  const { data: scores = [], isLoading: scoresLoading } = useUserScores({
    filterRules: criteriaRules,
    enabled: !!goal,
    queryKeySuffix: `goal-${goal?.id}`,
  });

  // Use the cached all-charts data instead of a separate query per goal
  // This eliminates redundant musicdb queries - the cache is shared across all goals
  const { data: allCharts = [] } = useAllChartsCache();
  
  // Use global scores cache for modal preloading (all difficulties for any song)
  const { scores: globalScores } = useScores();
  
  // Pre-cached all SP charts by song_id (for modal preloading)
  const { data: songChartsCache } = useSongChartsCache();
  // Extract rules for filtering
  const levelRule = criteriaRules.find(r => r.type === 'level');
  const difficultyRule = criteriaRules.find(r => r.type === 'difficulty');

  // Filter charts client-side from the cache
  const matchingCharts = useMemo(() => {
    if (!goal || allCharts.length === 0) return [];
    return filterChartsByCriteria(
      allCharts,
      levelRule ? { operator: levelRule.operator, value: levelRule.value as number[] | [number, number] } : null,
      difficultyRule ? { operator: difficultyRule.operator, value: difficultyRule.value as string[] } : null
    );
  }, [allCharts, goal, levelRule, difficultyRule]);

  // Create set of played chart IDs (musicdb.id) for quick lookup
  const playedChartIds = useMemo(() => 
    new Set(scores.map(s => s.musicdb_id).filter(Boolean)),
    [scores]
  );

  // Identify unplayed charts and convert to ScoreWithSong format
  const unplayedCharts: ScoreWithSong[] = useMemo(() => 
    matchingCharts
      .filter(chart => !playedChartIds.has(chart.id))
      .map(chart => ({
        id: `unplayed-${chart.id}`,
        score: null,
        rank: null,
        flare: null,
        halo: null,
        difficulty_level: chart.difficulty_level,
        difficulty_name: chart.difficulty_name,
        playstyle: chart.playstyle,
        name: chart.name,
        artist: chart.artist,
        eamuse_id: chart.eamuse_id,
        song_id: chart.song_id,
        isUnplayed: true,
      })),
    [matchingCharts, playedChartIds]
  );

  // Calculate progress with 12MS mode transformation
  const progress = useGoalProgress(goal ?? null, scores, [], scoresLoading, reverseTransformHalo);

  // Combine remaining songs with unplayed charts for the tabs
  const allRemainingSongs = useMemo(() => 
    [...progress.remainingSongs, ...unplayedCharts],
    [progress.remainingSongs, unplayedCharts]
  );

  // Handler for song card clicks - mirrors Scores.tsx handleSongClick
  const handleSongClick = useCallback((song: ScoreWithSong) => {
    const songId = song.musicdb?.song_id ?? song.song_id;
    if (!songId) return;
    
    // Get ALL charts for this song from the pre-cached data
    const allChartsForSong = songChartsCache?.get(songId) ?? [];
    
    let preloadedCharts: PreloadedChart[] | undefined;
    
    // Only preload if we have charts from the cache
    if (allChartsForSong.length > 0) {
      // Build score lookup from ALL user scores (not goal-filtered)
      const scoreMap = new Map(
        globalScores
          .filter(s => (s.musicdb?.song_id ?? s.song_id) === songId)
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
      songId,
      songName: song.musicdb?.name ?? song.name ?? 'Unknown Song',
      artist: song.musicdb?.artist ?? song.artist ?? null,
      eamuseId: song.musicdb?.eamuse_id ?? song.eamuse_id ?? null,
      era: song.musicdb?.era ?? null,
      preloadedCharts,
    });
    setIsDetailModalOpen(true);
  }, [globalScores, songChartsCache]);

  const handleBack = () => {
    navigate('/home');
  };

  const handleDelete = async () => {
    if (!goalId) return;
    
    setIsDeleting(true);
    try {
      await deleteGoal.mutateAsync(goalId);
      toast({
        title: 'Goal deleted',
        description: 'Your goal has been removed.',
      });
      navigate('/home');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete goal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (goalLoading) {
    return (
      <div className="relative min-h-screen bg-background">
        <div className="px-[28px] pt-[60px]">
          <GoalDetailHeader onBack={handleBack} onDelete={handleDelete} isDeleting={isDeleting} />
          <div className="mt-4 space-y-4">
            <Skeleton className="h-32 w-full rounded-[10px]" />
            <Skeleton className="h-10 w-full rounded-[10px]" />
            <Skeleton className="h-64 w-full rounded-[10px]" />
          </div>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="relative min-h-screen bg-background">
        <div className="px-[28px] pt-[60px]">
          <GoalDetailHeader onBack={handleBack} onDelete={handleDelete} isDeleting={isDeleting} />
          <div className="mt-8 text-center">
            <p className="text-muted-foreground">Goal not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="px-[28px] pt-[60px] pb-8">
          <GoalDetailHeader onBack={handleBack} onDelete={handleDelete} isDeleting={isDeleting} />
        
        {/* Goal Card */}
        <div className="mt-4">
          <GoalCard
            title={goal.name}
            targetType={goal.target_type as 'lamp' | 'grade' | 'flare' | 'score'}
            targetValue={goal.target_value}
            current={progress.current}
            total={goal.target_type === 'score' && goal.score_mode === 'average' 
              ? progress.total 
              : (musicDbTotal > 0 ? musicDbTotal : progress.total)}
            scoreMode={goal.score_mode as 'target' | 'average' | undefined}
            scoreFloor={goal.score_floor}
          />
        </div>

        {/* Tabs with song lists */}
        <div className="mt-6">
          <GoalSongTabs
            goal={goal}
            completedSongs={progress.completedSongs}
            remainingSongs={allRemainingSongs}
            isLoading={scoresLoading}
            onSongClick={handleSongClick}
          />
        </div>
      </div>

      {/* Song Detail Modal */}
      <SongDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
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
