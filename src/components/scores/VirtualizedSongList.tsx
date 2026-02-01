import { useRef, memo } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
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
 * Uses window-based virtualization so the page scrolls naturally.
 */
export function VirtualizedSongList({ songs, onSongClick }: VirtualizedSongListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useWindowVirtualizer({
    count: songs.length,
    estimateSize: () => 70, // SongCard height (~66px) + gap (4px)
    overscan: 8, // Render extra items for smoother scrolling
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div ref={listRef}>
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
                transform: `translateY(${virtualItem.start - (listRef.current?.offsetTop ?? 0)}px)`,
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
