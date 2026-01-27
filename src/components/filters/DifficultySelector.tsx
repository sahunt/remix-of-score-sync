import { cn } from '@/lib/utils';
import { DIFFICULTY_OPTIONS } from './filterTypes';

interface DifficultySelectorProps {
  value: string | null;
  onChange: (value: string) => void;
}

// Color mapping for DDR difficulty types
const DIFFICULTY_COLORS: Record<string, string> = {
  BEGINNER: 'bg-difficulty-beginner text-difficulty-beginner-foreground',
  BASIC: 'bg-difficulty-basic text-difficulty-basic-foreground',
  DIFFICULT: 'bg-difficulty-difficult text-difficulty-difficult-foreground',
  EXPERT: 'bg-difficulty-expert text-difficulty-expert-foreground',
  CHALLENGE: 'bg-difficulty-challenge text-difficulty-challenge-foreground',
};

export function DifficultySelector({ value, onChange }: DifficultySelectorProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {DIFFICULTY_OPTIONS.map((option) => {
        const isSelected = option.value === value;
        const colorClass = DIFFICULTY_COLORS[option.value] || '';
        
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-[44px] rounded-[10px] text-xs font-medium transition-all duration-200",
              isSelected
                ? colorClass
                : "bg-[#3B3F51] text-white hover:bg-[#454a5e]"
            )}
          >
            {option.label.slice(0, 3).toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
