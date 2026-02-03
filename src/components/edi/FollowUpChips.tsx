import { cn } from '@/lib/utils';

interface FollowUpChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
}

export function FollowUpChips({ suggestions, onSelect, disabled }: FollowUpChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          disabled={disabled}
          className={cn(
            'px-3 py-2 rounded-full text-sm font-medium transition-all',
            'bg-primary/10 text-primary border border-primary/20',
            'hover:bg-primary/20 active:scale-95',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
