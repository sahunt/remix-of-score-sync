import { cn } from '@/lib/utils';

import flareEx from '@/assets/flares/flare_ex.svg';
import flareI from '@/assets/flares/flare_i.svg';
import flareII from '@/assets/flares/flare_ii.svg';
import flareIII from '@/assets/flares/flare_iii.svg';
import flareIV from '@/assets/flares/flare_iv.svg';
import flareV from '@/assets/flares/flare_v.svg';
import flareVI from '@/assets/flares/flare_vi.svg';
import flareVII from '@/assets/flares/flare_vii.svg';
import flareVIII from '@/assets/flares/flare_viii.svg';
import flareIX from '@/assets/flares/flare_ix.svg';

export type FlareType = 'ex' | 'i' | 'ii' | 'iii' | 'iv' | 'v' | 'vi' | 'vii' | 'viii' | 'ix';

const flareAssets: Record<FlareType, string> = {
  ex: flareEx,
  i: flareI,
  ii: flareII,
  iii: flareIII,
  iv: flareIV,
  v: flareV,
  vi: flareVI,
  vii: flareVII,
  viii: flareVIII,
  ix: flareIX,
};

interface FlareChipProps {
  type: FlareType;
  className?: string;
}

export function FlareChip({ type, className }: FlareChipProps) {
  const asset = flareAssets[type];

  return (
    <img
      src={asset}
      alt={`Flare ${type.toUpperCase()}`}
      className={cn('h-4 w-auto', className)}
    />
  );
}
