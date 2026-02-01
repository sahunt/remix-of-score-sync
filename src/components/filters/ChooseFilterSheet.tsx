import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { SavedFilter } from './filterTypes';

interface ChooseFilterSheetProps {
  filters: SavedFilter[];
  loading: boolean;
  selectedIds: string[];
  onSelectFilter: (id: string) => void;
  onApply: () => void;
  onCreateNew: () => void;
  onEditFilter: (filter: SavedFilter) => void;
  onDeleteFilter: (id: string) => void;
  onClose: () => void;
}

export function ChooseFilterSheet({
  filters,
  loading,
  selectedIds,
  onSelectFilter,
  onApply,
  onCreateNew,
  onEditFilter,
  onDeleteFilter,
  onClose,
}: ChooseFilterSheetProps) {
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteFilter(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const filterToDelete = filters.find((f) => f.id === deleteConfirmId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with close, title, and menu/done */}
      <div className="flex items-center justify-between -mx-7 -mt-4 px-5 py-4 border-b border-[#4A4E61]">
        <button
          onClick={onClose}
          className="p-2 text-white hover:text-muted-foreground transition-colors"
          aria-label="Close"
        >
          <Icon name="close" size={24} />
        </button>
        <h2 className="text-lg font-semibold text-white">
          {editMode ? 'Manage Filters' : 'Filters'}
        </h2>
        {editMode ? (
          <button
            onClick={() => setEditMode(false)}
            className="p-2 text-primary font-medium text-sm hover:text-primary/80 transition-colors"
          >
            Done
          </button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 text-white hover:text-muted-foreground transition-colors"
                aria-label="More options"
              >
                <Icon name="more_vert" size={24} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#3B3F51] border-[#4A4E61]">
              <DropdownMenuItem
                onClick={() => setEditMode(true)}
                disabled={filters.length === 0}
                className="text-white focus:bg-[#4A4E61] focus:text-white"
              >
                <Icon name="edit" size={20} className="mr-2" />
                Manage Filters
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {filters.length === 0 ? (
        <div className="py-8 text-center">
          <Icon name="filter_list" size={40} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No saved filters yet</p>
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          <h3 className="text-[14px] font-semibold text-white">My saved filters</h3>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const isSelected = selectedIds.includes(filter.id);

              if (editMode) {
                // Edit mode: show chip with edit/delete icons
                return (
                  <div
                    key={filter.id}
                    className="flex items-center gap-1 rounded-[10px] bg-[#4A4E61] pl-4 pr-2 py-2.5 text-sm font-medium text-white"
                  >
                    <span>{filter.name}</span>
                    <button
                      onClick={() => onEditFilter(filter)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      aria-label={`Edit ${filter.name}`}
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(filter.id)}
                      className="p-1 hover:bg-destructive/20 rounded transition-colors text-destructive"
                      aria-label={`Delete ${filter.name}`}
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                );
              }

              // Normal mode: selectable chip
              return (
                <button
                  key={filter.id}
                  onClick={() => onSelectFilter(filter.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-medium transition-all',
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
        </div>
      )}

      {/* Action buttons - only show when not in edit mode */}
      {!editMode && (
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
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-[#3B3F51] border-[#4A4E61]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Filter</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete "{filterToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#4A4E61] text-white border-0 hover:bg-[#555970]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
