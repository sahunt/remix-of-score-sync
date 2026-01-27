import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import type { SavedFilter } from './filterTypes';

interface ChooseFilterSheetProps {
  filters: SavedFilter[];
  loading: boolean;
  selectedIds: string[];
  onSelectFilter: (id: string) => void;
  onApply: () => void;
  onCreateNew: () => void;
  onClose: () => void;
}

export function ChooseFilterSheet({
  filters,
  loading,
  selectedIds,
  onSelectFilter,
  onApply,
  onCreateNew,
  onClose,
}: ChooseFilterSheetProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with close, title, and kebab */}
      <div className="flex items-center justify-between -mx-7 -mt-4 px-5 py-4 border-b border-[#4A4E61]">
        <button
          onClick={onClose}
          className="p-2 text-white hover:text-muted-foreground transition-colors"
          aria-label="Close"
        >
          <Icon name="close" size={24} />
        </button>
        <h2 className="text-lg font-semibold text-white">Filters</h2>
        <button
          className="p-2 text-white hover:text-muted-foreground transition-colors"
          aria-label="More options"
        >
          <Icon name="more_vert" size={24} />
        </button>
      </div>

      {filters.length === 0 ? (
        <div className="py-8 text-center">
          <Icon name="filter_list" size={40} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No saved filters yet</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 pt-2">
          {filters.map((filter) => {
            const isSelected = selectedIds.includes(filter.id);
            return (
              <button
                key={filter.id}
                onClick={() => onSelectFilter(filter.id)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-[#4A4E61] text-white hover:bg-[#555970]'
                )}
              >
                {isSelected && (
                  <Icon name="check_circle" size={20} className="animate-scale-in" />
                )}
                {filter.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Action buttons - Apply first, Create second */}
      <div className="flex gap-3 pt-4">
        <Button
          className="flex-1"
          onClick={onApply}
          disabled={selectedIds.length === 0}
        >
          Apply
        </Button>
        <Button
          className="flex-1"
          onClick={onCreateNew}
          iconRight="add_circle"
        >
          Create
        </Button>
      </div>
    </div>
  );
}
