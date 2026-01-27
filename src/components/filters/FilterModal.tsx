import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerPortal, DrawerOverlay } from '@/components/ui/drawer';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { ChooseFilterSheet } from './ChooseFilterSheet';
import { CreateFilterSheet } from './CreateFilterSheet';
import type { FilterRule, SavedFilter } from './filterTypes';

type ModalView = 'choose' | 'create';

interface FilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters: (filters: SavedFilter[]) => void;
  scores: Array<{
    score: number | null;
    difficulty_level: number | null;
    difficulty_name: string | null;
    rank: string | null;
    halo: string | null;
    flare: number | null;
    musicdb: { name: string | null; artist: string | null } | null;
  }>;
}

export function FilterModal({ 
  open, 
  onOpenChange, 
  onApplyFilters,
  scores 
}: FilterModalProps) {
  const { filters: savedFilters, loading, createFilter } = useSavedFilters();
  const [view, setView] = useState<ModalView>('choose');
  const [selectedFilterIds, setSelectedFilterIds] = useState<string[]>([]);

  // Reset view when modal opens
  useEffect(() => {
    if (open) {
      // If no saved filters, go directly to create
      if (!loading && savedFilters.length === 0) {
        setView('create');
      } else {
        setView('choose');
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
    setView('create');
  };

  const handleSaveFilter = async (
    name: string,
    rules: FilterRule[],
    matchMode: 'all' | 'any'
  ) => {
    const newFilter = await createFilter(name, rules, matchMode);
    if (newFilter) {
      onApplyFilters([newFilter]);
      onOpenChange(false);
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
    if (savedFilters.length > 0) {
      setView('choose');
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerOverlay className="fixed inset-0 bg-black/60" />
        <DrawerContent className="fixed bottom-0 left-0 right-0 mt-24 flex h-auto max-h-[85vh] flex-col rounded-t-[20px] bg-[#3B3F51] outline-none">
          <div className="flex-1 overflow-y-auto px-7 pb-8 pt-4">
            {view === 'choose' ? (
              <ChooseFilterSheet
                filters={savedFilters}
                loading={loading}
                selectedIds={selectedFilterIds}
                onSelectFilter={handleSelectFilter}
                onApply={handleApplySelected}
                onCreateNew={handleCreateNew}
                onClose={() => onOpenChange(false)}
              />
            ) : (
              <CreateFilterSheet
                scores={scores}
                onSave={handleSaveFilter}
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
