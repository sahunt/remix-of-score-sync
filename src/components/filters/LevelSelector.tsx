import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LevelPickerModal } from './LevelPickerModal';

interface LevelSelectorProps {
  value: number | [number, number];
  onChange: (value: number | [number, number]) => void;
  isBetween: boolean;
}

const LEVELS = Array.from({ length: 19 }, (_, i) => i + 1);

export function LevelSelector({ value, onChange, isBetween }: LevelSelectorProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<'min' | 'max' | null>(null);

  if (isBetween) {
    const [min, max] = Array.isArray(value) ? value : [1, 19];

    const handleOpenMinModal = () => {
      setEditingField('min');
      setModalOpen(true);
    };

    const handleOpenMaxModal = () => {
      setEditingField('max');
      setModalOpen(true);
    };

    const handleSelectLevel = (level: number) => {
      if (editingField === 'min') {
        onChange([level, max]);
      } else if (editingField === 'max') {
        onChange([min, level]);
      }
    };

    return (
      <>
        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            <label className="text-sm text-muted-foreground">Min Level</label>
            <button
              onClick={handleOpenMinModal}
              className="w-full h-[44px] rounded-[10px] bg-[#3B3F51] px-5 text-white text-left hover:bg-[#454a5e] transition-colors"
            >
              {min}
            </button>
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-sm text-muted-foreground">Max Level</label>
            <button
              onClick={handleOpenMaxModal}
              className="w-full h-[44px] rounded-[10px] bg-[#3B3F51] px-5 text-white text-left hover:bg-[#454a5e] transition-colors"
            >
              {max}
            </button>
          </div>
        </div>

        <LevelPickerModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title={editingField === 'min' ? 'Min Level' : 'Max Level'}
          currentValue={editingField === 'min' ? min : max}
          onSelect={handleSelectLevel}
        />
      </>
    );
  }

  // Non-between: show grid of all levels
  const currentValue = typeof value === 'number' ? value : 1;

  return (
    <div className="grid grid-cols-7 gap-2">
      {LEVELS.map((level) => {
        const isSelected = level === currentValue;
        
        return (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={cn(
              "h-[44px] rounded-full text-sm font-medium transition-all duration-200",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-transparent border border-muted-foreground/30 text-white hover:border-primary hover:text-primary"
            )}
          >
            {level}
          </button>
        );
      })}
    </div>
  );
}
