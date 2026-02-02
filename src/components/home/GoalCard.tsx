import { useNavigate } from 'react-router-dom';
import { GoalBadge, GoalTargetType } from './GoalBadge';
import { cn } from '@/lib/utils';

interface GoalCardProps {
  id?: string;
  title: string;
  targetType: GoalTargetType;
  targetValue: string;
  current: number;
  total: number;
  clickable?: boolean;
  className?: string;
  scoreMode?: 'target' | 'average';
  scoreFloor?: number | null;
  isLoading?: boolean;
}

// Get progress bar color based on target type and value
function getProgressColor(targetType: GoalTargetType, targetValue: string): string {
  if (targetType === 'lamp') {
    const value = targetValue.toLowerCase();
    if (value === 'pfc') return 'bg-yellow-400';
    if (value === 'mfc') return 'bg-gradient-to-r from-blue-400 to-pink-400';
    if (value === 'gfc') return 'bg-green-400';
    if (value === 'fc') return 'bg-blue-400';
    if (value === 'life4') return 'bg-red-400';
    return 'bg-primary';
  }
  
  if (targetType === 'flare') {
    // Flare goals use an orange/gold gradient
    return 'bg-gradient-to-r from-orange-400 to-yellow-400';
  }
  
  if (targetType === 'grade') {
    return 'bg-primary';
  }
  
  if (targetType === 'score') {
    return 'bg-accent';
  }
  
  return 'bg-primary';
}

// Format score for display (e.g., 985000 -> "985,000")
function formatScore(score: number): string {
  return score.toLocaleString();
}

export function GoalCard({ 
  id,
  title, 
  targetType,
  targetValue,
  current,
  total,
  clickable = true,
  className,
  scoreMode,
  scoreFloor,
  isLoading = false,
}: GoalCardProps) {
  const navigate = useNavigate();
  const isAverageMode = targetType === 'score' && scoreMode === 'average';
  
  // For average mode with a floor, calculate progress using the floor as the base
  // This makes progress visualization more meaningful (e.g., 950k-990k range instead of 0-990k)
  let progressPercent = 0;
  if (isAverageMode && scoreFloor && scoreFloor > 0) {
    const adjustedCurrent = Math.max(current - scoreFloor, 0);
    const adjustedTotal = Math.max(total - scoreFloor, 1);
    progressPercent = Math.min((adjustedCurrent / adjustedTotal) * 100, 100);
  } else {
    progressPercent = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  }
  const progressColor = getProgressColor(targetType, targetValue);

  const handleClick = () => {
    if (clickable && id) {
      navigate(`/goal/${id}`);
    }
  };
  
  return (
    <div 
      className={cn(
        "card-base w-full",
        clickable && id && "cursor-pointer hover:bg-[#454959] active:scale-[0.98] transition-all duration-100",
        className
      )}
      onClick={handleClick}
      role={clickable && id ? "button" : undefined}
      tabIndex={clickable && id ? 0 : undefined}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && clickable && id) {
          handleClick();
        }
      }}
    >
      {/* Badge - shows appropriate chip based on target type */}
      <GoalBadge targetType={targetType} targetValue={targetValue} scoreMode={scoreMode} />
      
      {/* Title */}
      <h3 className="font-semibold text-foreground text-lg">{title}</h3>
      
      {/* Progress text - with shimmer when loading */}
      {isLoading ? (
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
      ) : (
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {isAverageMode 
            ? `Avg. ${formatScore(current)} / ${formatScore(total)}`
            : `${current}/${total} completed`
          }
        </p>
      )}
      
      {/* Progress bar - shimmer when loading, animated fill on load */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        {isLoading ? (
          <div className="h-full w-full animate-shimmer bg-gradient-to-r from-muted via-muted-foreground/20 to-muted bg-[length:200%_100%]" />
        ) : (
          <div 
            className={`h-full rounded-full animate-progress-fill ${progressColor}`}
            style={{ width: `${progressPercent}%` }}
          />
        )}
      </div>
    </div>
  );
}
