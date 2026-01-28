import { HaloChip, HaloType } from '@/components/ui/HaloChip';
import { cn } from '@/lib/utils';

// Re-export HaloType for backwards compatibility, but GoalType is now an alias
export type GoalType = 'pfc' | 'mfc' | 'gfc';

interface GoalBadgeProps {
  type: GoalType;
  className?: string;
}

export function GoalBadge({ type, className }: GoalBadgeProps) {
  // Skip transformation for goal badges - the goal target itself doesn't change
  return (
    <HaloChip type={type as HaloType} className={className} skipTransform />
  );
}
