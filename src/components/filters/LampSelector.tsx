import { cn } from '@/lib/utils';
import { HaloChip } from '@/components/ui/HaloChip';
import { LAMP_OPTIONS } from './filterTypes';

interface LampSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
}

export function LampSelector({ value, onChange }: LampSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {LAMP_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-lg px-3 py-2 transition-all',
            value === option.value
              ? 'bg-primary/20 ring-2 ring-primary'
              : 'bg-[#3B3F51] hover:bg-[#454A5E]'
          )}
        >
          {option.haloType ? (
            <HaloChip type={option.haloType} className="h-4" />
          ) : (
            <span className="text-sm font-medium text-white">{option.label}</span>
          )}
        </button>
      ))}
    </div>
  );
}
