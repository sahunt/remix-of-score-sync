import { useState } from 'react';
import { FilterChip } from './FilterChip';
import { FilterModal } from '@/components/filters/FilterModal';
import type { SavedFilter } from '@/components/filters/filterTypes';
import type { ScoreForFiltering } from '@/types/scores';

export interface ActiveFilter {
  id: string;
  label: string;
  filter: SavedFilter;
}

interface FiltersSectionProps {
  activeFilters: ActiveFilter[];
  onRemoveFilter: (id: string) => void;
  onApplyFilters: (filters: SavedFilter[]) => void;
  scores: ScoreForFiltering[];
}

export function FiltersSection({ 
  activeFilters, 
  onRemoveFilter, 
  onApplyFilters,
  scores 
}: FiltersSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section className="space-y-3">
      <h2 className="text-[14px] font-semibold text-white">My filters</h2>
      <div className="flex flex-wrap gap-2">
        {activeFilters.map((filter) => (
          <FilterChip
            key={filter.id}
            label={filter.label}
            onRemove={() => onRemoveFilter(filter.id)}
          />
        ))}
        <FilterChip
          label="Add filter..."
          isAddButton
          onClick={() => setModalOpen(true)}
        />
      </div>

      <FilterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onApplyFilters={onApplyFilters}
        scores={scores}
      />
    </section>
  );
}
