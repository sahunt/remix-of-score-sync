import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ScoresHeader } from '@/components/scores/ScoresHeader';
import { DifficultyGrid } from '@/components/scores/DifficultyGrid';
import { FiltersSection, type Filter } from '@/components/scores/FiltersSection';
import { StatsSummary } from '@/components/scores/StatsSummary';
import { SearchSortBar, type SortOption } from '@/components/scores/SearchSortBar';
import { SongCardPlaceholder } from '@/components/scores/SongCardPlaceholder';
import { Icon } from '@/components/ui/Icon';
import { Card, CardContent } from '@/components/ui/card';

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
  } | null;
}

export default function Scores() {
  const { user } = useAuth();
  const [scores, setScores] = useState<ScoreWithSong[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for filters and search
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');

  useEffect(() => {
    const fetchScores = async () => {
      if (!user) return;

      try {
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
              artist
            )
          `)
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false, nullsFirst: false })
          .limit(500);

        if (error) throw error;
        setScores(data ?? []);
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

    return [
      { label: 'Total', value: total },
      { label: 'MFC', value: mfc },
      { label: 'PFC', value: pfc },
      { label: 'AAA', value: aaa },
      { label: 'Clear', value: clear },
      { label: '', value: fail, isIcon: true, iconName: 'do_not_disturb_on_total_silence' },
    ];
  }, [scores, selectedLevel]);

  // Filter and sort scores for display
  const displayedScores = useMemo(() => {
    let result = [...scores];

    // Filter by difficulty level
    if (selectedLevel !== null) {
      result = result.filter(s => s.difficulty_level === selectedLevel);
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
  }, [scores, selectedLevel, searchQuery, sortBy]);

  const handleRemoveFilter = (id: string) => {
    setFilters(prev => prev.filter(f => f.id !== id));
  };

  const handleAddFilter = () => {
    // TODO: Open filter selection modal
    console.log('Add filter clicked');
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Rainbow header with back button, sync badge, username */}
      <ScoresHeader />

      {/* Main content area with dark background */}
      <div className="flex-1 bg-background rounded-t-[40px] -mt-6 relative z-10 px-[28px] py-6 space-y-6">
        {/* Difficulty rating grid */}
        <DifficultyGrid
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
        />

        {/* Filters section */}
        <FiltersSection
          filters={filters}
          onRemoveFilter={handleRemoveFilter}
          onAddFilter={handleAddFilter}
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
              <SongCardPlaceholder
                key={s.id}
                name={s.musicdb?.name ?? 'Unknown Song'}
                artist={s.musicdb?.artist ?? undefined}
                difficultyLevel={s.difficulty_level}
                score={s.score}
                halo={s.halo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
