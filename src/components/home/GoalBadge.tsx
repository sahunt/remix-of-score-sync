import { HaloChip, HaloType } from '@/components/ui/HaloChip';
import { FlareChip, FlareType } from '@/components/ui/FlareChip';
import { cn } from '@/lib/utils';

export type GoalTargetType = 'lamp' | 'grade' | 'flare' | 'score';

interface GoalBadgeProps {
  targetType: GoalTargetType;
  targetValue: string;
  className?: string;
}

// Convert numeric flare value to FlareType
function getFlareType(value: string): FlareType {
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'ex' || lowerValue === '10') return 'ex';
  
  const numValue = parseInt(value, 10);
  const flareMap: Record<number, FlareType> = {
    1: 'i',
    2: 'ii',
    3: 'iii',
    4: 'iv',
    5: 'v',
    6: 'vi',
    7: 'vii',
    8: 'viii',
    9: 'ix',
  };
  return flareMap[numValue] || 'i';
}

export function GoalBadge({ targetType, targetValue, className }: GoalBadgeProps) {
  // Display FlareChip for flare goals
  if (targetType === 'flare') {
    return (
      <FlareChip 
        type={getFlareType(targetValue)} 
        className={cn('h-6', className)} 
      />
    );
  }

  // Display HaloChip for lamp goals
  if (targetType === 'lamp') {
    const haloType = targetValue.toLowerCase() as HaloType;
    // Only show badge for supported halo types
    if (['pfc', 'mfc', 'gfc', 'fc', 'life4'].includes(haloType)) {
      return (
        <HaloChip type={haloType} className={className} skipTransform />
      );
    }
  }

  // For grade/score goals, show a simple text badge
  if (targetType === 'grade') {
    return (
      <div className={cn(
        "inline-flex items-center px-2 py-1 rounded-md bg-primary/20 text-primary font-bold text-sm",
        className
      )}>
        {targetValue}
      </div>
    );
  }

  if (targetType === 'score') {
    return (
      <div className={cn(
        "inline-flex items-center px-2 py-1 rounded-md bg-accent/20 text-accent-foreground font-bold text-sm",
        className
      )}>
        {parseInt(targetValue, 10).toLocaleString()}+
      </div>
    );
  }

  return null;
}
