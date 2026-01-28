import { useNavigate } from 'react-router-dom';
import { GoalBadge, GoalType } from './GoalBadge';
import { use12MSMode } from '@/hooks/use12MSMode';
import { cn } from '@/lib/utils';

interface GoalCardProps {
  id?: string;
  title: string;
  type: GoalType;
  current: number;
  total: number;
  clickable?: boolean;
  className?: string;
}

const progressColorMap: Record<GoalType, string> = {
  pfc: 'bg-yellow-400',
  mfc: 'bg-gradient-to-r from-blue-400 to-pink-400',
  gfc: 'bg-green-400',
};

export function GoalCard({ 
  id,
  title, 
  type,
  current,
  total,
  clickable = true,
  className,
}: GoalCardProps) {
  const navigate = useNavigate();
  const { transformHalo } = use12MSMode();
  const progressPercent = total > 0 ? (current / total) * 100 : 0;

  // Transform the type for visual display (badge and progress bar)
  const transformedType = (transformHalo(type) || type) as GoalType;

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
      {/* Badge - uses original type, HaloChip transforms internally */}
      <GoalBadge type={type} />
      
      {/* Title */}
      <h3 className="font-semibold text-foreground text-lg">{title}</h3>
      
      {/* Progress text */}
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {current}/{total} completed
      </p>
      
      {/* Progress bar - uses transformed type for visual color */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${progressColorMap[transformedType]}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
