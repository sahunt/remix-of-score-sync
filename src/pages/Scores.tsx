import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

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

function getDifficultyClass(difficulty: string | null): string {
  if (!difficulty) return '';
  const lower = difficulty.toLowerCase();
  if (lower === 'beginner') return 'difficulty-beginner';
  if (lower === 'basic') return 'difficulty-basic';
  if (lower === 'difficult') return 'difficulty-difficult';
  if (lower === 'expert') return 'difficulty-expert';
  if (lower === 'challenge') return 'difficulty-challenge';
  return '';
}

export default function Scores() {
  const { user } = useAuth();
  const [scores, setScores] = useState<ScoreWithSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
          .limit(100);

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

  const filteredScores = scores.filter((s) => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    const name = s.musicdb?.name?.toLowerCase() ?? '';
    const artist = s.musicdb?.artist?.toLowerCase() ?? '';
    return name.includes(searchLower) || artist.includes(searchLower);
  });

  return (
    <div className="flex flex-col">
      <PageHeader title="Scores" description="Your imported score records" />

      <div className="mx-auto w-full max-w-2xl p-4">
        {/* Search */}
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search by song or artist..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            iconLeft="search"
          />
        </div>

        {/* Scores list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredScores.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Icon name="music_note" size={40} className="mb-3 text-muted-foreground" />
              <p className="font-medium">No scores found</p>
              <p className="text-sm text-muted-foreground">
                {search ? 'Try a different search term' : 'Upload a score file to get started'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredScores.map((s) => (
              <Card key={s.id} className="overflow-hidden transition-colors hover:bg-secondary/20">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {s.musicdb?.name ?? 'Unknown Song'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {s.musicdb?.artist ?? 'Unknown Artist'}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {s.playstyle && (
                          <Badge variant="outline" className="text-xs">
                            {s.playstyle}
                          </Badge>
                        )}
                        {s.difficulty_name && (
                          <Badge
                            variant="secondary"
                            className={cn('text-xs', getDifficultyClass(s.difficulty_name))}
                          >
                            {s.difficulty_name}
                            {s.difficulty_level !== null && ` ${s.difficulty_level}`}
                          </Badge>
                        )}
                        {s.rank && (
                          <Badge variant="outline" className="text-xs font-bold">
                            {s.rank}
                          </Badge>
                        )}
                        {s.halo && (
                          <Badge variant="secondary" className="text-xs">
                            {s.halo}
                          </Badge>
                        )}
                        {s.flare !== null && s.flare > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            🔥 {s.flare}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-primary tabular-nums">
                        {s.score?.toLocaleString() ?? '—'}
                      </p>
                      {s.timestamp && (
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(s.timestamp), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
