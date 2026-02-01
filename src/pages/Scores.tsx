import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { use12MSMode } from '@/hooks/use12MSMode';
import { useScoresFilterState } from '@/hooks/useScoresFilterState';
import { useUserStats } from '@/hooks/useUserStats';
import { useSongChartsCache } from '@/hooks/useSongChartsCache';
import { supabase } from '@/integrations/supabase/client';
import { matchesFilterRule } from '@/lib/filterMatcher';
import { ScoresHeader } from '@/components/scores/ScoresHeader';
import { DifficultyGrid } from '@/components/scores/DifficultyGrid';
import { FiltersSection, type ActiveFilter } from '@/components/scores/FiltersSection';
import { StatsSummary } from '@/components/scores/StatsSummary';
import { SearchSortBar } from '@/components/scores/SearchSortBar';
import { VirtualizedSongList } from '@/components/scores/VirtualizedSongList';
import { SongDetailModal } from '@/components/scores/SongDetailModal';
import { Icon } from '@/components/ui/Icon';
import { Card, CardContent } from '@/components/ui/card';
import rinonFilter from '@/assets/rinon-filter.png';
import type { SavedFilter } from '@/components/filters/filterTypes';
import type { 
  ScoreWithSong,
  DisplaySong, 
  MusicDbChart, 
  PreloadedChart 
} from '@/types/scores';

// Difficulty order for display (highest to lowest) - shared with SongDetailModal
const DIFFICULTY_ORDER = ['CHALLENGE', 'EXPERT', 'DIFFICULT', 'BASIC', 'BEGINNER'];

interface SelectedSong {
  songId: number;
  songName: string;
  artist: string | null;
  eamuseId: string | null;
  era: number | null;
  preloadedCharts?: PreloadedChart[];
}

// matchesRule is now imported from @/lib/filterMatcher as matchesFilterRule

export default function Scores() {
  const { user } = useAuth();
  const { transformHaloLabel } = use12MSMode();
  // Removed: globalScores from useScores() - now using local scores state for modal preloading
  const { data: songChartsCache } = useSongChartsCache(); // Pre-cached all SP charts by song_id
  const [scores, setScores] = useState<ScoreWithSong[]>([]);
  const [musicDbCharts, setMusicDbCharts] = useState<MusicDbChart[]>([]);
  const [loading, setLoading] = useState(false); // Start as false - no initial load
  
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
    
    // Get ALL charts for this song from the pre-cached data
    const allChartsForSong = songChartsCache?.get(song.song_id) ?? [];
    
    let preloadedCharts: PreloadedChart[] | undefined;
    
    // Only preload if we have charts from the cache
    // Otherwise let modal fetch directly (handles edge cases like deleted songs)
    if (allChartsForSong.length > 0) {
      // Build score lookup from LOCAL scores state (matches what's displayed in the list)
      const scoreMap = new Map(
        scores
          .filter(s => s.musicdb?.song_id === song.song_id)
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
            source_type: userScore?.source_type ?? null,
          };
        })
        .sort((a, b) => {
          const aIndex = DIFFICULTY_ORDER.indexOf(a.difficulty_name);
          const bIndex = DIFFICULTY_ORDER.indexOf(b.difficulty_name);
          return aIndex - bIndex;
        });
    }
    
    setSelectedSong({
      songId: song.song_id,
      songName: song.name ?? 'Unknown Song',
      artist: song.artist,
      eamuseId: song.eamuse_id,
      era: song.era ?? null,
      preloadedCharts, // undefined triggers modal fetch for edge cases
    });
    setIsDetailModalOpen(true);
  }, [scores, songChartsCache]);

  const handleCloseModal = useCallback(() => {
    setIsDetailModalOpen(false);
  }, []);

  // Determine if we should fetch scores:
  // - Level selected, OR
  // - Has active filters with level rules, OR  
  // - Has any active filter (show all matching scores across all levels), OR
  // - Has a search query (search across all scores)
  const hasActiveFilters = activeFilters.length > 0;
  const hasSearchQuery = searchQuery.trim().length > 0;
  const shouldFetchScores = selectedLevel !== null || levelsFromFilters.length > 0 || hasActiveFilters || hasSearchQuery;
  
  // Compute the levels to fetch - either the selected level, levels from filters, or null (all levels)
  const levelsToFetch = selectedLevel !== null 
    ? [selectedLevel] 
    : levelsFromFilters.length > 0
      ? levelsFromFilters
      : []; // Empty means fetch all levels when hasActiveFilters is true

  useEffect(() => {
    const fetchScoresForLevels = async () => {
      if (!user || !shouldFetchScores) {
        setScores([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      
      try {
        // Build query with level filter for better performance
        let query = supabase
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
            source_type,
            musicdb (
              name,
              artist,
              eamuse_id,
              song_id,
              name_romanized,
              era,
              deleted
            )
          `)
          .eq('user_id', user.id)
          .eq('playstyle', 'SP');
        
        // Filter by levels if we have specific levels to fetch
        // If levelsToFetch is empty but we're fetching (hasActiveFilters), fetch all levels
        if (levelsToFetch.length === 1) {
          query = query.eq('difficulty_level', levelsToFetch[0]);
        } else if (levelsToFetch.length > 1) {
          query = query.in('difficulty_level', levelsToFetch);
        }
        // else: no level filter, fetch all levels (for filter-only queries)
        
        // Paginate to handle large result sets
        const PAGE_SIZE = 1000;
        let allScores: ScoreWithSong[] = [];
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

          if (error) throw error;
          
          if (data && data.length > 0) {
            allScores = [...allScores, ...data];
            from += PAGE_SIZE;
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
        
        // Filter out scores for deleted songs (matches useSongChartsCache behavior)
        const validScores = sortedData.filter(s => 
          s.musicdb !== null && s.musicdb.deleted !== true
        );
        
        setScores(validScores);
      } catch (err) {
        console.error('Error fetching scores:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchScoresForLevels();
  }, [user, shouldFetchScores, selectedLevel, levelsFromFilters.join(','), hasActiveFilters]); // Join array for stable dependency

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
          .select('id, song_id, name, artist, eamuse_id, difficulty_name, difficulty_level, playstyle, name_romanized, era', { count: 'exact' })
          .not('difficulty_level', 'is', null)
          .eq('playstyle', 'SP')
          .eq('deleted', false)
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

  // Filter and sort scores for display, including "no play" songs from musicdb
  // Moved above stats calculation so we can use noPlaySongs.length for accurate count
  const { displayedScores, noPlayCount } = useMemo((): { displayedScores: DisplaySong[], noPlayCount: number } => {
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
      name_romanized: s.musicdb?.name_romanized ?? null,
      era: s.musicdb?.era ?? null,
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
          source_type: null,
          musicdb: {
            name: song.name,
            artist: song.artist,
            eamuse_id: song.eamuse_id,
            song_id: song.song_id,
            name_romanized: song.name_romanized,
            era: song.era,
          },
        };
        
        return activeFilters.every(af => {
          const filter = af.filter;
          if (filter.matchMode === 'all') {
            return filter.rules.every(rule => matchesFilterRule(scoreForMatching, rule));
          } else {
            return filter.rules.some(rule => matchesFilterRule(scoreForMatching, rule));
          }
        });
      });
    }

    // Build set of played chart keys to identify unplayed songs
    const playedChartKeys = new Set(
      playedSongs.map(s => `${s.song_id}|${s.difficulty_name}`)
    );

    // Add "no play" songs from musicdb (only when a level is selected and no active filters)
    let noPlaySongs: DisplaySong[] = [];
    if (selectedLevel !== null && musicDbCharts.length > 0 && activeFilters.length === 0) {
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
          name_romanized: chart.name_romanized,
          era: chart.era,
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
        const nameRomanized = s.name_romanized?.toLowerCase() ?? '';
        return name.includes(query) || artist.includes(query) || nameRomanized.includes(query);
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

    return { displayedScores: result, noPlayCount: noPlaySongs.length };
  }, [scores, selectedLevel, activeFilters, searchQuery, sortBy, sortDirection, musicDbCharts]);

  // Server-side stats from get_user_stats RPC - only fetch when a single level is selected
  // This optimizes the common case of viewing a specific level's stats
  const { data: serverStats, isLoading: statsLoading } = useUserStats(
    selectedLevel !== null && activeFilters.length === 0 ? selectedLevel : null
  );

  // Calculate stats - use server-side when available, fall back to client-side for filtered views
  const { stats, averageScore } = useMemo(() => {
    // Return empty stats if no level is selected
    if (!shouldFetchScores) {
      return {
        stats: [
          { label: 'Total', value: 0 },
          { label: transformHaloLabel('MFC') || 'MFC', value: 0 },
          { label: transformHaloLabel('PFC') || 'PFC', value: 0 },
          { label: 'AAA', value: 0 },
          { label: 'Clear', value: 0 },
          { label: 'Fail', value: 0 },
          { label: '', value: 0, isIcon: true, iconName: 'do_not_disturb_on_total_silence' },
        ],
        averageScore: 0,
      };
    }
    
    // Use server-side stats when available (single level, no filters)
    if (serverStats && selectedLevel !== null && activeFilters.length === 0) {
      // Calculate "Clear" as total minus MFC, PFC, AAA, and Fail
      // This matches the existing UI logic where Clear = songs that passed but aren't top achievements
      const clearCount = serverStats.total_count - serverStats.mfc_count - serverStats.pfc_count - serverStats.aaa_count - serverStats.fail_count;
      
      return {
        stats: [
          { label: 'Total', value: serverStats.total_count },
          { label: transformHaloLabel('MFC') || 'MFC', value: serverStats.mfc_count },
          { label: transformHaloLabel('PFC') || 'PFC', value: serverStats.pfc_count },
          { label: 'AAA', value: serverStats.aaa_count },
          { label: 'Clear', value: Math.max(0, clearCount) },
          { label: 'Fail', value: serverStats.fail_count },
          { label: '', value: noPlayCount, isIcon: true, iconName: 'do_not_disturb_on_total_silence' },
        ],
        averageScore: serverStats.avg_score,
      };
    }
    
    // Fall back to client-side calculation when filters are active
    // OPTIMIZATION: Use displayedScores instead of re-filtering the scores array
    // displayedScores already has all filters applied, so we just need to exclude noPlay songs
    const playedSongs = displayedScores.filter(s => !s.isNoPlay);

    const total = playedSongs.length;
    const mfc = playedSongs.filter(s => s.halo?.toLowerCase() === 'mfc').length;
    const pfc = playedSongs.filter(s => s.halo?.toLowerCase() === 'pfc').length;
    const aaa = playedSongs.filter(s => s.rank?.toUpperCase() === 'AAA').length;
    
    // Clear = passed songs that are NOT MFC, NOT PFC, and NOT AAA (the leftovers)
    const clear = playedSongs.filter(s => {
      const halo = s.halo?.toLowerCase();
      const rank = s.rank?.toUpperCase();
      const isMfc = halo === 'mfc';
      const isPfc = halo === 'pfc';
      const isAaa = rank === 'AAA';
      const hasPassed = s.rank !== null; // Has a rank means passed
      
      return hasPassed && !isMfc && !isPfc && !isAaa;
    }).length;
    
    const fail = playedSongs.filter(s => s.halo?.toLowerCase() === 'fail' || (s.rank === null && s.halo === null)).length;

    // Calculate average score (only for played songs with non-null score)
    // DDR scores are always multiples of 10, so round to nearest 10
    const playedWithScores = playedSongs.filter(s => s.score !== null);
    const avgScore = playedWithScores.length > 0
      ? Math.round(playedWithScores.reduce((sum, s) => sum + (s.score ?? 0), 0) / playedWithScores.length / 10) * 10
      : 0;

    return {
      stats: [
        { label: 'Total', value: total },
        { label: transformHaloLabel('MFC') || 'MFC', value: mfc },
        { label: transformHaloLabel('PFC') || 'PFC', value: pfc },
        { label: 'AAA', value: aaa },
        { label: 'Clear', value: clear },
        { label: 'Fail', value: fail },
        { label: '', value: noPlayCount, isIcon: true, iconName: 'do_not_disturb_on_total_silence' },
      ],
      averageScore: avgScore,
    };
  }, [displayedScores, selectedLevel, activeFilters, transformHaloLabel, shouldFetchScores, noPlayCount, serverStats]);


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
        <StatsSummary stats={stats} averageScore={averageScore} />

        {/* Search and sort bar */}
        <SearchSortBar
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={setSortOptions}
        />

        {/* Song list */}
        {!shouldFetchScores ? (
          <Card className="card-base border-none">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center !p-6">
              <img 
                src={rinonFilter} 
                alt="Rinon character" 
                className="w-[100px] h-auto object-contain mb-6 mx-auto"
              />
              <h2 className="text-foreground text-xl font-bold mb-2 w-full text-center">Choose a filter</h2>
              <p className="text-muted-foreground text-base w-full text-center">
                Let's see those scores
              </p>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : displayedScores.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Icon name="music_note" size={40} className="mb-3 text-muted-foreground" />
              <p className="font-medium">No scores found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'No scores at this level yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <VirtualizedSongList 
            songs={displayedScores} 
            onSongClick={handleSongClick} 
          />
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
        era={selectedSong?.era ?? null}
        preloadedCharts={selectedSong?.preloadedCharts}
      />
    </div>
  );
}
