import { cn } from '@/lib/utils';

interface DifficultyChipProps {
  level: number;
  selected?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
}

export function DifficultyChip({ level, selected = false, highlighted = false, onClick }: DifficultyChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-9 w-full items-center justify-center rounded-[10px] text-sm font-medium transition-all',
        selected
          ? 'bg-primary text-primary-foreground'
          : highlighted
            ? 'bg-primary/30 text-primary ring-1 ring-primary/50'
            : 'bg-secondary text-foreground hover:bg-secondary/80'
      )}
    >
      {level}
    </button>
  );
}
