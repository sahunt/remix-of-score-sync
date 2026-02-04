import { useState, useEffect, useRef } from 'react';
import { Check, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OffsetChip } from '@/components/ui/OffsetChip';
import { cn } from '@/lib/utils';

interface OffsetInlineEditorProps {
  effectiveOffset: number | null;
  globalOffset: number | null;
  hasCustomOffset: boolean;
  onSave: (offset: number) => Promise<void>;
  onClear: () => Promise<void>;
}

export function OffsetInlineEditor({
  effectiveOffset,
  globalOffset,
  hasCustomOffset,
  onSave,
  onClear,
}: OffsetInlineEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize input when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setInputValue(effectiveOffset?.toString() ?? '');
      // Focus input after animation starts
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isEditing, effectiveOffset]);

  const handleSave = async () => {
    const trimmed = inputValue.trim();
    
    // If empty and has custom, clear it
    if (trimmed === '' && hasCustomOffset) {
      setSaving(true);
      try {
        await onClear();
        setIsEditing(false);
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
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleClear = async () => {
    if (!hasCustomOffset) return;
    setSaving(true);
    try {
      await onClear();
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Display mode
  if (!isEditing) {
    return (
      <OffsetChip
        offset={effectiveOffset}
        isCustom={hasCustomOffset}
        onClick={() => setIsEditing(true)}
        className="cursor-pointer animate-fade-in"
      />
    );
  }

  // Edit mode
  return (
    <div className="animate-fade-in flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="number"
        min={-99}
        max={99}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="0"
        disabled={saving}
        className={cn(
          "w-12 h-6 px-1.5 text-xs text-center rounded border",
          "bg-background border-border text-foreground",
          "focus:outline-none focus:ring-1 focus:ring-ring",
          "disabled:opacity-50"
        )}
      />
      <span className="text-[10px] text-muted-foreground">ms</span>
      
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        onClick={handleSave}
        disabled={saving}
      >
        <Check className="h-3.5 w-3.5 text-primary" />
      </Button>
      
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        onClick={handleCancel}
        disabled={saving}
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
      
      {hasCustomOffset && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={handleClear}
          disabled={saving}
        >
          <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
