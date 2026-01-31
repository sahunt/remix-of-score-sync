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
}: GoalCardProps) {
  const navigate = useNavigate();
  const isAverageMode = targetType === 'score' && scoreMode === 'average';
  
  // For average mode, progress is based on current avg vs target avg
  const progressPercent = total > 0 ? Math.min((current / total) * 100, 100) : 0;
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
        clickable && id && "cursor-pointer hover:bg-[#454959] transition-colors",
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
      <GoalBadge targetType={targetType} targetValue={targetValue} />
      
      {/* Title */}
      <h3 className="font-semibold text-foreground text-lg">{title}</h3>
      
      {/* Progress text */}
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {isAverageMode 
          ? `Avg. ${formatScore(current)} / ${formatScore(total)}`
          : `${current}/${total} completed`
        }
      </p>
      
      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
