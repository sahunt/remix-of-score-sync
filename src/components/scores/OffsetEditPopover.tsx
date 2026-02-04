import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatOffset } from '@/lib/offsetUtils';

interface OffsetEditPopoverProps {
  /** Trigger element (the chip) */
  children: React.ReactNode;
  /** Current effective offset */
  effectiveOffset: number | null;
  /** Global offset (from song_bias) */
  globalOffset: number | null;
  /** Whether user has a custom offset */
  hasCustomOffset: boolean;
  /** Save handler */
  onSave: (offset: number) => Promise<void>;
  /** Clear handler (delete custom, revert to global) */
  onClear: () => Promise<void>;
  /** Open state control */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function OffsetEditPopover({
  children,
  effectiveOffset,
  globalOffset,
  hasCustomOffset,
  onSave,
  onClear,
  open,
  onOpenChange,
}: OffsetEditPopoverProps) {
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize input when popover opens
  useEffect(() => {
    if (open) {
      setInputValue(effectiveOffset?.toString() ?? '');
    }
  }, [open, effectiveOffset]);

  const handleSave = async () => {
    const trimmed = inputValue.trim();
    
    // If empty and has custom, clear it
    if (trimmed === '' && hasCustomOffset) {
      setSaving(true);
      try {
        await onClear();
        onOpenChange?.(false);
      } finally {
        setSaving(false);
      }
      return;
    }

    // Parse and validate
    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed) || parsed < -99 || parsed > 99) {
      return; // Invalid input, do nothing
    }

    setSaving(true);
    try {
      await onSave(parsed);
      onOpenChange?.(false);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!hasCustomOffset) return;
    setSaving(true);
    try {
      await onClear();
      onOpenChange?.(false);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-56 p-3 z-[100]" align="center" sideOffset={8}>
        <div className="space-y-3">
          {/* Header */}
          <div className="text-sm font-medium text-foreground">
            Set Offset
          </div>

          {/* Global reference */}
          {globalOffset !== null && (
            <div className="text-xs text-muted-foreground">
              Default: {formatOffset(globalOffset)}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={-99}
              max={99}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. -6"
              className="h-8 text-sm"
              disabled={saving}
            />
            <span className="text-xs text-muted-foreground">ms</span>
          </div>

          {/* Help text */}
          <p className="text-[10px] text-muted-foreground">
            Range: -99 to +99. Clear to use default.
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8"
              onClick={() => onOpenChange?.(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            {hasCustomOffset && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-destructive hover:text-destructive"
                onClick={handleClear}
                disabled={saving}
              >
                Reset
              </Button>
            )}
            <Button
              size="sm"
              className="flex-1 h-8"
              onClick={handleSave}
              disabled={saving}
            >
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
