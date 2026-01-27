import { cn } from '@/lib/utils';

interface DifficultyChipProps {
  level: number;
  selected?: boolean;
  onClick?: () => void;
}

export function DifficultyChip({ level, selected = false, onClick }: DifficultyChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-9 w-full items-center justify-center rounded-[10px] text-sm font-medium transition-all',
        selected
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-foreground hover:bg-secondary/80'
      )}
    >
      {level}
    </button>
  );
}
