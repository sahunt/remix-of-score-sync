import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface GoalModeToggleProps {
  mode: 'all' | 'count';
  count: number;
  onModeChange: (mode: 'all' | 'count') => void;
  onCountChange: (count: number) => void;
}

export function GoalModeToggle({ mode, count, onModeChange, onCountChange }: GoalModeToggleProps) {
  return (
    <div className="space-y-3">
      {/* Mode toggle - matches MatchModeToggle styling */}
      <div className="relative flex items-center rounded-[10px] bg-[#262937] p-1.5">
        {/* Sliding background indicator */}
        <div
          className={cn(
            'absolute top-1.5 bottom-1.5 rounded-[8px] bg-primary transition-all duration-300 ease-out',
            mode === 'all' 
              ? 'left-1.5 right-[calc(50%+1.5px)]' 
              : 'left-[calc(50%+1.5px)] right-1.5'
          )}
        />
        
        <button
          onClick={() => onModeChange('all')}
          className={cn(
            'relative z-10 flex-1 rounded-[8px] h-10 px-4 text-sm font-medium transition-all duration-300 ease-out',
            mode === 'all'
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground/70'
          )}
        >
          All matching
        </button>
        <button
          onClick={() => onModeChange('count')}
          className={cn(
            'relative z-10 flex-1 rounded-[8px] h-10 px-4 text-sm font-medium transition-all duration-300 ease-out',
            mode === 'count'
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground/70'
          )}
        >
          Count
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground">
        {mode === 'all'
          ? "Achieve this on all songs that match your criteria (100% completion goal)"
          : "Achieve this on a specific number of songs"
        }
      </p>

      {/* Count input (only for count mode) */}
      {mode === 'count' && (
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-sm text-muted-foreground">Target:</span>
          <Input
            type="number"
            min={1}
            max={1000}
            value={count}
            onChange={(e) => onCountChange(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-24 rounded-[10px] bg-[#3B3F51] border-transparent"
          />
          <span className="text-sm text-muted-foreground">songs</span>
        </div>
      )}
    </div>
  );
}
