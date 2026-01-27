import { cn } from '@/lib/utils';

interface TargetSelectorProps {
  targetType: 'lamp' | 'grade' | 'flare' | 'score' | null;
  targetValue: string | null;
  onTargetChange: (type: 'lamp' | 'grade' | 'flare' | 'score', value: string) => void;
}

const LAMP_OPTIONS = [
  { value: 'mfc', label: 'MFC', color: 'bg-gradient-to-r from-blue-400 to-pink-400' },
  { value: 'pfc', label: 'PFC', color: 'bg-yellow-400' },
  { value: 'gfc', label: 'GFC', color: 'bg-green-400' },
  { value: 'fc', label: 'FC', color: 'bg-blue-400' },
  { value: 'life4', label: 'LIFE4', color: 'bg-red-400' },
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
  return (
    <div className="space-y-4">
      {/* Lamp targets */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Lamp</p>
        <div className="flex flex-wrap gap-2">
          {LAMP_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onTargetChange('lamp', option.value)}
              className={cn(
                "px-3 py-2 rounded-[10px] text-sm font-medium transition-all",
                "border-2",
                targetType === 'lamp' && targetValue === option.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-muted bg-muted/50 text-muted-foreground hover:border-primary/50"
              )}
            >
              <span className={cn(
                "inline-block w-2 h-2 rounded-full mr-2",
                option.color
              )} />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grade targets */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Grade</p>
        <div className="flex flex-wrap gap-2">
          {GRADE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onTargetChange('grade', option.value)}
              className={cn(
                "px-3 py-2 rounded-[10px] text-sm font-medium transition-all",
                "border-2",
                targetType === 'grade' && targetValue === option.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-muted bg-muted/50 text-muted-foreground hover:border-primary/50"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Flare targets */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Flare</p>
        <div className="flex flex-wrap gap-2">
          {FLARE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onTargetChange('flare', option.value)}
              className={cn(
                "px-3 py-2 rounded-[10px] text-sm font-medium transition-all",
                "border-2",
                targetType === 'flare' && targetValue === option.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-muted bg-muted/50 text-muted-foreground hover:border-primary/50"
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
