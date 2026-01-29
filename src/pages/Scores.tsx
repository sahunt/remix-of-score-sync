import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { use12MSMode } from '@/hooks/use12MSMode';
import { useScoresFilterState } from '@/hooks/useScoresFilterState';
import { supabase } from '@/integrations/supabase/client';
import { ScoresHeader } from '@/components/scores/ScoresHeader';
import { DifficultyGrid } from '@/components/scores/DifficultyGrid';
import { FiltersSection, type ActiveFilter } from '@/components/scores/FiltersSection';
import { StatsSummary } from '@/components/scores/StatsSummary';
import { SearchSortBar } from '@/components/scores/SearchSortBar';
import { SongCard } from '@/components/scores/SongCard';
import { SongDetailModal } from '@/components/scores/SongDetailModal';
import { Icon } from '@/components/ui/Icon';
import { Card, CardContent } from '@/components/ui/card';
import type { SavedFilter, FilterRule } from '@/components/filters/filterTypes';

interface ScoreWithSong {
  id: string;
  score: number | null;
  timestamp: string | null;
  playstyle: string | null;
  difficulty_name: string | null;
  difficulty_level: number | null;
  rank: string | null;
  flare: number | null;
  halo: string | null;
  musicdb: {
    name: string | null;
    artist: string | null;
    eamuse_id: string | null;
    song_id: number | null;
  } | null;
}

interface MusicDbChart {
  id: number;
  song_id: number;
  name: string | null;
  artist: string | null;
  eamuse_id: string | null;
  difficulty_name: string | null;
  difficulty_level: number | null;
  playstyle: string | null;
}

interface DisplaySong {
  id: string;
  score: number | null;
  rank: string | null;
  flare: number | null;
  halo: string | null;
  difficulty_level: number | null;
  difficulty_name: string | null;
  name: string | null;
  artist: string | null;
  eamuse_id: string | null;
  song_id: number | null;
  isNoPlay: boolean;
}

interface SelectedSong {
  songId: number;
  songName: string;
  artist: string | null;
  eamuseId: string | null;
}

// Filter matching logic
function matchesRule(score: ScoreWithSong, rule: FilterRule): boolean {
  const { type, operator, value } = rule;

  // Handle numeric comparisons (score only uses single values or ranges)
  const compareNumeric = (actual: number | null, target: number | [number, number]): boolean => {
    if (actual === null) return false;
    
    // Range comparison for "is_between"
    if (Array.isArray(target) && target.length === 2) {
      const [min, max] = target;
      return actual >= Math.min(min, max) && actual <= Math.max(min, max);
    }
    
    const singleTarget = typeof target === 'number' ? target : target[0];
    switch (operator) {
      case 'is': return actual === singleTarget;
      case 'is_not': return actual !== singleTarget;
      case 'less_than': return actual < singleTarget;
      case 'greater_than': return actual > singleTarget;
      default: return false;
    }
  };

  // Handle numeric multi-select (level, flare)
  // Special case: value 0 for flare means "no flare" (null in DB)
  const compareNumericMulti = (actual: number | null, target: number | number[] | [number, number]): boolean => {
    // Range comparison for "is_between"
    if (operator === 'is_between' && Array.isArray(target) && target.length === 2) {
      if (actual === null) return false;
      const [min, max] = target as [number, number];
      return actual >= Math.min(min, max) && actual <= Math.max(min, max);
    }
    
    // Multi-select array
    if (Array.isArray(target)) {
      // Check if "no flare" (0) is in the target array
      const includesNoFlare = target.includes(0);
      
      if (actual === null) {
        // null flare matches "no flare" (0) selection
        const matches = includesNoFlare;
        return operator === 'is' ? matches : !matches;
      }
      
      const matches = target.includes(actual);
      return operator === 'is' ? matches : !matches;
    }
    
    // Single value - treat 0 as "no flare"
    if (target === 0) {
      const matches = actual === null;
      return operator === 'is' ? matches : !matches;
    }
    
    if (actual === null) return false;
    
    switch (operator) {
      case 'is': return actual === target;
      case 'is_not': return actual !== target;
      case 'less_than': return actual < target;
      case 'greater_than': return actual > target;
      default: return false;
    }
  };

  // Handle string multi-select (grade, lamp, difficulty)
  const compareStringMulti = (actual: string | null, target: string | string[]): boolean => {
    if (actual === null) return false;
    const normalizedActual = actual.toLowerCase();
    
    // Multi-select array
    if (Array.isArray(target)) {
      const matches = target.some(t => normalizedActual === t.toLowerCase());
      return operator === 'is' ? matches : !matches;
    }
    
    // Single string value
    const normalizedTarget = target.toLowerCase();
    switch (operator) {
      case 'is': return normalizedActual === normalizedTarget;
      case 'is_not': return normalizedActual !== normalizedTarget;
      case 'contains': return normalizedActual.includes(normalizedTarget);
      default: return false;
    }
  };

  switch (type) {
    case 'score': return compareNumeric(score.score, value as number | [number, number]);
    case 'level': return compareNumericMulti(score.difficulty_level, value as number | number[] | [number, number]);
    case 'flare': return compareNumericMulti(score.flare, value as number | number[] | [number, number]);
    case 'grade': return compareStringMulti(score.rank, value as string | string[]);
    case 'lamp': return compareStringMulti(score.halo, value as string | string[]);
    case 'difficulty': return compareStringMulti(score.difficulty_name, value as string | string[]);
    case 'title': return compareStringMulti(score.musicdb?.name ?? '', value as string);
    case 'version':
    case 'era':
      return true; // Placeholder
    default:
      return true;
  }
}

export default function Scores() {
  const { user } = useAuth();
  const { transformHaloLabel } = use12MSMode();
  const [scores, setScores] = useState<ScoreWithSong[]>([]);
  const [musicDbCharts, setMusicDbCharts] = useState<MusicDbChart[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Persistent filter state
  const {
    selectedLevel,
    activeFilters,
    searchQuery,
    sortBy,
    sortDirection,
    levelsFromFilters,
    setSelectedLevel,
    setActiveFilters,
    setSearchQuery,
    setSortOptions,
  } = useScoresFilterState();
  
  // Modal state
  const [selectedSong, setSelectedSong] = useState<SelectedSong | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleSongClick = useCallback((song: DisplaySong) => {
    if (!song.song_id) return;
    setSelectedSong({
      songId: song.song_id,
      songName: song.name ?? 'Unknown Song',
      artist: song.artist,
      eamuseId: song.eamuse_id,
    });
    setIsDetailModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsDetailModalOpen(false);
  }, []);

  useEffect(() => {
    const fetchAllScores = async () => {
      if (!user) return;

      try {
        // Supabase limits responses to 1000 rows per request
        // Must paginate to fetch all scores (users can have 4500+ scores)
        const PAGE_SIZE = 1000;
        let allScores: ScoreWithSong[] = [];
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('user_scores')
            .select(`
              id,
              score,
              timestamp,
              playstyle,
              difficulty_name,
              difficulty_level,
              rank,
              flare,
              halo,
              musicdb (
                name,
                artist,
                eamuse_id,
                song_id
              )
            `)
            .eq('user_id', user.id)
            .range(from, from + PAGE_SIZE - 1);

          if (error) throw error;
          
          if (data && data.length > 0) {
            allScores = [...allScores, ...data];
            from += PAGE_SIZE;
            // If we got fewer than PAGE_SIZE, we've fetched everything
            hasMore = data.length === PAGE_SIZE;
          } else {
            hasMore = false;
          }
        }
        
        // Sort client-side by timestamp (recent first), with nulls last
        const sortedData = allScores.sort((a, b) => {
          if (!a.timestamp && !b.timestamp) return 0;
          if (!a.timestamp) return 1;
          if (!b.timestamp) return -1;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        
        setScores(sortedData);
      } catch (err) {
        console.error('Error fetching scores:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllScores();
  }, [user]);

  // Fetch musicdb charts for the current level (to show "no play" songs)
  const [musicDbTotal, setMusicDbTotal] = useState<number>(0);
  
  useEffect(() => {
    const fetchMusicDbCharts = async () => {
      // Only fetch when a level is selected (to avoid fetching all 10k+ charts)
      if (selectedLevel === null) {
        setMusicDbCharts([]);
        setMusicDbTotal(0);
        return;
      }
      
      try {
        const { data, count, error } = await supabase
          .from('musicdb')
          .select('id, song_id, name, artist, eamuse_id, difficulty_name, difficulty_level, playstyle', { count: 'exact' })
          .not('difficulty_level', 'is', null)
          .eq('playstyle', 'SP')
          .eq('difficulty_level', selectedLevel);
        
        if (error) throw error;
        setMusicDbCharts(data ?? []);
        setMusicDbTotal(count ?? 0);
      } catch (err) {
        console.error('Error fetching musicdb charts:', err);
      }
    };
    
    fetchMusicDbCharts();
  }, [selectedLevel]);

  // Calculate stats based on fully filtered scores (including active filters)
  const stats = useMemo(() => {
    // Use displayedScores which already has level + active filters applied
    // But we need to compute stats before search query is applied
    let filteredForStats = [...scores];
    
    // Apply difficulty filter
    if (selectedLevel !== null) {
      filteredForStats = filteredForStats.filter(s => s.difficulty_level === selectedLevel);
    }
    
    // Apply active filters (same logic as displayedScores)
    if (activeFilters.length > 0) {
      filteredForStats = filteredForStats.filter(score => {
        return activeFilters.every(af => {
          const filter = af.filter;
          if (filter.matchMode === 'all') {
            return filter.rules.every(rule => matchesRule(score, rule));
          } else {
            return filter.rules.some(rule => matchesRule(score, rule));
          }
        });
      });
    }

    const total = filteredForStats.length;
    const mfc = filteredForStats.filter(s => s.halo?.toLowerCase() === 'mfc').length;
    const pfc = filteredForStats.filter(s => s.halo?.toLowerCase() === 'pfc').length;
    const aaa = filteredForStats.filter(s => s.rank?.toUpperCase() === 'AAA').length;
    
    // Clear = passed songs that are NOT MFC, NOT PFC, and NOT AAA (the leftovers)
    const clear = filteredForStats.filter(s => {
      const halo = s.halo?.toLowerCase();
      const rank = s.rank?.toUpperCase();
      const isMfc = halo === 'mfc';
      const isPfc = halo === 'pfc';
      const isAaa = rank === 'AAA';
      const hasPassed = s.rank !== null; // Has a rank means passed
      
      return hasPassed && !isMfc && !isPfc && !isAaa;
    }).length;
    
    const fail = filteredForStats.filter(s => s.halo?.toLowerCase() === 'fail' || (s.rank === null && s.halo === null)).length;
    
    // No play is only meaningful when no active filters are applied
    // When filters are active, we're showing a subset so "no play" doesn't make sense
    const noPlay = activeFilters.length === 0 
      ? Math.max(0, musicDbTotal - total) 
      : 0;

    return [
      { label: 'Total', value: total },
      { label: transformHaloLabel('MFC') || 'MFC', value: mfc },
      { label: transformHaloLabel('PFC') || 'PFC', value: pfc },
      { label: 'AAA', value: aaa },
      { label: 'Clear', value: clear },
      { label: 'Fail', value: fail },
      { label: '', value: noPlay, isIcon: true, iconName: 'do_not_disturb_on_total_silence' },
    ];
  }, [scores, selectedLevel, activeFilters, transformHaloLabel, musicDbTotal]);

  // Filter and sort scores for display, including "no play" songs from musicdb
  const displayedScores = useMemo((): DisplaySong[] => {
    // Convert user scores to DisplaySong format
    let playedSongs: DisplaySong[] = scores.map(s => ({
      id: s.id,
      score: s.score,
      rank: s.rank,
      flare: s.flare,
      halo: s.halo,
      difficulty_level: s.difficulty_level,
      difficulty_name: s.difficulty_name,
      name: s.musicdb?.name ?? null,
      artist: s.musicdb?.artist ?? null,
      eamuse_id: s.musicdb?.eamuse_id ?? null,
      song_id: s.musicdb?.song_id ?? null,
      isNoPlay: false,
    }));

    // Filter by difficulty level
    if (selectedLevel !== null) {
      playedSongs = playedSongs.filter(s => s.difficulty_level === selectedLevel);
    }

    // Apply active filters to played songs
    if (activeFilters.length > 0) {
      playedSongs = playedSongs.filter(song => {
        // Convert DisplaySong back to ScoreWithSong format for matchesRule
        const scoreForMatching: ScoreWithSong = {
          id: song.id,
          score: song.score,
          timestamp: null,
          playstyle: 'SP',
          difficulty_name: song.difficulty_name,
          difficulty_level: song.difficulty_level,
          rank: song.rank,
          flare: song.flare,
          halo: song.halo,
          musicdb: {
            name: song.name,
            artist: song.artist,
            eamuse_id: song.eamuse_id,
            song_id: song.song_id,
          },
        };
        
        return activeFilters.every(af => {
          const filter = af.filter;
          if (filter.matchMode === 'all') {
            return filter.rules.every(rule => matchesRule(scoreForMatching, rule));
          } else {
            return filter.rules.some(rule => matchesRule(scoreForMatching, rule));
          }
        });
      });
    }

    // Build set of played chart keys to identify unplayed songs
    const playedChartKeys = new Set(
      playedSongs.map(s => `${s.song_id}|${s.difficulty_name}`)
    );

    // Add "no play" songs from musicdb (only when a level is selected)
    let noPlaySongs: DisplaySong[] = [];
    if (selectedLevel !== null && musicDbCharts.length > 0) {
      noPlaySongs = musicDbCharts
        .filter(chart => !playedChartKeys.has(`${chart.song_id}|${chart.difficulty_name}`))
        .map(chart => ({
          id: `noplay-${chart.id}`,
          score: null,
          rank: null,
          flare: null,
          halo: null,
          difficulty_level: chart.difficulty_level,
          difficulty_name: chart.difficulty_name,
          name: chart.name,
          artist: chart.artist,
          eamuse_id: chart.eamuse_id,
          song_id: chart.song_id,
          isNoPlay: true,
        }));
    }

    // Combine played and unplayed songs
    let result = [...playedSongs, ...noPlaySongs];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => {
        const name = s.name?.toLowerCase() ?? '';
        const artist = s.artist?.toLowerCase() ?? '';
        return name.includes(query) || artist.includes(query);
      });
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = (a.name ?? '').localeCompare(b.name ?? '');
          break;
        case 'difficulty':
          comparison = (a.difficulty_level ?? 0) - (b.difficulty_level ?? 0);
          break;
        case 'score':
          // No play songs (null score) should sort last for descending, first for ascending
          if (a.score === null && b.score === null) comparison = 0;
          else if (a.score === null) comparison = -1;
          else if (b.score === null) comparison = 1;
          else comparison = a.score - b.score;
          break;
        case 'flare':
          if (a.flare === null && b.flare === null) comparison = 0;
          else if (a.flare === null) comparison = -1;
          else if (b.flare === null) comparison = 1;
          else comparison = a.flare - b.flare;
          break;
        case 'rank':
          const rankOrder: Record<string, number> = { 
            'AAA': 5, 'AA+': 4, 'AA': 3, 'AA-': 2, 'A+': 1, 'A': 0 
          };
          const aRank = a.rank ? (rankOrder[a.rank] ?? -1) : -2;
          const bRank = b.rank ? (rankOrder[b.rank] ?? -1) : -2;
          comparison = aRank - bRank;
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [scores, selectedLevel, activeFilters, searchQuery, sortBy, sortDirection, musicDbCharts]);

  const handleRemoveFilter = useCallback((id: string) => {
    setActiveFilters(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleApplyFilters = useCallback((filters: SavedFilter[]) => {
    const newActiveFilters: ActiveFilter[] = filters.map(f => ({
      id: f.id,
      label: f.name,
      filter: f,
    }));
    setActiveFilters(newActiveFilters);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Rainbow header with back button, sync badge, username */}
      <ScoresHeader />

      {/* Main content area with dark background - overlaps header */}
      <div className="flex-1 bg-background rounded-t-[40px] -mt-10 relative z-10 px-[28px] pt-6 pb-6 space-y-6">
        {/* Difficulty rating grid */}
        <DifficultyGrid
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
          highlightedLevels={levelsFromFilters}
        />

        {/* Filters section */}
        <FiltersSection
          activeFilters={activeFilters}
          onRemoveFilter={handleRemoveFilter}
          onApplyFilters={handleApplyFilters}
          scores={scores}
        />

        {/* Stats summary */}
        <StatsSummary stats={stats} />

        {/* Search and sort bar */}
        <SearchSortBar
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={setSortOptions}
        />

        {/* Song list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : displayedScores.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Icon name="music_note" size={40} className="mb-3 text-muted-foreground" />
              <p className="font-medium">No scores found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedLevel
                  ? 'Try adjusting your filters'
                  : 'Upload a score file to get started'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {displayedScores.map((s) => (
              <SongCard
                key={s.id}
                name={s.name ?? 'Unknown Song'}
                difficultyLevel={s.difficulty_level}
                score={s.score}
                rank={s.rank}
                flare={s.flare}
                halo={s.halo}
                eamuseId={s.eamuse_id}
                songId={s.song_id}
                onClick={() => handleSongClick(s)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Song Detail Modal */}
      <SongDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
        songId={selectedSong?.songId ?? null}
        songName={selectedSong?.songName ?? ''}
        artist={selectedSong?.artist ?? null}
        eamuseId={selectedSong?.eamuseId ?? null}
      />
    </div>
  );
}
