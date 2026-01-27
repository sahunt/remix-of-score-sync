import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import rainbowBg from '@/assets/rainbow-bg.png';

interface StatItem {
  label: string;
  value: number;
}

interface StatsSummaryProps {
  stats: StatItem[];
  className?: string;
}

export function StatsSummary({ stats, className }: StatsSummaryProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[10px] px-4 py-3',
        className
      )}
      style={{
        backgroundImage: `url(${rainbowBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Stats row */}
      <div className="relative flex items-center justify-between">
        {stats.map((stat, index) => (
          <div key={stat.label} className="flex flex-col items-center">
            <span className="text-xs text-white/80">{stat.label}</span>
            <span className="text-base font-bold text-white">{stat.value}</span>
          </div>
        ))}
        {/* Info/expand icon */}
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white"
          aria-label="More info"
        >
          <Icon name="info" size={16} />
        </button>
      </div>
    </div>
  );
}
