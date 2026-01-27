import { cn } from '@/lib/utils';
import { LAMP_OPTIONS } from './filterTypes';

interface LampSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

// Halo color styles for selected state - matching the design system
const LAMP_COLORS: Record<string, { bg: string; text: string }> = {
  mfc: { bg: 'bg-gradient-to-r from-[#B5EFFF] via-[#FDB8FF] to-[#D4B8FF]', text: 'text-gray-900' },
  pfc: { bg: 'bg-[#F9CD67]', text: 'text-gray-900' },
  gfc: { bg: 'bg-[#63EAA8]', text: 'text-gray-900' },
  fc: { bg: 'bg-[#9EBBFF]', text: 'text-gray-900' },
  life4: { bg: 'bg-[#FF565E]', text: 'text-white' },
  clear: { bg: 'bg-[#A6ACC4]', text: 'text-gray-900' },
  fail: { bg: 'bg-[#4C062F]', text: 'text-white' },
};

export function LampSelector({ value, onChange }: LampSelectorProps) {
  const selectedLamps = Array.isArray(value) ? value : [value];

  const toggleLamp = (lamp: string) => {
    if (selectedLamps.includes(lamp)) {
      // Allow deselecting to empty
      onChange(selectedLamps.filter(l => l !== lamp));
    } else {
      onChange([...selectedLamps, lamp]);
    }
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      {LAMP_OPTIONS.map((option) => {
        const isSelected = selectedLamps.includes(option.value);
        const colors = LAMP_COLORS[option.value];
        
        return (
          <button
            key={option.value}
            onClick={() => toggleLamp(option.value)}
            className={cn(
              'h-[44px] rounded-[10px] text-sm font-medium transition-all duration-200',
              isSelected
                ? cn(colors?.bg, colors?.text)
                : 'bg-[#3B3F51] text-white hover:bg-[#454a5e]'
            )}
          >
            {option.label.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
