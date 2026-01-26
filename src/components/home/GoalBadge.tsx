import { HaloChip, HaloType } from '@/components/ui/HaloChip';
import { cn } from '@/lib/utils';

// Re-export HaloType for backwards compatibility, but GoalType is now an alias
export type GoalType = 'pfc' | 'mfc' | 'gfc';

interface GoalBadgeProps {
  type: GoalType;
  className?: string;
}

export function GoalBadge({ type, className }: GoalBadgeProps) {
  return (
    <HaloChip type={type as HaloType} className={className} />
  );
}
