import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FlareChip, type FlareType } from '@/components/ui/FlareChip';
import { HaloChip, type HaloType } from '@/components/ui/HaloChip';
import { SourceIcon } from '@/components/ui/SourceIcon';
import { use12MSMode } from '@/hooks/use12MSMode';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getJacketUrl, getJacketFallbackUrl } from '@/lib/jacketUrl';
import { cn } from '@/lib/utils';

export interface ChartWithScore {
  id: number;
  difficulty_name: string;
  difficulty_level: number;
  score: number | null;
  rank: string | null;
  flare: number | null;
  halo: string | null;
  source_type: string | null;
}

interface SongDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  songId: number | null;
  songName: string;
  artist: string | null;
  eamuseId: string | null;
  /** Pre-loaded chart data to avoid API calls when opening from Scores page */
  preloadedCharts?: ChartWithScore[];
}

// Difficulty order for display (highest to lowest)
const DIFFICULTY_ORDER = ['CHALLENGE', 'EXPERT', 'DIFFICULT', 'BASIC', 'BEGINNER'];

// Get difficulty color class based on difficulty name
function getDifficultyColorClass(difficultyName: string | null): string {
  if (!difficultyName) return 'bg-[hsl(var(--difficulty-basic))]';
  const normalized = difficultyName.toUpperCase();
  switch (normalized) {
    case 'BEGINNER': return 'bg-[hsl(var(--difficulty-beginner))]';
    case 'BASIC': return 'bg-[hsl(var(--difficulty-basic))]';
    case 'DIFFICULT': return 'bg-[hsl(var(--difficulty-difficult))]';
    case 'EXPERT': return 'bg-[hsl(var(--difficulty-expert))]';
    case 'CHALLENGE': return 'bg-[hsl(var(--difficulty-challenge))]';
    default: return 'bg-[hsl(var(--difficulty-basic))]';
  }
}

// Convert numeric flare to FlareType
function flareNumberToType(flare: number | null): FlareType | null {
  if (flare === null || flare === undefined) return null;
  const mapping: Record<number, FlareType> = {
    0: 'ex', 1: 'i', 2: 'ii', 3: 'iii', 4: 'iv',
    5: 'v', 6: 'vi', 7: 'vii', 8: 'viii', 9: 'ix', 10: 'ex'
  };
  return mapping[flare] ?? null;
}

// Normalize halo string to HaloType
function normalizeHaloType(halo: string | null): HaloType | null {
  if (!halo) return null;
  const normalized = halo.toLowerCase();
  const validTypes: HaloType[] = ['fc', 'gfc', 'life4', 'mfc', 'pfc'];
  if (validTypes.includes(normalized as HaloType)) {
    return normalized as HaloType;
  }
  return null;
}

export function SongDetailModal({
  isOpen,
  onClose,
  songId,
  songName,
  artist,
  eamuseId,
  preloadedCharts,
}: SongDetailModalProps) {
  const { user } = useAuth();
  const { transformHalo } = use12MSMode();
  const [charts, setCharts] = useState<ChartWithScore[]>([]);
  const [loading, setLoading] = useState(false);

  // Image fallback state
  const [imgError, setImgError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const primaryUrl = getJacketUrl(eamuseId, songId);
  const fallbackUrl = getJacketFallbackUrl(songId);
  const currentImgUrl = useFallback ? fallbackUrl : primaryUrl;
  const showPlaceholder = !currentImgUrl || imgError;

  const handleImageError = () => {
    if (!useFallback && fallbackUrl && fallbackUrl !== primaryUrl) {
      setUseFallback(true);
    } else {
      setImgError(true);
    }
  };

  // Reset image state when song changes
  useEffect(() => {
    setImgError(false);
    setUseFallback(false);
  }, [songId, eamuseId]);

  // Use preloaded data immediately, then MERGE missing unplayed difficulties (no flicker)
  useEffect(() => {
    if (!isOpen || !songId) {
      setCharts([]);
      setLoading(false);
      return;
    }

    // If we have preloaded data, show it immediately (no loading spinner)
    const hasPreloadedData = preloadedCharts && preloadedCharts.length > 0;
    if (hasPreloadedData) {
      setCharts(preloadedCharts);
      setLoading(false);
    }

    // Check if preloaded data is complete (has all 5 SP difficulties)
    const isComplete = hasPreloadedData && preloadedCharts.length >= 5;
    
    // Skip fetch if data is complete or no user
    if (isComplete || !user) {
      if (!hasPreloadedData) {
        setCharts([]);
        setLoading(false);
      }
      return;
    }

    // Fetch missing difficulties in background (NO spinner since we have preloaded data)
    if (!hasPreloadedData) {
      setLoading(true);
    }

    const fetchData = async () => {
      try {
        // Fetch all SP charts for this song (exclude deleted)
        const { data: chartData, error: chartError } = await supabase
          .from('musicdb')
          .select('id, difficulty_name, difficulty_level')
          .eq('song_id', songId)
          .eq('playstyle', 'SP')
          .eq('deleted', false)
          .not('difficulty_level', 'is', null)
          .order('difficulty_level', { ascending: false });

        if (chartError) throw chartError;
        if (!chartData || chartData.length === 0) {
          if (!hasPreloadedData) setCharts([]);
          return;
        }

        // Fetch user's scores for these charts
        const chartIds = chartData.map(c => c.id);
        const { data: scoreData, error: scoreError } = await supabase
          .from('user_scores')
          .select('musicdb_id, score, rank, flare, halo, source_type')
          .eq('user_id', user.id)
          .in('musicdb_id', chartIds);

        if (scoreError) throw scoreError;

        // Create a map of scores by musicdb_id
        const scoreMap = new Map(
          (scoreData || []).map(s => [s.musicdb_id, s])
        );

        // MERGE: Preserve preloaded data, only add NEW unplayed difficulties
        // This prevents flicker by keeping existing rows stable
        const existingDifficulties = new Set(
          (preloadedCharts ?? []).map(c => c.difficulty_name.toUpperCase())
        );

        const mergedCharts: ChartWithScore[] = [...(preloadedCharts ?? [])];
        
        // Add only charts that aren't already in preloaded data
        for (const chart of chartData) {
          const diffName = chart.difficulty_name?.toUpperCase() ?? 'UNKNOWN';
          if (!existingDifficulties.has(diffName)) {
            const userScore = scoreMap.get(chart.id);
            mergedCharts.push({
              id: chart.id,
              difficulty_name: diffName,
              difficulty_level: chart.difficulty_level ?? 0,
              score: userScore?.score ?? null,
              rank: userScore?.rank ?? null,
              flare: userScore?.flare ?? null,
              halo: userScore?.halo ?? null,
              source_type: userScore?.source_type ?? null,
            });
          }
        }
        
        // Sort by difficulty order (Challenge first, Beginner last)
        mergedCharts.sort((a, b) => {
          const aIndex = DIFFICULTY_ORDER.indexOf(a.difficulty_name.toUpperCase());
          const bIndex = DIFFICULTY_ORDER.indexOf(b.difficulty_name.toUpperCase());
          return aIndex - bIndex;
        });

        setCharts(mergedCharts);
      } catch (err) {
        console.error('Error fetching song details:', err);
        if (!hasPreloadedData) setCharts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, songId, user, preloadedCharts]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#3B3F51] border-none rounded-[20px] p-6 max-w-[340px] mx-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>{songName}</DialogTitle>
        </DialogHeader>

        {/* Song Header */}
        <div className="flex flex-col items-center text-center mb-6">
          {/* Jacket */}
          <div className="w-20 h-20 rounded-lg overflow-hidden mb-3 bg-muted flex items-center justify-center">
            {showPlaceholder ? (
              <span className="text-muted-foreground text-2xl">♪</span>
            ) : (
              <img
                src={currentImgUrl!}
                alt=""
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            )}
          </div>

          {/* Artist */}
          {artist && (
            <p className="text-[10px] font-medium text-[#96A7AF] uppercase tracking-[1px] leading-normal mb-1">
              {artist}
            </p>
          )}

          {/* Song Title */}
          <p className="text-base font-bold text-white leading-normal">
            {songName}
          </p>
        </div>

        {/* Difficulty Rows */}
        <div className="space-y-2 mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : charts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No SP charts available
            </p>
          ) : (
            charts.map((chart) => {
              const flareType = flareNumberToType(chart.flare);
              const transformedHalo = transformHalo(chart.halo);
              const haloType = normalizeHaloType(transformedHalo);
              const hasScore = chart.score !== null;

              return (
                <div
                  key={chart.id}
                  className="flex items-center gap-2 bg-[#262937] rounded-lg px-3 py-2"
                >
                  {/* Difficulty Chip */}
                  <div
                    className={cn(
                      'flex-shrink-0 w-[22px] h-[22px] rounded-[5px] flex items-center justify-center',
                      getDifficultyColorClass(chart.difficulty_name)
                    )}
                  >
                    <span className="text-[11px] font-bold text-[#000F33]">
                      {chart.difficulty_level}
                    </span>
                  </div>

                  {/* Score or No play */}
                  <div className="flex-1 min-w-0">
                    {hasScore ? (
                      <span className="text-sm font-bold text-white tabular-nums">
                        {chart.score!.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">No play</span>
                    )}
                  </div>

                  {/* Right side: rank, flare, halo, source */}
                  {hasScore && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {chart.rank && (
                        <span className="text-xs font-bold text-white">
                          {chart.rank}
                        </span>
                      )}
                      {flareType && <FlareChip type={flareType} className="h-4" />}
                      {haloType && <HaloChip type={haloType} className="h-3.5" />}
                      <SourceIcon source={chart.source_type} className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Close Button */}
        <Button
          onClick={onClose}
          className="w-full rounded-full"
          variant="default"
        >
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
