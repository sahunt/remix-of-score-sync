import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface LevelPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  currentValue: number;
  onSelect: (value: number) => void;
}

const LEVELS = Array.from({ length: 19 }, (_, i) => i + 1);

export function LevelPickerModal({
  open,
  onOpenChange,
  title,
  currentValue,
  onSelect,
}: LevelPickerModalProps) {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  const handleSelect = (level: number) => {
    setSelectedLevel(level);
    
    // Quick check animation then dismiss
    setTimeout(() => {
      onSelect(level);
      setSelectedLevel(null);
      onOpenChange(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#3B3F51] border-0 rounded-[20px] max-w-[360px] p-6">
        <DialogHeader className="flex flex-row items-center justify-between pb-4">
          <DialogTitle className="text-lg font-semibold text-white">{title}</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-white hover:text-muted-foreground transition-colors"
          >
            <Icon name="close" size={24} />
          </button>
        </DialogHeader>
        
        <div className="grid grid-cols-5 gap-3">
          {LEVELS.map((level) => {
            const isSelected = level === currentValue;
            const isJustPicked = level === selectedLevel;
            
            return (
              <button
                key={level}
                onClick={() => handleSelect(level)}
                className={cn(
                  "relative h-[56px] rounded-[10px] text-lg font-medium transition-all duration-200",
                  isSelected || isJustPicked
                    ? "bg-primary text-primary-foreground"
                    : "bg-[#262937] text-white hover:bg-[#2f3344]"
                )}
              >
                {isJustPicked ? (
                  <Icon 
                    name="check" 
                    size={24} 
                    className="animate-scale-in" 
                  />
                ) : (
                  level
                )}
              </button>
            );
          })}
        </div>
        
        <Button
          variant="ghost"
          className="w-full h-[52px] mt-4 rounded-[10px] bg-[#262937] text-white hover:bg-[#2f3344]"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
