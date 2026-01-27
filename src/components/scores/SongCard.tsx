import { cn } from '@/lib/utils';
import { FlareChip, type FlareType } from '@/components/ui/FlareChip';
import { HaloChip, type HaloType } from '@/components/ui/HaloChip';

interface SongCardProps {
  name: string;
  difficultyLevel: number | null;
  score: number | null;
  rank: string | null;
  flare: number | null;
  halo: string | null;
  className?: string;
}

// Get halo bar background style
function getHaloBarStyle(halo: string | null): React.CSSProperties {
  if (!halo) {
    return { background: 'var(--halo-cleared)' };
  }
  
  const normalized = halo.toLowerCase();
  
  switch (normalized) {
    case 'mfc':
      return { background: 'var(--halo-mfc-gradient)' };
    case 'pfc':
      return { background: 'var(--halo-pfc)' };
    case 'gfc':
      return { background: 'var(--halo-gfc)' };
    case 'fc':
      return { background: 'var(--halo-fc)' };
    case 'life4':
      return { background: 'var(--halo-life4)' };
    case 'failed':
      return { background: 'var(--halo-failed)' };
    default:
      return { background: 'var(--halo-cleared)' };
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
    10: 'ex',
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
  className,
}: SongCardProps) {
  const flareType = flareNumberToType(flare);
  const haloType = normalizeHaloType(halo);
  const difficultyClass = getDifficultyColorClass(difficultyLevel);

  return (
    <div
      className={cn(
        'w-full rounded-[10px] bg-[#3B3F51] overflow-hidden relative',
        className
      )}
    >
      {/* Top halo bar */}
      <div
        className="h-1 w-full absolute top-0 left-0"
        style={getHaloBarStyle(halo)}
      />

      {/* Main content */}
      <div className="flex items-center gap-3 px-3 pt-[8px] pb-3">
        {/* Album art with difficulty bar */}
        <div className="w-10 h-10 rounded-lg bg-muted relative overflow-hidden flex-shrink-0 flex items-center justify-center">
          {/* Difficulty color bar on left edge */}
          {difficultyLevel && (
            <div
              className={cn('absolute left-0 top-0 w-[4px] h-full', difficultyClass)}
            />
          )}
          {/* Placeholder icon */}
          <span className="text-muted-foreground text-xs">♪</span>
        </div>

        {/* Song info section */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {/* Title row */}
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-medium text-[#96A7AF] uppercase tracking-[1px] leading-normal truncate">{name}</p>
            {difficultyLevel && (
              <div
                className={cn(
                  'flex-shrink-0 w-[14px] h-[14px] rounded-[4px] flex items-center justify-center',
                  difficultyClass
                )}
              >
                <span
                  className="text-[10px] font-bold leading-[18px] text-[#000F33]"
                  style={{ fontFeatureSettings: "'liga' off, 'clig' off" }}
                >
                  {difficultyLevel}
                </span>
              </div>
            )}
          </div>

          {/* Score row */}
          <div className="flex items-center gap-1">
            {score !== null ? (
              <>
                <span className="text-[16px] font-bold text-white leading-normal tabular-nums">
                  {score.toLocaleString()}
                </span>
                {rank && (
                  <span
                    className="text-[10px] font-bold leading-[18px]"
                    style={{
                      color: '#000F33',
                      WebkitTextStrokeWidth: '2px',
                      WebkitTextStrokeColor: '#FFF3D6',
                      fontFeatureSettings: "'liga' off, 'clig' off",
                    }}
                  >
                    {rank}
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">No score</span>
            )}
          </div>
        </div>

        {/* Badge area (right side) - fixed width for consistent alignment */}
        <div className="flex-shrink-0 flex items-center gap-2 ml-5 w-[72px] justify-end">
          {/* Flare chip placeholder (28px width) */}
          <div className="w-[28px] flex justify-center">
            {flareType && <FlareChip type={flareType} />}
          </div>
          {/* Halo chip placeholder (40px width) */}
          <div className="w-[40px] flex justify-center">
            {haloType && <HaloChip type={haloType} />}
          </div>
        </div>
      </div>
    </div>
  );
}
