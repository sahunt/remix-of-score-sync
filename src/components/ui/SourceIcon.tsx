import { cn } from '@/lib/utils';

import sanbaiIcon from '@/assets/sources/sanbai.svg';
import phaseiiIcon from '@/assets/sources/phaseii.svg';

export type SourceType = 'sanbai' | 'phaseii' | 'manual' | 'unknown';

const sourceAssets: Partial<Record<SourceType, string>> = {
  sanbai: sanbaiIcon,
  phaseii: phaseiiIcon,
};

interface SourceIconProps {
  source: string | null;
  className?: string;
}

/**
 * Displays a source indicator icon for score uploads.
 * Currently supports: sanbai, phaseii
 * Returns null for manual, unknown, or unsupported sources.
 */
export function SourceIcon({ source, className }: SourceIconProps) {
  if (!source) return null;
  
  const normalized = source.toLowerCase() as SourceType;
  const asset = sourceAssets[normalized];
  
  // Don't render anything for unsupported sources
  if (!asset) return null;

  return (
    <img
      src={asset}
      alt={`${normalized} source`}
      className={cn('h-4 w-4', className)}
    />
  );
}
