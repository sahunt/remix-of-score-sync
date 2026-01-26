import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

export type GoalType = 'pfc' | 'mfc' | 'gfc';

interface GoalBadgeProps {
  type: GoalType;
  className?: string;
}

const badgeConfig: Record<GoalType, { label: string; colorClass: string }> = {
  pfc: {
    label: 'PFC',
    colorClass: 'badge-pfc',
  },
  mfc: {
    label: 'MFC',
    colorClass: 'badge-mfc',
  },
  gfc: {
    label: 'GFC',
    colorClass: 'badge-gfc',
  },
};

export function GoalBadge({ type, className }: GoalBadgeProps) {
  const config = badgeConfig[type];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-[10px] font-semibold text-sm',
        config.colorClass,
        className
      )}
    >
      <Icon name="auto_awesome" size={16} />
      <span>{config.label}</span>
      <Icon name="auto_awesome" size={16} />
    </div>
  );
}
