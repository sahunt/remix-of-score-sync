import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerPortal, DrawerOverlay } from '@/components/ui/drawer';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { ChooseFilterSheet } from './ChooseFilterSheet';
import { CreateFilterSheet } from './CreateFilterSheet';
import { toast } from 'sonner';
import type { FilterRule, SavedFilter } from './filterTypes';
import type { ScoreForFiltering } from '@/types/scores';

type ModalView = 'choose' | 'create' | 'edit';

interface FilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters: (filters: SavedFilter[]) => void;
  scores: ScoreForFiltering[];
}

export function FilterModal({ 
  open, 
  onOpenChange, 
  onApplyFilters,
  scores 
}: FilterModalProps) {
  const { filters: savedFilters, loading, createFilter, updateFilter, deleteFilter } = useSavedFilters();
  const [view, setView] = useState<ModalView>('choose');
  const [selectedFilterIds, setSelectedFilterIds] = useState<string[]>([]);
  const [editingFilter, setEditingFilter] = useState<SavedFilter | null>(null);

  // Reset view when modal opens
  useEffect(() => {
    if (open) {
      // If no saved filters, go directly to create
      if (!loading && savedFilters.length === 0) {
        setView('create');
        setEditingFilter(null);
      } else {
        setView('choose');
        setEditingFilter(null);
      }
      setSelectedFilterIds([]);
    }
  }, [open, loading, savedFilters.length]);

  const handleSelectFilter = (id: string) => {
    setSelectedFilterIds(prev => 
      prev.includes(id) 
        ? prev.filter(fid => fid !== id)
        : [...prev, id]
    );
  };

  const handleApplySelected = () => {
    const selected = savedFilters.filter(f => selectedFilterIds.includes(f.id));
    onApplyFilters(selected);
    onOpenChange(false);
  };

  const handleCreateNew = () => {
    setEditingFilter(null);
    setView('create');
  };

  const handleEditFilter = (filter: SavedFilter) => {
    setEditingFilter(filter);
    setView('edit');
  };

  const handleDeleteFilter = async (id: string) => {
    const success = await deleteFilter(id);
    if (success) {
      toast.success('Filter deleted');
      // Remove from selected if it was selected
      setSelectedFilterIds(prev => prev.filter(fid => fid !== id));
    }
  };

  const handleSaveFilter = async (
    name: string,
    rules: FilterRule[],
    matchMode: 'all' | 'any'
  ) => {
    const newFilter = await createFilter(name, rules, matchMode);
    if (newFilter) {
      toast.success('Filter saved');
      onApplyFilters([newFilter]);
      onOpenChange(false);
    }
  };

  const handleUpdateFilter = async (
    name: string,
    rules: FilterRule[],
    matchMode: 'all' | 'any'
  ) => {
    if (!editingFilter) return;
    
    const success = await updateFilter(editingFilter.id, { name, rules, matchMode });
    if (success) {
      toast.success('Filter updated');
      setView('choose');
      setEditingFilter(null);
    }
  };

  const handleShowResults = (rules: FilterRule[], matchMode: 'all' | 'any') => {
    // Create a temporary filter object to apply
    const tempFilter: SavedFilter = {
      id: 'temp',
      user_id: '',
      name: 'Temp Filter',
      rules,
      matchMode,
      created_at: new Date().toISOString(),
    };
    onApplyFilters([tempFilter]);
    onOpenChange(false);
  };

  const handleBack = () => {
    if (view === 'edit') {
      setView('choose');
      setEditingFilter(null);
    } else if (savedFilters.length > 0) {
      setView('choose');
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerOverlay className="fixed inset-0 bg-black/60" />
        <DrawerContent hideHandle className="fixed bottom-0 left-0 right-0 mt-24 flex h-auto max-h-[85vh] flex-col rounded-t-[20px] bg-[#3B3F51] border-0 outline-none">
          <div className="flex-1 overflow-y-auto px-7 pb-8 pt-4">
            {view === 'choose' ? (
              <ChooseFilterSheet
                filters={savedFilters}
                loading={loading}
                selectedIds={selectedFilterIds}
                onSelectFilter={handleSelectFilter}
                onApply={handleApplySelected}
                onCreateNew={handleCreateNew}
                onEditFilter={handleEditFilter}
                onDeleteFilter={handleDeleteFilter}
                onClose={() => onOpenChange(false)}
              />
            ) : (
              <CreateFilterSheet
                scores={scores}
                editingFilter={view === 'edit' ? editingFilter : null}
                onSave={view === 'edit' ? handleUpdateFilter : handleSaveFilter}
                onShowResults={handleShowResults}
                onBack={handleBack}
                onCancel={() => onOpenChange(false)}
              />
            )}
          </div>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}
