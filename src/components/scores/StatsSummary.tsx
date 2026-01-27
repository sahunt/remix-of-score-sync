import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import statsBg from '@/assets/stats-bg.png';

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
        backgroundImage: `url(${statsBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Stats row */}
      <div className="relative flex items-center px-4 py-4">
        {stats.map((stat) => (
          <div 
            key={stat.label || stat.iconName} 
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
      </div>
    </div>
  );
}
