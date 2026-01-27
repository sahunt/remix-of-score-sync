import { FilterChip } from './FilterChip';

export interface Filter {
  id: string;
  label: string;
}

interface FiltersSectionProps {
  filters: Filter[];
  onRemoveFilter: (id: string) => void;
  onAddFilter: () => void;
}

export function FiltersSection({ filters, onRemoveFilter, onAddFilter }: FiltersSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-foreground">My filters</h2>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <FilterChip
            key={filter.id}
            label={filter.label}
            onRemove={() => onRemoveFilter(filter.id)}
          />
        ))}
        <FilterChip
          label="Add filter..."
          isAddButton
          onClick={onAddFilter}
        />
      </div>
    </section>
  );
}
