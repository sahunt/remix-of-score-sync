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
      {/* Mode toggle */}
      <div className="flex rounded-[10px] bg-muted p-1">
        <button
          onClick={() => onModeChange('all')}
          className={cn(
            "flex-1 py-2 px-4 rounded-[8px] text-sm font-medium transition-all",
            mode === 'all'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          All matching
        </button>
        <button
          onClick={() => onModeChange('count')}
          className={cn(
            "flex-1 py-2 px-4 rounded-[8px] text-sm font-medium transition-all",
            mode === 'count'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
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
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Target:</span>
          <Input
            type="number"
            min={1}
            max={1000}
            value={count}
            onChange={(e) => onCountChange(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-24 rounded-[10px]"
          />
          <span className="text-sm text-muted-foreground">songs</span>
        </div>
      )}
    </div>
  );
}
