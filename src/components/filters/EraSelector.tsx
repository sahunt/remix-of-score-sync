import { cn } from '@/lib/utils';
import { ERA_OPTIONS } from './filterTypes';
import { EraChip } from '@/components/ui/EraChip';

interface EraSelectorProps {
  value: number[];
  onChange: (value: number[]) => void;
}

export function EraSelector({ value, onChange }: EraSelectorProps) {
  const selectedEras = Array.isArray(value) ? value : [];

  const toggleEra = (era: number) => {
    if (selectedEras.includes(era)) {
      onChange(selectedEras.filter(e => e !== era));
    } else {
      onChange([...selectedEras, era]);
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      {ERA_OPTIONS.map((option) => {
        const isSelected = selectedEras.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleEra(option.value)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-[10px] transition-all",
              isSelected
                ? "bg-primary/20 ring-2 ring-primary"
                : "bg-secondary hover:bg-secondary/80"
            )}
          >
            <EraChip era={option.value} className="h-6" />
            <span className="text-xs text-muted-foreground">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
