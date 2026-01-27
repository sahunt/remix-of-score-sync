import { cn } from '@/lib/utils';

interface RuleConnectorChipProps {
  mode: 'all' | 'any';
  className?: string;
}

export function RuleConnectorChip({ mode, className }: RuleConnectorChipProps) {
  return (
    <div className={cn('flex justify-center py-1', className)}>
      <span className="inline-flex items-center justify-center h-[20px] px-3 rounded-[4px] bg-primary text-[11px] font-semibold uppercase text-primary-foreground">
        {mode === 'all' ? 'and' : 'or'}
      </span>
    </div>
  );
}
