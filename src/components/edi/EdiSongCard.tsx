import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getJacketUrl, getJacketFallbackUrl } from '@/lib/jacketUrl';
import { FlareChip, type FlareType } from '@/components/ui/FlareChip';
import { HaloChip, type HaloType } from '@/components/ui/HaloChip';

interface EdiSongCardProps {
  songId: number;
  title: string;
  difficultyName: string;
  difficultyLevel: number;
  eamuseId: string | null;
  userScore?: {
    score: number | null;
    rank: string | null;
    flare: number | null;
    halo: string | null;
  } | null;
  onClick?: () => void;
}

// Get difficulty color class based on difficulty name
function getDifficultyColorClass(difficultyName: string | null): string {
  if (!difficultyName) return 'bg-[hsl(var(--difficulty-basic))]';
  const normalized = difficultyName.toUpperCase();
  switch (normalized) {
    case 'BEGINNER': return 'bg-[hsl(var(--difficulty-beginner))]';
    case 'BASIC': return 'bg-[hsl(var(--difficulty-basic))]';
    case 'DIFFICULT': return 'bg-[hsl(var(--difficulty-difficult))]';
    case 'EXPERT': return 'bg-[hsl(var(--difficulty-expert))]';
    case 'CHALLENGE': return 'bg-[hsl(var(--difficulty-challenge))]';
    default: return 'bg-[hsl(var(--difficulty-basic))]';
  }
}

// Convert numeric flare to FlareType
function flareNumberToType(flare: number | null): FlareType | null {
  if (flare === null || flare === undefined) return null;
  const mapping: Record<number, FlareType> = {
    0: 'ex', 1: 'i', 2: 'ii', 3: 'iii', 4: 'iv',
    5: 'v', 6: 'vi', 7: 'vii', 8: 'viii', 9: 'ix', 10: 'ex'
  };
  return mapping[flare] ?? null;
}

// Normalize halo string to HaloType
function normalizeHaloType(halo: string | null): HaloType | null {
  if (!halo) return null;
  const normalized = halo.toLowerCase();
  const validTypes: HaloType[] = ['fc', 'gfc', 'life4', 'mfc', 'pfc'];
  if (validTypes.includes(normalized as HaloType)) {
    return normalized as HaloType;
  }
  return null;
}

export function EdiSongCard({
  songId,
  title,
  difficultyName,
  difficultyLevel,
  eamuseId,
  userScore,
  onClick,
}: EdiSongCardProps) {
  // Image fallback state
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

  const hasScore = userScore?.score !== null && userScore?.score !== undefined;
  const flareType = flareNumberToType(userScore?.flare ?? null);
  const haloType = normalizeHaloType(userScore?.halo ?? null);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full p-2 my-1.5 rounded-xl',
        'bg-background/50 hover:bg-background/70',
        'border border-border/50',
        'transition-colors active:scale-[0.98]'
      )}
    >
      {/* Jacket Art */}
      <div className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-muted">
        {showPlaceholder ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-muted-foreground text-lg">♪</span>
          </div>
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
        
        {/* Difficulty chip overlay */}
        <div
          className={cn(
            'absolute bottom-0.5 right-0.5 w-5 h-5 rounded flex items-center justify-center',
            getDifficultyColorClass(difficultyName)
          )}
        >
          <span className="text-[10px] font-bold text-[#000F33]">
            {difficultyLevel}
          </span>
        </div>
      </div>

      {/* Song Info */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-foreground truncate">
          {title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {hasScore ? (
            <>
              <span className="text-xs font-bold text-foreground tabular-nums">
                {userScore!.score!.toLocaleString()}
              </span>
              {userScore?.rank && (
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {userScore.rank}
                </span>
              )}
              {flareType && <FlareChip type={flareType} className="h-3" />}
              {haloType && <HaloChip type={haloType} className="h-3" />}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">No play</span>
          )}
        </div>
      </div>

      {/* Arrow indicator */}
      <div className="flex-shrink-0 text-muted-foreground">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
