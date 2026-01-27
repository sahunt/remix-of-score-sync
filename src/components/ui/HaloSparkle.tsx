import { cn } from '@/lib/utils';

export type HaloType = 'fc' | 'gfc' | 'life4' | 'mfc' | 'pfc';

// Map halo types to their colors
const haloColors: Record<HaloType, string> = {
  fc: '#9EBBFF',
  gfc: '#63EAA8',
  life4: '#FF565E',
  mfc: 'url(#mfc-gradient)',
  pfc: '#F9CD67',
};

interface HaloSparkleProps {
  type: HaloType;
  className?: string;
}

export function HaloSparkle({ type, className }: HaloSparkleProps) {
  const color = haloColors[type];
  const isMfc = type === 'mfc';

  return (
    <svg
      width="24"
      height="22"
      viewBox="0 0 13 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('flex-shrink-0', className)}
    >
      {isMfc && (
        <defs>
          <linearGradient id="mfc-gradient" x1="0" y1="0" x2="13" y2="12" gradientUnits="userSpaceOnUse">
            <stop stopColor="#B5EFFF" />
            <stop offset="0.35" stopColor="#FDB8FF" />
            <stop offset="0.73" stopColor="#D4B8FF" />
            <stop offset="1" stopColor="white" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M4.32419 0C4.32419 3.01176 2.53514 5.71877 0 5.71877C2.52712 5.71877 4.32419 8.41681 4.32419 11.4375C4.32419 8.42577 6.11323 5.71877 8.64837 5.71877C6.12125 5.71877 4.32419 3.02073 4.32419 0Z"
        fill={color}
      />
      <path
        d="M10.4135 0C10.4135 1.50588 9.51492 2.85938 8.25537 2.85938C9.52294 2.85938 10.4135 4.21289 10.4135 5.71877C10.4135 4.21289 11.312 2.85938 12.5715 2.85938C11.304 2.85938 10.4135 1.50588 10.4135 0Z"
        fill={color}
      />
      <path
        d="M9.42664 5.71875C9.42664 7.22463 8.5281 8.57813 7.26855 8.57813C8.53613 8.57813 9.42664 9.93164 9.42664 11.4375C9.42664 9.93164 10.3252 8.57813 11.5847 8.57813C10.3171 8.57813 9.42664 7.22463 9.42664 5.71875Z"
        fill={color}
      />
    </svg>
  );
}
