import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';

interface StatItem {
  label: string;
  value: number;
  isIcon?: boolean;
  iconName?: string;
}

interface StatsSummaryProps {
  stats: StatItem[];
  className?: string;
}

export function StatsSummary({ stats, className }: StatsSummaryProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[10px]',
        className
      )}
      style={{
        background: 'linear-gradient(90deg, rgba(78, 62, 162, 0.60) -8.44%, rgba(177, 73, 143, 0.60) 30.55%, rgba(228, 127, 98, 0.60) 63.76%, rgba(236, 209, 96, 0.60) 107.01%)',
      }}
    >
      {/* Stats row */}
      <div className="relative flex items-center px-4 py-3">
        {stats.map((stat, index) => (
          <div 
            key={stat.label} 
            className="flex flex-1 flex-col items-center"
          >
            {stat.isIcon && stat.iconName ? (
              <Icon name={stat.iconName} size={16} className="text-white/80 mb-0.5" />
            ) : (
              <span className="text-xs text-white/80">{stat.label}</span>
            )}
            <span className="text-base font-bold text-white">{stat.value}</span>
          </div>
        ))}
        {/* Info/expand icon */}
        <button
          type="button"
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-white ml-2"
          aria-label="More info"
        >
          <Icon name="info" size={16} />
        </button>
      </div>
    </div>
  );
}
