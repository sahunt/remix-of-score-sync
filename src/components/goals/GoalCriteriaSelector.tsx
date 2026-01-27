import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface GoalCriteriaSelectorProps {
  selectedLevels: number[];
  onLevelsChange: (levels: number[]) => void;
}

const LEVELS = Array.from({ length: 19 }, (_, i) => i + 1);

export function GoalCriteriaSelector({ selectedLevels, onLevelsChange }: GoalCriteriaSelectorProps) {
  const toggleLevel = (level: number) => {
    if (selectedLevels.includes(level)) {
      onLevelsChange(selectedLevels.filter(l => l !== level));
    } else {
      onLevelsChange([...selectedLevels, level].sort((a, b) => a - b));
    }
  };

  // Generate header text
  const getHeaderText = () => {
    if (selectedLevels.length === 0) {
      return 'Level is ____';
    }
    if (selectedLevels.length === 1) {
      return `Level is ${selectedLevels[0]}`;
    }
    // Check for continuous range
    const sorted = [...selectedLevels].sort((a, b) => a - b);
    const isContiguous = sorted.every((level, i) => i === 0 || level === sorted[i - 1] + 1);
    if (isContiguous) {
      return `Level is ${sorted[0]}-${sorted[sorted.length - 1]}`;
    }
    return `Level is ${sorted.join(', ')}`;
  };

  return (
    <div className="card-base space-y-3">
      {/* Header with placeholder pattern */}
      <p className="text-sm text-muted-foreground">{getHeaderText()}</p>

      {/* Level grid - 7 columns like filter UI */}
      <div className="grid grid-cols-7 gap-2">
        {LEVELS.map((level) => {
          const isSelected = selectedLevels.includes(level);
          
          return (
            <button
              key={level}
              onClick={() => toggleLevel(level)}
              className={cn(
                "aspect-square rounded-[10px] text-sm font-medium transition-all duration-200",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-[#3B3F51] text-white hover:bg-[#454a5e]"
              )}
            >
              {level}
            </button>
          );
        })}
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        {selectedLevels.length === 0 
          ? "Select levels to filter which charts count toward this goal (optional)"
          : `Goal will track ${selectedLevels.length === 19 ? 'all levels' : `level${selectedLevels.length > 1 ? 's' : ''} ${selectedLevels.join(', ')}`}`
        }
      </p>
    </div>
  );
}
