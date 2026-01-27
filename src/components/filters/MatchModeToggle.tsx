import { cn } from '@/lib/utils';

interface MatchModeToggleProps {
  value: 'all' | 'any';
  onChange: (value: 'all' | 'any') => void;
}

export function MatchModeToggle({ value, onChange }: MatchModeToggleProps) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-[#262937] p-1.5">
      <button
        onClick={() => onChange('any')}
        className={cn(
          'flex-1 rounded-full h-10 px-4 text-sm font-medium transition-all',
          value === 'any'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-white'
        )}
      >
        Match any rule
      </button>
      <button
        onClick={() => onChange('all')}
        className={cn(
          'flex-1 rounded-full h-10 px-4 text-sm font-medium transition-all',
          value === 'all'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-white'
        )}
      >
        Match all rules
      </button>
    </div>
  );
}
