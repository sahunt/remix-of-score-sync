import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface TargetSelectorProps {
  targetType: 'lamp' | 'grade' | 'flare' | 'score' | null;
  targetValue: string | null;
  onTargetChange: (type: 'lamp' | 'grade' | 'flare' | 'score', value: string) => void;
}

// Lamp options with colored dots matching DDR halo system
const LAMP_OPTIONS = [
  { value: 'mfc', label: 'MFC', dotClass: 'bg-gradient-to-r from-[#B5EFFF] via-[#FDB8FF] to-[#D4B8FF]' },
  { value: 'pfc', label: 'PFC', dotClass: 'bg-[#F9CD67]' },
  { value: 'gfc', label: 'GFC', dotClass: 'bg-[#63EAA8]' },
  { value: 'fc', label: 'FC', dotClass: 'bg-[#9EBBFF]' },
  { value: 'life4', label: 'LIFE4', dotClass: 'bg-[#FF565E]' },
  { value: 'clear', label: 'Clear', dotClass: 'bg-muted-foreground' },
];

const GRADE_OPTIONS = [
  { value: 'AAA', label: 'AAA' },
  { value: 'AA+', label: 'AA+' },
  { value: 'AA', label: 'AA' },
  { value: 'AA-', label: 'AA-' },
  { value: 'A+', label: 'A+' },
  { value: 'A', label: 'A' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B', label: 'B' },
  { value: 'B-', label: 'B-' },
];

const FLARE_OPTIONS = [
  { value: 'EX', label: 'EX' },
  { value: '9', label: 'IX' },
  { value: '8', label: 'VIII' },
  { value: '7', label: 'VII' },
  { value: '6', label: 'VI' },
  { value: '5', label: 'V' },
  { value: '4', label: 'IV' },
  { value: '3', label: 'III' },
  { value: '2', label: 'II' },
  { value: '1', label: 'I' },
];

// Common score thresholds for quick selection
const SCORE_PRESETS = [
  { value: '1000000', label: '1,000,000' },
  { value: '990000', label: '990,000' },
  { value: '980000', label: '980,000' },
  { value: '970000', label: '970,000' },
  { value: '950000', label: '950,000' },
  { value: '900000', label: '900,000' },
];

type Category = 'lamp' | 'grade' | 'flare' | 'score';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'lamp', label: 'Lamp' },
  { value: 'grade', label: 'Grade' },
  { value: 'flare', label: 'Flare' },
  { value: 'score', label: 'Score' },
];

export function TargetSelector({ targetType, targetValue, onTargetChange }: TargetSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(targetType);
  const [customScore, setCustomScore] = useState('');

  // Sync selected category with external targetType changes
  useEffect(() => {
    if (targetType) {
      setSelectedCategory(targetType);
    }
  }, [targetType]);

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category);
  };

  const handleSelect = (type: Category, value: string) => {
    onTargetChange(type, value);
  };

  const handleCustomScoreSubmit = () => {
    const numericValue = customScore.replace(/,/g, '');
    if (numericValue && !isNaN(parseInt(numericValue))) {
      onTargetChange('score', numericValue);
      setCustomScore('');
    }
  };

  const formatScoreInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const isSelected = (type: string, value: string) =>
    targetType === type && targetValue === value;

  return (
    <div className="space-y-3">
      {/* Category Tab Bar */}
      <div className="grid grid-cols-4 gap-2">
        {CATEGORIES.map((category) => (
          <button
            key={category.value}
            onClick={() => handleCategoryClick(category.value)}
            className={cn(
              "h-[44px] rounded-[10px] text-sm font-medium transition-all duration-200",
              selectedCategory === category.value
                ? "bg-primary text-primary-foreground"
                : "bg-card border-2 border-transparent text-foreground hover:bg-muted"
            )}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Options Panel */}
      {selectedCategory && (
        <div className="p-3 rounded-[10px] bg-[#3B3F51] animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Lamp Options */}
          {selectedCategory === 'lamp' && (
            <div className="grid grid-cols-3 gap-2">
              {LAMP_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect('lamp', option.value)}
                  className={cn(
                    "h-[44px] px-3 rounded-[10px] text-sm font-medium transition-all duration-200",
                    "flex items-center justify-center gap-2",
                    isSelected('lamp', option.value)
                      ? "bg-primary/20 border-2 border-primary text-foreground"
                      : "bg-[#4A4E61] border-2 border-transparent text-white hover:bg-[#555a6e]"
                  )}
                >
                  <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", option.dotClass)} />
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {/* Grade Options */}
          {selectedCategory === 'grade' && (
            <div className="grid grid-cols-5 gap-2">
              {GRADE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect('grade', option.value)}
                  className={cn(
                    "h-[44px] px-2 rounded-[10px] text-sm font-medium transition-all duration-200",
                    isSelected('grade', option.value)
                      ? "bg-primary/20 border-2 border-primary text-foreground"
                      : "bg-[#4A4E61] border-2 border-transparent text-white hover:bg-[#555a6e]"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {/* Flare Options */}
          {selectedCategory === 'flare' && (
            <div className="grid grid-cols-5 gap-2">
              {FLARE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect('flare', option.value)}
                  className={cn(
                    "h-[44px] px-2 rounded-[10px] text-sm font-medium transition-all duration-200",
                    isSelected('flare', option.value)
                      ? "bg-primary/20 border-2 border-primary text-foreground"
                      : "bg-[#4A4E61] border-2 border-transparent text-white hover:bg-[#555a6e]"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {/* Score Options */}
          {selectedCategory === 'score' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {SCORE_PRESETS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSelect('score', option.value)}
                    className={cn(
                      "h-[44px] px-2 rounded-[10px] text-sm font-medium transition-all duration-200",
                      isSelected('score', option.value)
                        ? "bg-primary/20 border-2 border-primary text-foreground"
                        : "bg-[#4A4E61] border-2 border-transparent text-white hover:bg-[#555a6e]"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Custom score input */}
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Custom score..."
                  value={customScore}
                  onChange={(e) => setCustomScore(formatScoreInput(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCustomScoreSubmit();
                    }
                  }}
                  className="flex-1 rounded-[10px] bg-[#4A4E61] border-transparent"
                />
                <button
                  onClick={handleCustomScoreSubmit}
                  disabled={!customScore}
                  className={cn(
                    "h-[44px] px-4 rounded-[10px] text-sm font-medium transition-all",
                    customScore
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  Set
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
