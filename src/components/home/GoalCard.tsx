import { GoalBadge, GoalType } from './GoalBadge';

interface GoalCardProps {
  title: string;
  type: GoalType;
  current: number;
  total: number;
}

const progressColorMap: Record<GoalType, string> = {
  pfc: 'bg-yellow-400',
  mfc: 'bg-gradient-to-r from-blue-400 to-pink-400',
  gfc: 'bg-green-400',
};

export function GoalCard({ 
  title, 
  type,
  current,
  total,
}: GoalCardProps) {
  const progressPercent = total > 0 ? (current / total) * 100 : 0;
  
  return (
    <div className="card-base w-full">
      {/* Badge */}
      <GoalBadge type={type} />
      
      {/* Title */}
      <h3 className="font-semibold text-foreground text-lg">{title}</h3>
      
      {/* Progress text */}
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {current}/{total} completed
      </p>
      
      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${progressColorMap[type]}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
