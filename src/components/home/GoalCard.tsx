import { Icon } from '@/components/ui/Icon';

interface GoalCardProps {
  title: string;
  subtitle?: string;
  progress?: number;
  iconName?: string;
  variant?: 'default' | 'accent';
}

export function GoalCard({ 
  title, 
  subtitle, 
  progress = 0, 
  iconName = 'flag',
  variant = 'default' 
}: GoalCardProps) {
  const isAccent = variant === 'accent';
  
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 ${
      isAccent 
        ? 'bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30' 
        : 'bg-card/80 backdrop-blur-sm border border-border/50'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`rounded-xl p-2.5 ${
          isAccent ? 'bg-primary/20' : 'bg-secondary'
        }`}>
          <Icon 
            name={iconName} 
            size={24} 
            className={isAccent ? 'text-primary' : 'text-muted-foreground'} 
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      
      {progress > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
