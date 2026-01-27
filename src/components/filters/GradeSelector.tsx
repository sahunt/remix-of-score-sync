import { cn } from '@/lib/utils';
import { GRADE_OPTIONS } from './filterTypes';

interface GradeSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
}

export function GradeSelector({ value, onChange }: GradeSelectorProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {GRADE_OPTIONS.map((option) => {
        const isSelected = option.value === value;
        
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-[44px] rounded-[10px] text-sm font-medium transition-all duration-200",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-[#3B3F51] text-white hover:bg-[#454a5e]"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
