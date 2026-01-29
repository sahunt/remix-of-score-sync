import { useState } from 'react';
import { cn } from '@/lib/utils';
import { FlareChip, type FlareType } from '@/components/ui/FlareChip';
import { HaloSparkle, type HaloType } from '@/components/ui/HaloSparkle';
import { use12MSMode } from '@/hooks/use12MSMode';
import { getJacketUrl, getJacketFallbackUrl } from '@/lib/jacketUrl';

interface SongCardProps {
  name: string;
  difficultyLevel: number | null;
  score: number | null;
  rank: string | null;
  flare: number | null;
  halo: string | null;
  eamuseId?: string | null;
  songId?: number | null;
  className?: string;
}

// Get halo bar background style
function getHaloBarStyle(halo: string | null): React.CSSProperties {
  if (!halo) {
    return {
      background: 'var(--halo-cleared)'
    };
  }
  const normalized = halo.toLowerCase();
  switch (normalized) {
    case 'mfc':
      return {
        background: 'var(--halo-mfc-gradient)'
      };
    case 'pfc':
      return {
        background: 'var(--halo-pfc)'
      };
    case 'gfc':
      return {
        background: 'var(--halo-gfc)'
      };
    case 'fc':
      return {
        background: 'var(--halo-fc)'
      };
    case 'life4':
      return {
        background: 'var(--halo-life4)'
      };
    case 'failed':
      return {
        background: 'var(--halo-failed)'
      };
    default:
      return {
        background: 'var(--halo-cleared)'
      };
  }
}

// Get difficulty color class based on level
function getDifficultyColorClass(level: number | null): string {
  if (!level) return '';
  if (level <= 5) return 'bg-[hsl(var(--difficulty-beginner))]';
  if (level <= 8) return 'bg-[hsl(var(--difficulty-basic))]';
  if (level <= 12) return 'bg-[hsl(var(--difficulty-difficult))]';
  if (level <= 16) return 'bg-[hsl(var(--difficulty-expert))]';
  return 'bg-[hsl(var(--difficulty-challenge))]';
}

// Get difficulty hex color for drop shadow
function getDifficultyHexColor(level: number | null): string {
  if (!level) return 'transparent';
  if (level <= 5) return '#C5D0E6'; // Beginner
  if (level <= 8) return '#F2C94C'; // Basic
  if (level <= 12) return '#F26C6C'; // Difficult
  if (level <= 16) return '#7BDCB5'; // Expert
  return '#A78BDA'; // Challenge
}

// Convert numeric flare (1-9, 10 for EX) to FlareType
function flareNumberToType(flare: number | null): FlareType | null {
  if (flare === null || flare === undefined) return null;
  const mapping: Record<number, FlareType> = {
    0: 'ex',
    1: 'i',
    2: 'ii',
    3: 'iii',
    4: 'iv',
    5: 'v',
    6: 'vi',
    7: 'vii',
    8: 'viii',
    9: 'ix',
    10: 'ex'
  };
  return mapping[flare] ?? null;
}

// Normalize halo string from DB to HaloType
function normalizeHaloType(halo: string | null): HaloType | null {
  if (!halo) return null;
  const normalized = halo.toLowerCase();
  const validTypes: HaloType[] = ['fc', 'gfc', 'life4', 'mfc', 'pfc'];
  if (validTypes.includes(normalized as HaloType)) {
    return normalized as HaloType;
  }
  return null;
}

export function SongCard({
  name,
  difficultyLevel,
  score,
  rank,
  flare,
  halo,
  eamuseId,
  songId,
  className
}: SongCardProps) {
  const { transformHalo } = use12MSMode();
  const flareType = flareNumberToType(flare);
  // Apply 12MS transformation to halo for display
  const transformedHalo = transformHalo(halo);
  const haloType = normalizeHaloType(transformedHalo);
  const difficultyClass = getDifficultyColorClass(difficultyLevel);

  // Image fallback state
  const [imgError, setImgError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  
  const primaryUrl = getJacketUrl(eamuseId, songId);
  const fallbackUrl = getJacketFallbackUrl(songId);
  const currentImgUrl = useFallback ? fallbackUrl : primaryUrl;
  const showPlaceholder = !currentImgUrl || imgError;

  const handleImageError = () => {
    // If primary failed and we have a fallback, try it
    if (!useFallback && fallbackUrl && fallbackUrl !== primaryUrl) {
      setUseFallback(true);
    } else {
      // No more fallbacks, show placeholder
      setImgError(true);
    }
  };

  return (
    <div className={cn('w-full rounded-[10px] bg-[#3B3F51] overflow-hidden relative', className)}>
      {/* Top halo bar - use transformed halo for display */}
      <div className="h-1 w-full absolute top-0 left-0 rounded-t-sm" style={getHaloBarStyle(transformedHalo)} />

      {/* Main content - pt-[14px] pb-2 to center content in dark area below the 4px bar */}
      <div className="flex items-center gap-3 px-3 pt-[14px] pb-2">
        {/* Album art with difficulty shadow element */}
        <div className="relative w-[38px] h-[38px] flex-shrink-0">
          {/* Solid color shadow element - positioned behind */}
          {difficultyLevel && (
            <div 
              className="absolute top-[3px] left-[3px] w-full h-full rounded-[2px]"
              style={{ backgroundColor: getDifficultyHexColor(difficultyLevel) }}
            />
          )}
          {/* Song jacket image or placeholder - on top */}
          {showPlaceholder ? (
            <div className="relative w-full h-full rounded-[2px] bg-muted flex items-center justify-center border-2 border-[#3B3F51]">
              <span className="text-muted-foreground text-xs">♪</span>
            </div>
          ) : (
            <img
              src={currentImgUrl!}
              alt=""
              className="relative w-full h-full object-cover rounded-[2px] border-2 border-[#3B3F51]"
              onError={handleImageError}
            />
          )}
        </div>

        {/* Song info section */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          {/* Title row */}
          <div className="flex items-center gap-1.5">
            {difficultyLevel && (
              <div className={cn('flex-shrink-0 w-[14px] h-[14px] rounded-[4px] flex items-center justify-center', difficultyClass)}>
                <span className="text-[10px] font-bold leading-[18px] text-[#000F33]" style={{ fontFeatureSettings: "'liga' off, 'clig' off" }}>
                  {difficultyLevel}
                </span>
              </div>
            )}
            <p className="text-[10px] font-medium text-[#96A7AF] uppercase tracking-[1px] leading-normal truncate">{name}</p>
          </div>

          {/* Score row with flare badge */}
          <div className="flex items-center gap-1">
            {score !== null ? (
              <>
                <span className="text-[16px] font-bold text-white leading-normal tabular-nums">
                  {score.toLocaleString()}
                </span>
                {flareType && <FlareChip type={flareType} className="h-5" />}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">No score</span>
            )}
          </div>
        </div>

        {/* Right side - sparkle + rank aligned right */}
        <div className="flex-shrink-0 flex items-center gap-[3px]">
          {haloType && <HaloSparkle type={haloType} />}
          {rank && (
            <span className="text-[16px] font-bold text-white leading-normal">
              {rank}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}