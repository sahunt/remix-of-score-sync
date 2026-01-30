import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import newStatsBg from '@/assets/newStats.png';

interface StatItem {
  label: string;
  value: number;
  isIcon?: boolean;
  iconName?: string;
}

interface StatsSummaryProps {
  stats: StatItem[];
  averageScore?: number | null;
  className?: string;
}

export function StatsSummary({ stats, averageScore, className }: StatsSummaryProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[10px]',
        className
      )}
      style={{
        backgroundImage: `url(${newStatsBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Stats row */}
      <div className="relative flex items-start px-4 py-4">
        {stats.map((stat) => (
          <div 
            key={stat.label || stat.iconName} 
            className="flex flex-1 flex-col items-center text-center"
          >
            {/* Label/Icon row - fixed height for alignment */}
            <div className="h-5 flex items-center justify-center">
              {stat.isIcon && stat.iconName ? (
                <Icon name={stat.iconName} size={16} className="text-white" />
              ) : (
                <span 
                  className="text-white font-bold"
                  style={{ fontSize: '12px', lineHeight: '20px' }}
                >
                  {stat.label}
                </span>
              )}
            </div>
            {/* Value row */}
            <span 
              className="text-white font-bold"
              style={{ fontSize: '12px', lineHeight: '20px' }}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Divider and Average Score */}
      {averageScore != null && averageScore > 0 && (
        <>
          {/* Horizontal divider */}
          <div className="mx-auto w-2/3 h-[1px] bg-white/50" />
          
          {/* Average score display */}
          <div className="flex items-center justify-center px-4 py-3">
            <span 
              className="text-white font-bold"
              style={{ fontSize: '12px', lineHeight: '20px' }}
            >
              Avg. {averageScore.toLocaleString()}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
