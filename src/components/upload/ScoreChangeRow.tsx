import { cn } from '@/lib/utils';
import { FlareChip, type FlareType } from '@/components/ui/FlareChip';
import { HaloChip, type HaloType } from '@/components/ui/HaloChip';

export interface ScoreChange {
  song_name: string;
  difficulty_name: string;
  difficulty_level: number;
  old_score: number | null;
  new_score: number | null;
  old_flare: number | null;
  new_flare: number | null;
  old_rank: string | null;
  new_rank: string | null;
  old_halo: string | null;
  new_halo: string | null;
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

interface ScoreChangeRowProps {
  change: ScoreChange;
}

export function ScoreChangeRow({ change }: ScoreChangeRowProps) {
  const difficultyClass = getDifficultyColorClass(change.difficulty_name);
  
  // Determine what improved
  const flareImproved = change.old_flare !== change.new_flare && change.new_flare !== null;
  const haloImproved = change.old_halo !== change.new_halo && change.new_halo !== null;
  const rankImproved = change.old_rank !== change.new_rank && change.new_rank !== null;
  const scoreImproved = change.old_score !== change.new_score;
  
  // Only show flare chip if it improved
  const newFlareType = flareImproved ? flareNumberToType(change.new_flare) : null;
  // Only show halo chip if it improved
  const newHaloType = haloImproved ? normalizeHaloType(change.new_halo) : null;
  
  // Format score with commas
  const formatScore = (score: number | null) => {
    if (score === null) return '—';
    return score.toLocaleString();
  };

  return (
    <div className="flex items-center gap-2 py-2 px-3">
      {/* Difficulty chip */}
      <div className={cn('flex-shrink-0 w-[14px] h-[14px] rounded-[4px] flex items-center justify-center', difficultyClass)}>
        <span className="text-[10px] font-bold leading-[18px] text-[#000F33]" style={{ fontFeatureSettings: "'liga' off, 'clig' off" }}>
          {change.difficulty_level}
        </span>
      </div>
      
      {/* Song name */}
      <span className="text-[10px] font-medium text-[#96A7AF] uppercase tracking-[1px] leading-normal truncate min-w-0 flex-shrink">
        {change.song_name}
      </span>
      
      {/* Score transition */}
      {scoreImproved ? (
        <span className="flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap ml-auto">
          <span className="text-muted-foreground/70">{formatScore(change.old_score)}</span>
          <span className="mx-1 text-muted-foreground/50">→</span>
          <span className="text-foreground font-medium">{formatScore(change.new_score)}</span>
        </span>
      ) : (
        <span className="flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap ml-auto">
          {formatScore(change.new_score)}
        </span>
      )}
      
      {/* Improvement chips - only shown if that field actually improved */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {newFlareType && <FlareChip type={newFlareType} className="h-4" />}
        {newHaloType && <HaloChip type={newHaloType} className="h-3.5" skipTransform />}
        {rankImproved && change.new_rank && (
          <span className="text-xs font-bold text-primary">{change.new_rank}</span>
        )}
      </div>
    </div>
  );
}
