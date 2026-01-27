import { cn } from '@/lib/utils';
import { FlareChip } from '@/components/ui/FlareChip';
import { FLARE_OPTIONS } from './filterTypes';

interface FlareSelectorProps {
  value: number | [number, number] | null;
  onChange: (value: number) => void;
  isBetween?: boolean;
  onBetweenChange?: (value: [number, number]) => void;
  betweenValue?: [number, number];
}

export function FlareSelector({ 
  value, 
  onChange,
  isBetween,
  onBetweenChange,
  betweenValue = [1, 10]
}: FlareSelectorProps) {
  const selectedValue = Array.isArray(value) ? null : value;

  if (isBetween && onBetweenChange) {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">From</p>
          <div className="flex flex-wrap gap-2">
            {FLARE_OPTIONS.map((option) => (
              <button
                key={`from-${option.value}`}
                onClick={() => onBetweenChange([option.value, betweenValue[1]])}
                className={cn(
                  'rounded-lg p-2 transition-all',
                  betweenValue[0] === option.value
                    ? 'bg-primary/20 ring-2 ring-primary'
                    : 'bg-[#3B3F51] hover:bg-[#454A5E]'
                )}
              >
                <FlareChip type={option.flareType} className="h-5" />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">To</p>
          <div className="flex flex-wrap gap-2">
            {FLARE_OPTIONS.map((option) => (
              <button
                key={`to-${option.value}`}
                onClick={() => onBetweenChange([betweenValue[0], option.value])}
                className={cn(
                  'rounded-lg p-2 transition-all',
                  betweenValue[1] === option.value
                    ? 'bg-primary/20 ring-2 ring-primary'
                    : 'bg-[#3B3F51] hover:bg-[#454A5E]'
                )}
              >
                <FlareChip type={option.flareType} className="h-5" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {FLARE_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-lg p-2 transition-all',
            selectedValue === option.value
              ? 'bg-primary/20 ring-2 ring-primary'
              : 'bg-[#3B3F51] hover:bg-[#454A5E]'
          )}
        >
          <FlareChip type={option.flareType} className="h-5" />
        </button>
      ))}
    </div>
  );
}
