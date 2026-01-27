import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/Icon';
import type { SavedFilter } from './filterTypes';

interface ChooseFilterSheetProps {
  filters: SavedFilter[];
  loading: boolean;
  selectedIds: string[];
  onSelectFilter: (id: string) => void;
  onApply: () => void;
  onCreateNew: () => void;
}

export function ChooseFilterSheet({
  filters,
  loading,
  selectedIds,
  onSelectFilter,
  onApply,
  onCreateNew,
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
      <h2 className="text-lg font-semibold text-white">Choose filter</h2>

      {filters.length === 0 ? (
        <div className="py-8 text-center">
          <Icon name="filter_list" size={40} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No saved filters yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => onSelectFilter(filter.id)}
              className="flex w-full items-center gap-3 rounded-[10px] bg-[#3B3F51] p-4 text-left transition-colors hover:bg-[#454A5E]"
            >
              <Checkbox
                checked={selectedIds.includes(filter.id)}
                onCheckedChange={() => onSelectFilter(filter.id)}
                className="pointer-events-none"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{filter.name}</p>
                <p className="text-xs text-muted-foreground">
                  {filter.rules.length} rule{filter.rules.length !== 1 ? 's' : ''} • Match {filter.matchMode}
                </p>
              </div>
              <div className="h-full w-1 rounded-full bg-primary" />
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCreateNew}
        >
          <Icon name="add" size={20} className="mr-2" />
          Create new
        </Button>
        {filters.length > 0 && (
          <Button
            className="flex-1"
            onClick={onApply}
            disabled={selectedIds.length === 0}
          >
            Apply{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
          </Button>
        )}
      </div>
    </div>
  );
}
