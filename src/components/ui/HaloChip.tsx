import { cn } from '@/lib/utils';

import haloFc from '@/assets/halos/halo_fc.svg';
import haloGfc from '@/assets/halos/halo_gfc.svg';
import haloLife4 from '@/assets/halos/halo_life4.svg';
import haloMfc from '@/assets/halos/halo_mfc.svg';
import haloPfc from '@/assets/halos/halo_pfc.svg';

export type HaloType = 'fc' | 'gfc' | 'life4' | 'mfc' | 'pfc';

const haloAssets: Record<HaloType, string> = {
  fc: haloFc,
  gfc: haloGfc,
  life4: haloLife4,
  mfc: haloMfc,
  pfc: haloPfc,
};

interface HaloChipProps {
  type: HaloType;
  className?: string;
}

export function HaloChip({ type, className }: HaloChipProps) {
  const asset = haloAssets[type];

  return (
    <img
      src={asset}
      alt={type.toUpperCase()}
      className={cn('h-[14px] w-auto', className)}
    />
  );
}
