import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { FlareChip } from '@/components/ui/FlareChip';
import { FLARE_OPTIONS } from '@/components/filters/filterTypes';

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


const STEP = 10000;

type Category = 'lamp' | 'grade' | 'flare' | 'score';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'lamp', label: 'Lamp' },
  { value: 'grade', label: 'Grade' },
  { value: 'flare', label: 'Flare' },
  { value: 'score', label: 'Score' },
];

export function TargetSelector({ targetType, targetValue, onTargetChange }: TargetSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(targetType);
  
  // Initialize score value from targetValue or default
  const currentScoreValue = targetType === 'score' && targetValue 
    ? parseInt(targetValue) 
    : 950000;

  // Sync selected category with external targetType changes
  useEffect(() => {
    if (targetType) {
      setSelectedCategory(targetType);
    }
  }, [targetType]);

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category);
    // Set a default value when switching to score
    if (category === 'score' && targetType !== 'score') {
      onTargetChange('score', '950000');
    }
  };

  const handleSelect = (type: Category, value: string) => {
    onTargetChange(type, value);
  };

  const formatScore = (val: number) => val.toLocaleString();
  
  const parseScore = (str: string) => {
    const num = parseInt(str.replace(/,/g, ''), 10);
    return isNaN(num) ? 0 : Math.min(1000000, Math.max(0, num));
  };

  const isSelected = (type: string, value: string) =>
    targetType === type && targetValue === value;

  // Calculate the position for the sliding indicator
  const getIndicatorStyle = () => {
    if (!selectedCategory) return { opacity: 0 };
    const index = CATEGORIES.findIndex(c => c.value === selectedCategory);
    const width = 'calc(25% - 6px)'; // 4 columns with gaps
    const left = `calc(${index * 25}% + 6px)`;
    return { left, width, opacity: 1 };
  };

  return (
    <div className="space-y-3">
      {/* Category Tab Bar */}
      <div className="relative flex items-center rounded-[10px] bg-[#3B3F51] p-1.5">
        {/* Sliding background indicator */}
        <div
          className="absolute top-1.5 bottom-1.5 rounded-[8px] bg-primary transition-all duration-300 ease-out"
          style={getIndicatorStyle()}
        />
        
        {CATEGORIES.map((category) => (
          <button
            key={category.value}
            onClick={() => handleCategoryClick(category.value)}
            className={cn(
              "relative z-10 flex-1 h-10 rounded-[8px] text-sm font-medium transition-all duration-300 ease-out",
              selectedCategory === category.value
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground/70"
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
            <div className="flex flex-wrap gap-2">
              {FLARE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect('flare', String(option.value))}
                  className={cn(
                    "rounded-[10px] p-2 transition-all duration-200",
                    isSelected('flare', String(option.value))
                      ? "bg-primary/20 ring-2 ring-primary"
                      : "bg-[#4A4E61] hover:bg-[#555a6e]"
                  )}
                >
                  <FlareChip type={option.flareType} className="h-5" />
                </button>
              ))}
            </div>
          )}

          {/* Score Options - Slider UI */}
          {selectedCategory === 'score' && (
            <div className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                value={formatScore(currentScoreValue)}
                onChange={(e) => {
                  const newVal = parseScore(e.target.value);
                  onTargetChange('score', String(newVal));
                }}
                className="w-full h-[44px] rounded-[10px] bg-[#4A4E61] px-5 text-white text-center text-lg font-medium outline-none focus:ring-2 focus:ring-primary"
              />
              <Slider
                value={[currentScoreValue]}
                onValueChange={([val]) => onTargetChange('score', String(val))}
                min={0}
                max={1000000}
                step={STEP}
                className="w-full"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
