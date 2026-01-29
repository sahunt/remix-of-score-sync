import { cn } from '@/lib/utils';
import { FlareChip } from '@/components/ui/FlareChip';
import { Icon } from '@/components/ui/Icon';
import { FLARE_OPTIONS } from './filterTypes';

interface FlareSelectorProps {
  value: number[] | [number, number];
  onChange: (value: number[] | [number, number]) => void;
  isBetween?: boolean;
}

export function FlareSelector({ 
  value, 
  onChange,
  isBetween = false,
}: FlareSelectorProps) {
  // Filter out the "none" option for range selection (doesn't make sense for between)
  const rangeOptions = FLARE_OPTIONS.filter(o => o.flareType !== 'none');
  
  if (isBetween) {
    // For "is between", value is a tuple [min, max]
    const [min, max] = Array.isArray(value) && value.length === 2 ? value : [1, 10];

    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">From</p>
          <div className="flex flex-wrap gap-2">
            {rangeOptions.map((option) => (
              <button
                key={`from-${option.value}`}
                onClick={() => onChange([option.value, max])}
                className={cn(
                  'rounded-[10px] p-2 transition-all',
                  min === option.value
                    ? 'bg-primary/20 ring-2 ring-primary'
                    : 'bg-[#3B3F51] hover:bg-[#454A5E]'
                )}
              >
                <FlareChip type={option.flareType as any} className="h-5" />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">To</p>
          <div className="flex flex-wrap gap-2">
            {rangeOptions.map((option) => (
              <button
                key={`to-${option.value}`}
                onClick={() => onChange([min, option.value])}
                className={cn(
                  'rounded-[10px] p-2 transition-all',
                  max === option.value
                    ? 'bg-primary/20 ring-2 ring-primary'
                    : 'bg-[#3B3F51] hover:bg-[#454A5E]'
                )}
              >
                <FlareChip type={option.flareType as any} className="h-5" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Multi-select mode
  const selectedFlares = Array.isArray(value) ? value : [value];

  const toggleFlare = (flare: number) => {
    if (selectedFlares.includes(flare)) {
      // Allow deselecting to empty
      onChange(selectedFlares.filter(f => f !== flare));
    } else {
      onChange([...selectedFlares, flare].sort((a, b) => b - a)); // Sort descending (EX first)
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {FLARE_OPTIONS.map((option) => {
        const isSelected = selectedFlares.includes(option.value);
        const isNoFlare = option.flareType === 'none';
        
        return (
          <button
            key={option.value}
            onClick={() => toggleFlare(option.value)}
            className={cn(
              'rounded-[10px] p-2 transition-all',
              isSelected
                ? 'bg-primary/20 ring-2 ring-primary'
                : 'bg-[#3B3F51] hover:bg-[#454A5E]'
            )}
          >
            {isNoFlare ? (
              <div className="h-5 px-2 flex items-center justify-center">
                <Icon name="do_not_disturb_on_total_silence" size={20} className="text-muted-foreground" />
              </div>
            ) : (
              <FlareChip type={option.flareType as any} className="h-5" />
            )}
          </button>
        );
      })}
    </div>
  );
}
