import { cn } from '@/lib/utils';

import flareEx from '@/assets/flares/flare_ex.png';
import flareI from '@/assets/flares/flare_i.png';
import flareII from '@/assets/flares/flare_ii.png';
import flareIII from '@/assets/flares/flare_iii.png';
import flareIV from '@/assets/flares/flare_iv.png';
import flareV from '@/assets/flares/flare_v.png';
import flareVI from '@/assets/flares/flare_vi.png';
import flareVII from '@/assets/flares/flare_vii.png';
import flareVIII from '@/assets/flares/flare_viii.png';
import flareIX from '@/assets/flares/flare_ix.png';

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
