import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGoal, useGoals } from '@/hooks/useGoals';
import { useGoalProgress } from '@/hooks/useGoalProgress';
import { useScores } from '@/contexts/ScoresContext';
import { useMusicDb, filterChartsByCriteria } from '@/hooks/useMusicDb';
import { use12MSMode } from '@/hooks/use12MSMode';
import { filterScoresByRules } from '@/lib/filterMatcher';
import { GoalDetailHeader } from '@/components/goals/GoalDetailHeader';
import { GoalCard } from '@/components/home/GoalCard';
import { GoalSongTabs } from '@/components/goals/GoalSongTabs';
import { SongDetailModal } from '@/components/scores/SongDetailModal';
import { CreateGoalSheet } from '@/components/goals/CreateGoalSheet';
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
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  
  // Modal state
  const [selectedSong, setSelectedSong] = useState<SelectedSong | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch the goal
  const { data: goal, isLoading: goalLoading } = useGoal(goalId);

  // Extract criteria for filtering
  const criteriaRules = (goal?.criteria_rules as FilterRule[]) ?? [];

  // Use unified musicdb cache
  const { data: musicDb } = useMusicDb();
  const allCharts = musicDb?.charts ?? [];
  const songChartsCache = musicDb?.bySongId;

  // Use global scores cache - single source of truth
  const { scores: globalScores, isLoading: scoresLoading } = useScores();

  // Filter scores to match goal criteria
  const matchingScores = useMemo(() => {
    if (!goal) return [];
    return filterScoresByRules(
      globalScores,
      criteriaRules,
      goal.criteria_match_mode as 'all' | 'any'
    );
  }, [globalScores, goal, criteriaRules]);

  // Extract rules for filtering charts
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

  // Total count from musicdb
  const musicDbTotal = matchingCharts.length;

  // Create set of played chart IDs (musicdb.id) for quick lookup
  const playedChartIds = useMemo(() => 
    new Set(matchingScores.map(s => s.musicdb_id).filter(Boolean)),
    [matchingScores]
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
        era: chart.era,
        isUnplayed: true,
      })),
    [matchingCharts, playedChartIds]
  );

  // Calculate progress with 12MS mode transformation
  const progress = useGoalProgress(goal ?? null, matchingScores, [], scoresLoading, reverseTransformHalo);

  // Combine remaining songs with unplayed charts for the tabs
  const allRemainingSongs = useMemo(() => 
    [...progress.remainingSongs, ...unplayedCharts],
    [progress.remainingSongs, unplayedCharts]
  );

  // Handler for song card clicks
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
          <GoalDetailHeader onBack={handleBack} onEdit={() => setIsEditSheetOpen(true)} onDelete={handleDelete} isDeleting={isDeleting} />
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
          <GoalDetailHeader onBack={handleBack} onEdit={() => setIsEditSheetOpen(true)} onDelete={handleDelete} isDeleting={isDeleting} />
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
          <GoalDetailHeader onBack={handleBack} onEdit={() => setIsEditSheetOpen(true)} onDelete={handleDelete} isDeleting={isDeleting} />
        
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

      {/* Edit Goal Sheet */}
      <CreateGoalSheet
        open={isEditSheetOpen}
        onOpenChange={setIsEditSheetOpen}
        editingGoal={goal}
      />
    </div>
  );
}
