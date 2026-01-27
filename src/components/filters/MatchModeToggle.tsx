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
          'absolute top-1.5 bottom-1.5 w-[calc(50%-3px)] rounded-[8px] bg-primary transition-transform duration-300 ease-out',
          value === 'all' ? 'translate-x-[calc(100%+6px)]' : 'translate-x-0'
        )}
      />
      
      <button
        onClick={() => onChange('any')}
        className={cn(
          'relative z-10 flex-1 rounded-[8px] h-10 px-4 text-sm font-medium transition-colors duration-300',
          value === 'any'
            ? 'text-primary-foreground'
            : 'text-muted-foreground hover:text-white'
        )}
      >
        Match any rule
      </button>
      <button
        onClick={() => onChange('all')}
        className={cn(
          'relative z-10 flex-1 rounded-[8px] h-10 px-4 text-sm font-medium transition-colors duration-300',
          value === 'all'
            ? 'text-primary-foreground'
            : 'text-muted-foreground hover:text-white'
        )}
      >
        Match all rules
      </button>
    </div>
  );
}
