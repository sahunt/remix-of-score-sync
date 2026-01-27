import { cn } from '@/lib/utils';

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
];

const GRADE_OPTIONS = [
  { value: 'AAA', label: 'AAA' },
  { value: 'AA+', label: 'AA+' },
  { value: 'AA', label: 'AA' },
  { value: 'A', label: 'A' },
];

const FLARE_OPTIONS = [
  { value: 'EX', label: 'EX' },
  { value: '9', label: 'IX' },
  { value: '8', label: 'VIII' },
  { value: '7', label: 'VII' },
];

export function TargetSelector({ targetType, targetValue, onTargetChange }: TargetSelectorProps) {
  const isSelected = (type: string, value: string) => 
    targetType === type && targetValue === value;

  return (
    <div className="space-y-4">
      {/* Lamp targets */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Lamp</p>
        <div className="flex flex-wrap gap-2">
          {LAMP_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onTargetChange('lamp', option.value)}
              className={cn(
                "h-[44px] px-4 rounded-[10px] text-sm font-medium transition-all duration-200",
                "flex items-center gap-2",
                isSelected('lamp', option.value)
                  ? "bg-primary/20 border-2 border-primary text-foreground"
                  : "bg-[#3B3F51] border-2 border-transparent text-white hover:bg-[#454a5e]"
              )}
            >
              <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", option.dotClass)} />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grade targets */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Grade</p>
        <div className="flex flex-wrap gap-2">
          {GRADE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onTargetChange('grade', option.value)}
              className={cn(
                "h-[44px] px-4 rounded-[10px] text-sm font-medium transition-all duration-200",
                isSelected('grade', option.value)
                  ? "bg-primary/20 border-2 border-primary text-foreground"
                  : "bg-[#3B3F51] border-2 border-transparent text-white hover:bg-[#454a5e]"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Flare targets */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Flare</p>
        <div className="flex flex-wrap gap-2">
          {FLARE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onTargetChange('flare', option.value)}
              className={cn(
                "h-[44px] px-4 rounded-[10px] text-sm font-medium transition-all duration-200",
                isSelected('flare', option.value)
                  ? "bg-primary/20 border-2 border-primary text-foreground"
                  : "bg-[#3B3F51] border-2 border-transparent text-white hover:bg-[#454a5e]"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
