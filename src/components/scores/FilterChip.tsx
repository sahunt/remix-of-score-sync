import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';

interface FilterChipProps {
  label: string;
  onRemove?: () => void;
  isAddButton?: boolean;
  onClick?: () => void;
}

export function FilterChip({ label, onRemove, isAddButton = false, onClick }: FilterChipProps) {
  if (isAddButton) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex h-9 items-center gap-2 rounded-full px-4 transition-all',
          'bg-secondary text-foreground hover:bg-secondary/80'
        )}
      >
        <span className="text-sm">{label}</span>
        <Icon name="add" size={16} />
      </button>
    );
  }

  return (
    <div
      className={cn(
        'flex h-9 items-center gap-2 rounded-full px-4',
        'bg-primary text-primary-foreground'
      )}
    >
      <span className="text-sm font-medium">{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:opacity-70 transition-opacity"
          aria-label={`Remove ${label} filter`}
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}
