import { cn } from '@/lib/utils';
import { use12MSMode } from '@/hooks/use12MSMode';

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
  /** Skip 12MS transformation - use for goal badges where the target itself shouldn't change */
  skipTransform?: boolean;
}

export function HaloChip({ type, className, skipTransform = false }: HaloChipProps) {
  const { transformHalo } = use12MSMode();
  
  // Apply 12MS transformation unless skipped (e.g., for goal badges)
  const transformedType = skipTransform ? type : ((transformHalo(type) || type) as HaloType);
  const asset = haloAssets[transformedType];

  return (
    <img
      src={asset}
      alt={transformedType.toUpperCase()}
      className={cn('h-[14px] w-auto', className)}
    />
  );
}
