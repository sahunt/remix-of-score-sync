import { forwardRef, useState, useEffect } from 'react';
import { getJacketUrl, getJacketFallbackUrl } from '@/lib/jacketUrl';
import { formatOffset, biasToUserOffset } from '@/lib/offsetUtils';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SongSearchCardProps {
  songId: number;
  name: string;
  artist: string | null;
  eamuseId: string | null;
  onClick: () => void;
}

/**
 * Song card for Home page search results.
 * Shows song-level info: jacket, artist, name, and offset (right-aligned).
 * Tapping opens the SongDetailModal.
 */
export const SongSearchCard = forwardRef<HTMLButtonElement, SongSearchCardProps>(
  function SongSearchCard({ songId, name, artist, eamuseId, onClick }, ref) {
    const [imgError, setImgError] = useState(false);
    const [useFallback, setUseFallback] = useState(false);
    const [offset, setOffset] = useState<number | null>(null);

    const primaryUrl = getJacketUrl(eamuseId, songId);
    const fallbackUrl = getJacketFallbackUrl(songId);
    const currentImgUrl = useFallback ? fallbackUrl : primaryUrl;
    const showPlaceholder = !currentImgUrl || imgError;

    // Fetch global offset for this song
    useEffect(() => {
      let cancelled = false;
      
      const fetchOffset = async () => {
        const { data } = await supabase
          .from('song_bias')
          .select('bias_ms')
          .eq('song_id', songId)
          .maybeSingle();
        
        if (!cancelled && data?.bias_ms != null) {
          setOffset(biasToUserOffset(data.bias_ms));
        }
      };
      
      fetchOffset();
      return () => { cancelled = true; };
    }, [songId]);

    const handleImageError = () => {
      if (!useFallback && fallbackUrl && fallbackUrl !== primaryUrl) {
        setUseFallback(true);
      } else {
        setImgError(true);
      }
    };

    const offsetLabel = formatOffset(offset);

    return (
      <button
        ref={ref}
        onClick={onClick}
        className="flex items-center gap-3 w-full p-3 rounded-[10px] bg-[#3B3F51] hover:bg-[#454A5E] active:scale-[0.98] transition-all duration-100 text-left"
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

        {/* Offset (right-aligned) */}
        {offsetLabel && (
          <span className={cn(
            'flex-shrink-0 text-[10px] font-medium text-muted-foreground tabular-nums'
          )}>
            {offsetLabel}
          </span>
        )}
      </button>
    );
  }
);
