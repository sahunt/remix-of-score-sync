import { getJacketUrl, getJacketFallbackUrl } from '@/lib/jacketUrl';
import { useState } from 'react';

interface SongSearchCardProps {
  songId: number;
  name: string;
  artist: string | null;
  eamuseId: string | null;
  onClick: () => void;
}

/**
 * Song card for Home page search results.
 * Shows only song-level info: jacket, artist, name.
 * Tapping opens the SongDetailModal.
 */
export function SongSearchCard({
  songId,
  name,
  artist,
  eamuseId,
  onClick,
}: SongSearchCardProps) {
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

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full p-3 rounded-[10px] bg-secondary hover:bg-secondary/80 transition-colors text-left"
    >
      {/* Jacket image */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
        {showPlaceholder ? (
          <span className="text-muted-foreground text-lg">♪</span>
        ) : (
          <img
            src={currentImgUrl!}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={handleImageError}
          />
        )}
      </div>

      {/* Song info */}
      <div className="flex-1 min-w-0">
        {artist && (
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.5px] truncate">
            {artist}
          </p>
        )}
        <p className="text-sm font-semibold text-foreground truncate">
          {name}
        </p>
      </div>
    </button>
  );
}
