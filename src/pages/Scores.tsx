import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { use12MSMode } from '@/hooks/use12MSMode';
import { supabase } from '@/integrations/supabase/client';
import { ScoresHeader } from '@/components/scores/ScoresHeader';
import { DifficultyGrid } from '@/components/scores/DifficultyGrid';
import { FiltersSection, type ActiveFilter } from '@/components/scores/FiltersSection';
import { StatsSummary } from '@/components/scores/StatsSummary';
import { SearchSortBar, type SortOption } from '@/components/scores/SearchSortBar';
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
  const compareNumericMulti = (actual: number | null, target: number | number[] | [number, number]): boolean => {
    if (actual === null) return false;
    
    // Range comparison for "is_between"
    if (operator === 'is_between' && Array.isArray(target) && target.length === 2) {
      const [min, max] = target as [number, number];
      return actual >= Math.min(min, max) && actual <= Math.max(min, max);
    }
    
    // Multi-select array
    if (Array.isArray(target)) {
      const matches = target.includes(actual);
      return operator === 'is' ? matches : !matches;
    }
    
    // Single value
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
  const [loading, setLoading] = useState(true);
  
  // State for filters and search
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  
  // Modal state
  const [selectedSong, setSelectedSong] = useState<SelectedSong | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleSongClick = useCallback((song: ScoreWithSong) => {
    if (!song.musicdb?.song_id) return;
    setSelectedSong({
      songId: song.musicdb.song_id,
      songName: song.musicdb.name ?? 'Unknown Song',
      artist: song.musicdb.artist,
      eamuseId: song.musicdb.eamuse_id,
    });
    setIsDetailModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsDetailModalOpen(false);
  }, []);

  useEffect(() => {
    const fetchScores = async () => {
      if (!user) return;

      try {
        // Fetch scores without the timestamp ordering issue
        // Using a higher limit to ensure we get all scores
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
          // IMPORTANT: Supabase defaults to 1000 rows if no limit specified!
          // Must set explicit high limit to fetch all scores (musicdb has 10k+ charts)
          .limit(100000);

        if (error) throw error;
        
        // Sort client-side by timestamp (recent first), with nulls last
        const sortedData = [...(data ?? [])].sort((a, b) => {
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

    fetchScores();
  }, [user]);

  // Calculate stats based on filtered scores
  const stats = useMemo(() => {
    let filteredForStats = scores;
    
    // Apply difficulty filter for stats
    if (selectedLevel !== null) {
      filteredForStats = filteredForStats.filter(s => s.difficulty_level === selectedLevel);
    }

    const total = filteredForStats.length;
    const mfc = filteredForStats.filter(s => s.halo?.toLowerCase() === 'mfc').length;
    const pfc = filteredForStats.filter(s => s.halo?.toLowerCase() === 'pfc').length;
    const aaa = filteredForStats.filter(s => s.rank?.toUpperCase() === 'AAA').length;
    const clear = filteredForStats.filter(s => 
      s.halo?.toLowerCase() === 'fc' || 
      s.halo?.toLowerCase() === 'gfc' ||
      s.rank !== null
    ).length;
    const fail = filteredForStats.filter(s => s.rank === null && s.halo === null).length;
    const noPlay = 0; // TODO: Calculate songs not played yet

    return [
      { label: 'Total', value: total },
      { label: transformHaloLabel('MFC') || 'MFC', value: mfc },
      { label: transformHaloLabel('PFC') || 'PFC', value: pfc },
      { label: 'AAA', value: aaa },
      { label: 'Clear', value: clear },
      { label: 'Fail', value: fail },
      { label: '', value: noPlay, isIcon: true, iconName: 'do_not_disturb_on_total_silence' },
    ];
  }, [scores, selectedLevel, transformHaloLabel]);

  // Filter and sort scores for display
  const displayedScores = useMemo(() => {
    let result = [...scores];

    // Filter by difficulty level
    if (selectedLevel !== null) {
      result = result.filter(s => s.difficulty_level === selectedLevel);
    }

    // Apply active filters
    if (activeFilters.length > 0) {
      result = result.filter(score => {
        // Each active filter must match (AND between filters)
        return activeFilters.every(af => {
          const filter = af.filter;
          // Apply match mode within each filter
          if (filter.matchMode === 'all') {
            return filter.rules.every(rule => matchesRule(score, rule));
          } else {
            return filter.rules.some(rule => matchesRule(score, rule));
          }
        });
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => {
        const name = s.musicdb?.name?.toLowerCase() ?? '';
        const artist = s.musicdb?.artist?.toLowerCase() ?? '';
        return name.includes(query) || artist.includes(query);
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.musicdb?.name ?? '').localeCompare(b.musicdb?.name ?? '');
        case 'difficulty':
          return (b.difficulty_level ?? 0) - (a.difficulty_level ?? 0);
        case 'score':
          return (b.score ?? 0) - (a.score ?? 0);
        case 'flare':
          return (b.flare ?? 0) - (a.flare ?? 0);
        case 'rank':
          const rankOrder: Record<string, number> = { 
            'AAA': 5, 'AA+': 4, 'AA': 3, 'AA-': 2, 'A+': 1, 'A': 0 
          };
          return (rankOrder[b.rank ?? ''] ?? -1) - (rankOrder[a.rank ?? ''] ?? -1);
        default:
          return 0;
      }
    });

    return result;
  }, [scores, selectedLevel, activeFilters, searchQuery, sortBy]);

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
          onSortChange={setSortBy}
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
                name={s.musicdb?.name ?? 'Unknown Song'}
                difficultyLevel={s.difficulty_level}
                score={s.score}
                rank={s.rank}
                flare={s.flare}
                halo={s.halo}
                eamuseId={s.musicdb?.eamuse_id}
                songId={s.musicdb?.song_id}
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
