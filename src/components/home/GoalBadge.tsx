import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

export type GoalType = 'pfc' | 'mfc' | 'gfc';

interface GoalBadgeProps {
  type: GoalType;
  className?: string;
}

const badgeConfig: Record<GoalType, { label: string; bgClass: string; textClass: string }> = {
  pfc: {
    label: 'PFC',
    bgClass: 'bg-yellow-400/20',
    textClass: 'text-yellow-400',
  },
  mfc: {
    label: 'MFC',
    bgClass: 'bg-pink-400/20',
    textClass: 'text-pink-400',
  },
  gfc: {
    label: 'GFC',
    bgClass: 'bg-green-400/20',
    textClass: 'text-green-400',
  },
};

export function GoalBadge({ type, className }: GoalBadgeProps) {
  const config = badgeConfig[type];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-xs',
        config.bgClass,
        config.textClass,
        className
      )}
    >
      <Icon name="auto_awesome" size={16} />
      <span>{config.label}</span>
    </div>
  );
}
