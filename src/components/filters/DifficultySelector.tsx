import { cn } from '@/lib/utils';
import { DIFFICULTY_OPTIONS } from './filterTypes';

interface DifficultySelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

// Map to the CSS utility classes defined in index.css
const DIFFICULTY_CLASSES: Record<string, string> = {
  BEGINNER: 'difficulty-beginner',
  BASIC: 'difficulty-basic',
  DIFFICULT: 'difficulty-difficult',
  EXPERT: 'difficulty-expert',
  CHALLENGE: 'difficulty-challenge',
};

export function DifficultySelector({ value, onChange }: DifficultySelectorProps) {
  const selectedDifficulties = Array.isArray(value) ? value : [value];

  const toggleDifficulty = (difficulty: string) => {
    if (selectedDifficulties.includes(difficulty)) {
      // Allow deselecting to empty
      onChange(selectedDifficulties.filter(d => d !== difficulty));
    } else {
      onChange([...selectedDifficulties, difficulty]);
    }
  };

  return (
    <div className="grid grid-cols-5 gap-2">
      {DIFFICULTY_OPTIONS.map((option) => {
        const isSelected = selectedDifficulties.includes(option.value);
        const difficultyClass = DIFFICULTY_CLASSES[option.value] || '';
        
        return (
          <button
            key={option.value}
            onClick={() => toggleDifficulty(option.value)}
            className={cn(
              "h-[44px] rounded-[10px] text-xs font-medium transition-all duration-200",
              isSelected
                ? difficultyClass
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
