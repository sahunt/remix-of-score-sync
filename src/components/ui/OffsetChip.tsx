import * as React from 'react';
import { cn } from '@/lib/utils';
import { formatOffset } from '@/lib/offsetUtils';
interface OffsetChipProps {
  /** User-facing offset value (already converted) */
  offset: number | null;
  /** Whether this is a custom (user-set) offset */
  isCustom?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Displays song judgement offset in a chip format.
 * 
 * Visual states:
 * - Global offset: outline style, muted
 * - Custom offset: filled style, primary
 * - No offset: dashed outline, "Add offset"
 */
export function OffsetChip({
  offset,
  isCustom,
  onClick,
  className
}: OffsetChipProps) {
  const hasOffset = offset !== null;
  const label = hasOffset ? formatOffset(offset) : 'Add offset';
  return <button type="button" onClick={onClick} className={cn("inline-flex items-center justify-center gap-1 px-2 text-[10px] font-semibold transition-colors h-5 rounded-sm",
  // Variant styling
  hasOffset ? isCustom ? 'bg-primary text-primary-foreground' // Custom: filled
  : 'bg-transparent border border-muted-foreground/40 text-muted-foreground' // Global: outline
  : 'bg-transparent border border-dashed border-muted-foreground/40 text-muted-foreground',
  // No data: dashed
  // Interactive
  onClick && 'cursor-pointer hover:opacity-80 active:scale-95', className)}>
      {label}
    </button>;
}