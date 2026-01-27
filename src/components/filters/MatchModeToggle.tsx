import { cn } from '@/lib/utils';

interface MatchModeToggleProps {
  value: 'all' | 'any';
  onChange: (value: 'all' | 'any') => void;
}

export function MatchModeToggle({ value, onChange }: MatchModeToggleProps) {
  return (
    <div className="relative flex items-center rounded-[10px] bg-[#262937] p-1.5">
      {/* Sliding background indicator */}
      <div
        className={cn(
          'absolute top-1.5 bottom-1.5 rounded-[8px] bg-primary border-2 border-white transition-all duration-300 ease-out',
          value === 'all' 
            ? 'left-[calc(50%+1.5px)] right-1.5' 
            : 'left-1.5 right-[calc(50%+1.5px)]'
        )}
      />
      
      <button
        onClick={() => onChange('any')}
        className={cn(
          'relative z-10 flex-1 rounded-[8px] h-10 px-4 text-sm font-medium transition-all duration-300 ease-out',
          value === 'any'
            ? 'text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground/70'
        )}
      >
        Match any rule
      </button>
      <button
        onClick={() => onChange('all')}
        className={cn(
          'relative z-10 flex-1 rounded-[8px] h-10 px-4 text-sm font-medium transition-all duration-300 ease-out',
          value === 'all'
            ? 'text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground/70'
        )}
      >
        Match all rules
      </button>
    </div>
  );
}
