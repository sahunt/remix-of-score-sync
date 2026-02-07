import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Minimize2, RefreshCw } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import ediWordmark from '@/assets/edi-wordmark.svg';
import { ChatMessage } from '@/components/edi/ChatMessage';
import { ChatInput } from '@/components/edi/ChatInput';
import { QuickPrompts } from '@/components/edi/QuickPrompts';
import { WelcomeMessage } from '@/components/edi/WelcomeMessage';
import { SongDetailModal, type ChartWithScore } from '@/components/scores/SongDetailModal';
import { useEdiChat } from '@/hooks/useEdiChat';
import { useScores } from '@/contexts/ScoresContext';
import { useMusicDb } from '@/hooks/useMusicDb';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseFollowUps } from '@/lib/parseFollowUps';

interface EdiProps {
  onMinimize: () => void;
}

interface SelectedSong {
  song_id: number;
  title: string;
  difficulty: string;
  level: number;
  eamuse_id: string | null;
}

// Difficulty order for modal display
const DIFFICULTY_ORDER = ['CHALLENGE', 'EXPERT', 'DIFFICULT', 'BASIC', 'BEGINNER'];

export default function Edi({ onMinimize }: EdiProps) {
  const { messages, isLoading, error, sendMessage, clearMessages } = useEdiChat();
  const { scores, isLoading: scoresLoading } = useScores();
  const { data: musicDbData } = useMusicDb();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedSong, setSelectedSong] = useState<SelectedSong | null>(null);

  // Check if chart analysis data is loaded
  const { data: chartCount, refetch: refetchChartCount } = useQuery({
    queryKey: ['chart-analysis-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('chart_analysis')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    staleTime: Infinity,
  });

  const hasChartData = (chartCount || 0) > 0;

  // Auto-import chart analysis data if not loaded
  useEffect(() => {
    const importData = async () => {
      if (chartCount === 0 && !isImporting) {
        setIsImporting(true);
        try {
          const csvResponse = await fetch('/chart_analysis.csv');
          if (!csvResponse.ok) throw new Error('Failed to fetch CSV');
          const csvContent = await csvResponse.text();

          const { error } = await supabase.functions.invoke('import-chart-analysis', {
            body: { csvContent },
          });

          if (error) throw error;
          refetchChartCount();
        } catch (err) {
          console.error('Import error:', err);
          toast.error('Failed to load chart data');
        } finally {
          setIsImporting(false);
        }
      }
    };

    if (chartCount === 0) {
      importData();
    }
  }, [chartCount, isImporting, refetchChartCount]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build score lookup map for efficient access
  const scoreMap = useMemo(() => {
    const map = new Map<string, {
      score: number | null;
      rank: string | null;
      flare: number | null;
      halo: string | null;
    }>();
    
    for (const score of scores) {
      if (!score.musicdb) continue;
      const key = `${score.musicdb.song_id}_${score.musicdb.difficulty_name?.toUpperCase()}`;
      const existing = map.get(key);
      if (!existing || (score.score && (!existing.score || score.score > existing.score))) {
        map.set(key, {
          score: score.score ?? null,
          rank: score.rank ?? null,
          flare: score.flare ?? null,
          halo: score.halo ?? null,
        });
      }
    }
    
    return map;
  }, [scores]);

  const getUserScore = useCallback((songId: number, difficultyName: string) => {
    const key = `${songId}_${difficultyName.toUpperCase()}`;
    return scoreMap.get(key) ?? null;
  }, [scoreMap]);

  const getSongData = useCallback((songId: number, difficultyName: string) => {
    if (!musicDbData) return null;
    const normalizedDifficulty = difficultyName.toUpperCase();
    const chart = musicDbData.charts.find(
      c => c.song_id === songId && c.difficulty_name?.toUpperCase() === normalizedDifficulty
    );
    if (!chart) return null;

    let eamuseId = chart.eamuse_id;
    if (!eamuseId) {
      const chartWithEamuseId = musicDbData.charts.find(c => c.song_id === songId && c.eamuse_id);
      if (chartWithEamuseId) eamuseId = chartWithEamuseId.eamuse_id;
    }

    return {
      title: chart.name ?? 'Unknown',
      level: chart.difficulty_level ?? 0,
      eamuse_id: eamuseId,
    };
  }, [musicDbData]);

  const handleSongClick = useCallback((song: SelectedSong) => {
    setSelectedSong(song);
  }, []);

  const preloadedCharts = useMemo((): ChartWithScore[] | undefined => {
    if (!selectedSong || !musicDbData) return undefined;
    const songCharts = musicDbData.bySongId.get(selectedSong.song_id);
    if (!songCharts) return undefined;

    return songCharts
      .map(chart => {
        const key = `${selectedSong.song_id}_${chart.difficulty_name.toUpperCase()}`;
        const userScore = scoreMap.get(key);
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
        const aIndex = DIFFICULTY_ORDER.indexOf(a.difficulty_name.toUpperCase());
        const bIndex = DIFFICULTY_ORDER.indexOf(b.difficulty_name.toUpperCase());
        return aIndex - bIndex;
      });
  }, [selectedSong, musicDbData, scoreMap]);

  const selectedSongArtist = useMemo(() => {
    if (!selectedSong || !musicDbData) return null;
    const chart = musicDbData.charts.find(c => c.song_id === selectedSong.song_id);
    return chart?.artist ?? null;
  }, [selectedSong, musicDbData]);

  const selectedSongEra = useMemo(() => {
    if (!selectedSong || !musicDbData) return null;
    const chart = musicDbData.charts.find(c => c.song_id === selectedSong.song_id);
    return chart?.era ?? null;
  }, [selectedSong, musicDbData]);

  const hasMessages = messages.length > 0;
  const showQuickPrompts = !hasMessages && !isLoading;
  const hasEnoughData = scores.length >= 10;
  const level12PlusCount = scores.filter(s => s.musicdb?.difficulty_level && s.musicdb.difficulty_level >= 12).length;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <button
          onClick={onMinimize}
          className="p-2 -ml-2 rounded-full hover:bg-secondary active:scale-95 transition-all"
          aria-label="Minimize"
        >
          <Minimize2 size={22} />
        </button>
        <img src={ediWordmark} alt="Edi" className="h-6" />
        {hasMessages && (
          <button
            onClick={clearMessages}
            className="p-2 -mr-2 rounded-full hover:bg-secondary active:scale-95 transition-all"
          >
            <RefreshCw size={20} />
          </button>
        )}
        {!hasMessages && <div className="w-10" />}
      </header>

      {/* Chat Area - scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col gap-4 py-4 pb-4">
          {!hasChartData && !hasMessages && (
            <div className="mx-4 p-3 rounded-xl bg-secondary border border-border">
              <p className="text-sm text-muted-foreground">
                <Icon name="hourglass_empty" size={16} className="inline mr-1.5 -mt-0.5 animate-spin" />
                Loading chart data for personalized recommendations...
              </p>
            </div>
          )}

          {!hasMessages && hasChartData && <WelcomeMessage />}

          {!hasMessages && !scoresLoading && !hasEnoughData && hasChartData && (
            <div className="mx-4 p-3 rounded-xl bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning">
                <Icon name="info" size={16} className="inline mr-1.5 -mt-0.5" />
                You need at least 10 played songs for personalized coaching. 
                Upload some scores to get started!
              </p>
            </div>
          )}

          {level12PlusCount === 0 && hasEnoughData && !hasMessages && hasChartData && (
            <div className="mx-4 p-3 rounded-xl bg-info/10 border border-info/20">
              <p className="text-sm text-muted-foreground">
                <Icon name="lightbulb" size={16} className="inline mr-1.5 -mt-0.5" />
                You're still building your foundation! Once you start playing level 12+ charts, 
                I can give you detailed skill training advice.
              </p>
            </div>
          )}

          {showQuickPrompts && hasEnoughData && hasChartData && (
            <QuickPrompts onSelect={sendMessage} disabled={isLoading} />
          )}

          {messages.map((message, index) => {
            let userPrompt = '';
            if (message.role === 'assistant') {
              for (let i = index - 1; i >= 0; i--) {
                if (messages[i].role === 'user') {
                  userPrompt = messages[i].content;
                  break;
                }
              }
            }
            
            const conversationContext = messages
              .slice(0, index + 1)
              .map(m => ({ role: m.role, content: m.content }));

            const isLastMessage = index === messages.length - 1;

            return (
              <ChatMessage
                key={message.id}
                message={message}
                isStreaming={isLoading && isLastMessage && message.role === 'assistant'}
                getUserScore={getUserScore}
                getSongData={getSongData}
                onSongClick={handleSongClick}
                userPrompt={userPrompt}
                conversationContext={conversationContext}
              />
            );
          })}

          {(() => {
            const lastMessage = messages[messages.length - 1];
            if (!lastMessage || lastMessage.role !== 'assistant' || isLoading) return null;
            
            const { followUps } = parseFollowUps(lastMessage.content);
            if (followUps.length === 0) return null;

            return (
              <div className="flex flex-wrap gap-2 px-4 py-3">
                {followUps.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(suggestion)}
                    disabled={isLoading}
                    className={cn(
                      'px-3 py-2 rounded-full text-sm font-medium transition-all',
                      'bg-secondary text-foreground',
                      'hover:bg-secondary/80 active:scale-95',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            );
          })()}

          {error && (
            <div className="mx-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">
                <Icon name="error" size={16} className="inline mr-1.5 -mt-0.5" />
                {error}
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - fixed at bottom */}
      <div className="flex-shrink-0 bg-background pb-[max(env(safe-area-inset-bottom),16px)]">
        <ChatInput
          onSend={sendMessage}
          disabled={isLoading || scoresLoading || !hasEnoughData || !hasChartData}
          placeholder={
            scoresLoading
              ? 'Loading your data...'
              : !hasChartData
              ? 'Load chart data first...'
              : !hasEnoughData
              ? 'Upload more scores to chat with Edi'
              : 'Ask Edi anything...'
          }
        />
      </div>

      {/* Song Detail Modal */}
      <SongDetailModal
        isOpen={selectedSong !== null}
        onClose={() => setSelectedSong(null)}
        songId={selectedSong?.song_id ?? null}
        songName={selectedSong?.title ?? ''}
        artist={selectedSongArtist}
        eamuseId={selectedSong?.eamuse_id ?? null}
        era={selectedSongEra}
        preloadedCharts={preloadedCharts}
      />
    </div>
  );
}
