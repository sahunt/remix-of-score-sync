import { cn } from '@/lib/utils';

interface ScoreModeToggleProps {
  value: 'target' | 'average';
  onChange: (value: 'target' | 'average') => void;
}

export function ScoreModeToggle({ value, onChange }: ScoreModeToggleProps) {
  return (
    <div className="relative flex items-center rounded-[10px] bg-[#262937] p-1.5">
      {/* Sliding background indicator */}
      <div
        className={cn(
          'absolute top-1.5 bottom-1.5 rounded-[8px] bg-primary transition-all duration-300 ease-out',
          value === 'target' 
            ? 'left-1.5 right-[calc(50%+1.5px)]' 
            : 'left-[calc(50%+1.5px)] right-1.5'
        )}
      />
      
      <button
        onClick={() => onChange('target')}
        className={cn(
          'relative z-10 flex-1 rounded-[8px] h-10 px-4 text-sm font-medium transition-all duration-300 ease-out',
          value === 'target'
            ? 'text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground/70'
        )}
      >
        Target
      </button>
      <button
        onClick={() => onChange('average')}
        className={cn(
          'relative z-10 flex-1 rounded-[8px] h-10 px-4 text-sm font-medium transition-all duration-300 ease-out',
          value === 'average'
            ? 'text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground/70'
        )}
      >
        Average
      </button>
    </div>
  );
}
