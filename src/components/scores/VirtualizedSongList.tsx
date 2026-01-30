import { useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SongCard } from './SongCard';

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

interface VirtualizedSongListProps {
  songs: DisplaySong[];
  onSongClick: (song: DisplaySong) => void;
}

// Memoized row component to prevent unnecessary re-renders
const SongRow = memo(function SongRow({ 
  song, 
  onClick 
}: { 
  song: DisplaySong; 
  onClick: () => void;
}) {
  return (
    <SongCard
      name={song.name ?? 'Unknown Song'}
      difficultyLevel={song.difficulty_level}
      difficultyName={song.difficulty_name}
      score={song.score}
      rank={song.rank}
      flare={song.flare}
      halo={song.halo}
      eamuseId={song.eamuse_id}
      songId={song.song_id}
      onClick={onClick}
    />
  );
});

/**
 * Virtualized song list that only renders visible items.
 * This dramatically improves performance when displaying hundreds of songs.
 * Uses @tanstack/react-virtual for efficient windowing.
 */
export function VirtualizedSongList({ songs, onSongClick }: VirtualizedSongListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70, // SongCard height (~66px) + gap (4px)
    overscan: 8, // Render extra items for smoother scrolling
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div 
      ref={parentRef} 
      className="h-[calc(100vh-480px)] min-h-[300px] overflow-auto scrollbar-thin"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualItem) => {
          const song = songs[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="pb-2">
                <SongRow 
                  song={song} 
                  onClick={() => onSongClick(song)} 
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
