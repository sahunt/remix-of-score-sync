import { cn } from '@/lib/utils';

import eraClassic from '@/assets/eras/era_classic.svg';
import eraWhite from '@/assets/eras/era_white.svg';
import eraGold from '@/assets/eras/era_gold.svg';

export type EraType = 'classic' | 'white' | 'gold';

const eraAssets: Record<EraType, string> = {
  classic: eraClassic,
  white: eraWhite,
  gold: eraGold,
};

// Map era number from DB to era type
function eraNumberToType(era: number | null | undefined): EraType | null {
  if (era === null || era === undefined) return null;
  const mapping: Record<number, EraType> = {
    0: 'classic',
    1: 'white',
    2: 'gold',
  };
  return mapping[era] ?? null;
}

interface EraChipProps {
  era: number | null | undefined;
  className?: string;
}

export function EraChip({ era, className }: EraChipProps) {
  const eraType = eraNumberToType(era);
  
  if (!eraType) return null;
  
  const asset = eraAssets[eraType];

  return (
    <img
      src={asset}
      alt={`${eraType} era`}
      className={cn('h-3.5 w-auto', className)}
    />
  );
}
