import { cn } from '@/lib/utils';

interface MatchModeToggleProps {
  value: 'all' | 'any';
  onChange: (value: 'all' | 'any') => void;
}

export function MatchModeToggle({ value, onChange }: MatchModeToggleProps) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] bg-[#3B3F51] p-1">
      <button
        onClick={() => onChange('all')}
        className={cn(
          'flex-1 rounded-[8px] px-4 py-2 text-sm font-medium transition-all',
          value === 'all'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-white'
        )}
      >
        Match all
      </button>
      <button
        onClick={() => onChange('any')}
        className={cn(
          'flex-1 rounded-[8px] px-4 py-2 text-sm font-medium transition-all',
          value === 'any'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-white'
        )}
      >
        Match any
      </button>
    </div>
  );
}
