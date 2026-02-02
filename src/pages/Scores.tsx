import { useState, useMemo, useCallback } from 'react';
import { use12MSMode } from '@/hooks/use12MSMode';
import { useScoresFilterState } from '@/hooks/useScoresFilterState';
import { useScores } from '@/contexts/ScoresContext';
import { useMusicDb, filterChartsByCriteria } from '@/hooks/useMusicDb';
import { matchesFilterRule } from '@/lib/filterMatcher';
import { assertCountIntegrity } from '@/lib/dataIntegrity';
import { ScoresHeader } from '@/components/scores/ScoresHeader';
import { DifficultyGrid } from '@/components/scores/DifficultyGrid';
import { FiltersSection, type ActiveFilter } from '@/components/scores/FiltersSection';
import { StatsSummary } from '@/components/scores/StatsSummary';
import { SearchSortBar } from '@/components/scores/SearchSortBar';
import { VirtualizedSongList } from '@/components/scores/VirtualizedSongList';
import { SongDetailModal } from '@/components/scores/SongDetailModal';
import { Icon } from '@/components/ui/Icon';
import { Card, CardContent } from '@/components/ui/card';
import { BackToTopButton } from '@/components/ui/BackToTopButton';
import rinonFilter from '@/assets/rinon-filter.png';
import type { SavedFilter } from '@/components/filters/filterTypes';
import type { 
  ScoreWithSong,
  DisplaySong, 
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

export default function Scores() {
  const { transformHaloLabel } = use12MSMode();
  
  // Use global scores cache - eliminates redundant fetching between pages
  const { scores: globalScores, isLoading: scoresLoading } = useScores();
  
  // Unified MusicDB cache for both chart lookups and "no play" songs
  const { data: musicDb } = useMusicDb();
  const allCharts = musicDb?.charts ?? [];
  const songChartsCache = musicDb?.bySongId;
  
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

  // Filter global scores to current view criteria
  const filteredScores = useMemo(() => {
    let result = [...globalScores];
    
    // Apply level filter
    if (selectedLevel !== null) {
      result = result.filter(s => s.difficulty_level === selectedLevel);
    } else if (levelsFromFilters.length > 0) {
      result = result.filter(s => 
        s.difficulty_level !== null && levelsFromFilters.includes(s.difficulty_level)
      );
    }
    
    return result;
  }, [globalScores, selectedLevel, levelsFromFilters]);

  const handleSongClick = useCallback((song: DisplaySong) => {
    if (!song.song_id) return;
    
    // Get ALL charts for this song from the pre-cached data
    const allChartsForSong = songChartsCache?.get(song.song_id) ?? [];
    
    let preloadedCharts: PreloadedChart[] | undefined;
    
    // Only preload if we have charts from the cache
    if (allChartsForSong.length > 0) {
      // Build score lookup from ALL user scores (not level-filtered)
      const scoreMap = new Map(
        globalScores
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
      preloadedCharts,
    });
    setIsDetailModalOpen(true);
  }, [globalScores, songChartsCache]);

  const handleCloseModal = useCallback(() => {
    setIsDetailModalOpen(false);
  }, []);

  // Determine if we should show scores
  const hasActiveFilters = activeFilters.length > 0;
  const hasSearchQuery = searchQuery.trim().length > 0;
  const shouldShowScores = selectedLevel !== null || levelsFromFilters.length > 0 || hasActiveFilters || hasSearchQuery;

  // Get musicdb charts for the current level from the cache
  const musicDbChartsForLevel = useMemo(() => {
    if (selectedLevel === null || allCharts.length === 0) return [];
    return filterChartsByCriteria(
      allCharts,
      { operator: 'is', value: [selectedLevel] },
      null
    );
  }, [allCharts, selectedLevel]);

  // Filter and sort scores for display, including "no play" songs
  const { displayedScores, noPlayCount } = useMemo((): { displayedScores: DisplaySong[], noPlayCount: number } => {
    // Convert user scores to DisplaySong format
    let playedSongs: DisplaySong[] = filteredScores.map(s => ({
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
            difficulty_name: song.difficulty_name,
            difficulty_level: song.difficulty_level,
            playstyle: 'SP',
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

    // Build set of played chart IDs (musicdb primary keys) - reliable ID-based matching
    const playedMusicDbIds = new Set(
      filteredScores.map(s => s.musicdb_id).filter((id): id is number => id != null)
    );

    // Add "no play" songs from musicdb (only when a level is selected and no active filters)
    let noPlaySongs: DisplaySong[] = [];
    if (selectedLevel !== null && musicDbChartsForLevel.length > 0 && activeFilters.length === 0) {
      noPlaySongs = musicDbChartsForLevel
        .filter(chart => !playedMusicDbIds.has(chart.id))
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
  }, [filteredScores, selectedLevel, activeFilters, searchQuery, sortBy, sortDirection, musicDbChartsForLevel]);

  // Calculate ALL stats client-side from the displayed scores
  // This ensures consistency - one source of truth
  const { stats, averageScore } = useMemo(() => {
    // Return empty stats if no level is selected
    if (!shouldShowScores) {
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
    
    // Calculate stats from played songs only
    const playedSongs = displayedScores.filter(s => !s.isNoPlay);

    const total = playedSongs.length;
    const mfc = playedSongs.filter(s => s.halo?.toLowerCase() === 'mfc').length;
    const pfc = playedSongs.filter(s => s.halo?.toLowerCase() === 'pfc').length;
    const aaa = playedSongs.filter(s => s.rank?.toUpperCase() === 'AAA').length;
    
    const clear = playedSongs.filter(s => {
      const halo = s.halo?.toLowerCase();
      const rank = s.rank?.toUpperCase();
      const isMfc = halo === 'mfc';
      const isPfc = halo === 'pfc';
      const isAaa = rank === 'AAA';
      const hasPassed = s.rank !== null;
      
      return hasPassed && !isMfc && !isPfc && !isAaa;
    }).length;
    
    const fail = playedSongs.filter(s => s.halo?.toLowerCase() === 'fail' || (s.rank === null && s.halo === null)).length;

    const playedWithScores = playedSongs.filter(s => s.score !== null);
    const avgScore = playedWithScores.length > 0
      ? Math.round(playedWithScores.reduce((sum, s) => sum + (s.score ?? 0), 0) / playedWithScores.length / 10) * 10
      : 0;

    // DEV-MODE: Assert data integrity when level is selected and no filters applied
    if (selectedLevel !== null && activeFilters.length === 0) {
      assertCountIntegrity(
        `Scores Page (Level ${selectedLevel})`,
        musicDbChartsForLevel.length,
        playedSongs.length,
        noPlayCount
      );
    }

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
  }, [displayedScores, selectedLevel, activeFilters, transformHaloLabel, shouldShowScores, noPlayCount, musicDbChartsForLevel]);

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
          scores={filteredScores}
        />

        {/* Stats summary */}
        <StatsSummary stats={stats} averageScore={averageScore} />

        {/* Search and sort bar */}
        <SearchSortBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={setSortOptions}
        />

        {/* Song list */}
        {!shouldShowScores ? (
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
        ) : scoresLoading ? (
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

      {/* Back to Top Button */}
      <BackToTopButton />
    </div>
  );
}
