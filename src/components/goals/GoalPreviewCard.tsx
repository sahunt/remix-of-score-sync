import { cn } from '@/lib/utils';
import { GoalBadge, GoalType } from '@/components/home/GoalBadge';

interface GoalPreviewCardProps {
  name?: string;
  targetType?: 'lamp' | 'grade' | 'flare' | 'score' | null;
  targetValue?: string | null;
  goalMode: 'all' | 'count';
  goalCount?: number;
  matchingTotal?: number;
  currentProgress?: number;
}

// Map target to badge type
function getBadgeType(targetType: string | null | undefined, targetValue: string | null | undefined): GoalType | null {
  if (targetType === 'lamp' && targetValue) {
    const value = targetValue.toLowerCase();
    if (value === 'pfc') return 'pfc';
    if (value === 'mfc') return 'mfc';
    if (value === 'gfc') return 'gfc';
  }
  return null;
}

// Get progress bar color based on target
function getProgressBarClass(targetType: string | null | undefined, targetValue: string | null | undefined): string {
  if (targetType === 'lamp' && targetValue) {
    const value = targetValue.toLowerCase();
    if (value === 'mfc') return 'bg-gradient-to-r from-blue-400 to-pink-400';
    if (value === 'pfc') return 'bg-yellow-400';
    if (value === 'gfc') return 'bg-green-400';
    if (value === 'fc') return 'bg-blue-400';
    if (value === 'life4') return 'bg-red-400';
  }
  if (targetType === 'grade') return 'bg-amber-400';
  if (targetType === 'flare') return 'bg-orange-400';
  if (targetType === 'score') return 'bg-primary';
  return 'bg-muted-foreground';
}

export function GoalPreviewCard({
  name,
  targetType,
  targetValue,
  goalMode,
  goalCount = 10,
  matchingTotal = 0,
  currentProgress = 0,
}: GoalPreviewCardProps) {
  const badgeType = getBadgeType(targetType, targetValue);
  const progressBarClass = getProgressBarClass(targetType, targetValue);
  
  // Calculate display values
  const total = goalMode === 'all' ? matchingTotal : goalCount;
  const current = Math.min(currentProgress, total);
  const progressPercent = total > 0 ? (current / total) * 100 : 0;

  // Generate preview name if not set
  const displayName = name || (targetValue ? `${targetValue.toUpperCase()} goal` : 'Set your goal...');

  const isIncomplete = !targetType || !targetValue;

  return (
    <div className={cn(
      "card-base w-full border-2 border-dashed transition-all",
      isIncomplete ? "border-muted-foreground/30" : "border-primary/50"
    )}>
      {/* Preview label */}
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Preview</p>
      
      {/* Badge */}
      {badgeType ? (
        <GoalBadge type={badgeType} />
      ) : targetValue ? (
        <div className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-medium text-foreground">
          {targetValue.toUpperCase()}
        </div>
      ) : (
        <div className="inline-flex items-center px-2 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground">
          Select target...
        </div>
      )}
      
      {/* Title */}
      <h3 className={cn(
        "font-semibold text-lg",
        isIncomplete ? "text-muted-foreground" : "text-foreground"
      )}>
        {displayName}
      </h3>
      
      {/* Progress text */}
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {isIncomplete ? '-- / --' : `${current}/${total}`} completed
      </p>
      
      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", progressBarClass)}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
