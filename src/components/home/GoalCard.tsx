import { GoalBadge, GoalType } from './GoalBadge';

interface GoalCardProps {
  title: string;
  difficulty: string;
  level: number;
  type: GoalType;
  current: number;
  total: number;
  artworks?: string[];
}

export function GoalCard({ 
  title, 
  difficulty,
  level,
  type,
  current,
  total,
  artworks = []
}: GoalCardProps) {
  const progressPercent = total > 0 ? (current / total) * 100 : 0;
  
  return (
    <div className="relative overflow-hidden rounded-[10px] bg-secondary p-4">
      <div className="flex gap-3">
        {/* Left content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Badge */}
          <GoalBadge type={type} className="self-start mb-3" />
          
          {/* Song info */}
          <h3 className="font-semibold text-foreground text-lg truncate">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {difficulty} Lv.{level}
          </p>
        </div>
        
        {/* Right side - Album art grid placeholder */}
        {artworks.length > 0 ? (
          <div className="grid grid-cols-3 gap-1 w-20 h-20 flex-shrink-0">
            {artworks.slice(0, 6).map((art, i) => (
              <div 
                key={i} 
                className="bg-muted rounded-sm overflow-hidden"
              >
                <img src={art} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 w-20 h-20 flex-shrink-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div 
                key={i} 
                className="bg-muted/50 rounded-sm"
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Progress section */}
      <div className="mt-4">
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-2xl font-bold text-foreground">{current}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-lg text-muted-foreground">{total}</span>
          <span className="text-sm text-muted-foreground ml-1">completed</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
