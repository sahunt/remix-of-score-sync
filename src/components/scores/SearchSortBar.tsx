import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/input';

export type SortOption = 'name' | 'difficulty' | 'score' | 'flare' | 'rank';
export type SortDirection = 'asc' | 'desc';

interface SearchSortBarProps {
  onSearchChange: (query: string) => void;
  sortBy: SortOption;
  sortDirection: SortDirection;
  onSortChange: (sort: SortOption, direction: SortDirection) => void;
}

export function SearchSortBar({ onSearchChange, sortBy, sortDirection, onSortChange }: SearchSortBarProps) {
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOpen, setSortOpen] = useState(false);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'name', label: 'Name' },
    { value: 'difficulty', label: 'Difficulty' },
    { value: 'score', label: 'Score' },
    { value: 'flare', label: 'Flare' },
    { value: 'rank', label: 'Rank' },
  ];

  const handleSearchToggle = () => {
    if (searchExpanded) {
      setSearchQuery('');
      onSearchChange('');
    }
    setSearchExpanded(!searchExpanded);
  };

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    onSearchChange(value);
  };

  const handleSortClick = (option: SortOption) => {
    if (sortBy === option) {
      // Toggle direction if same option clicked
      onSortChange(option, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New option, start ascending
      onSortChange(option, 'asc');
    }
    setSortOpen(false);
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {searchExpanded ? (
        <div className="flex-1 flex items-center gap-2">
          <Input
            type="text"
            placeholder="Search songs..."
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="flex-1 h-9"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSearchToggle}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-secondary text-foreground"
            aria-label="Close search"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={handleSearchToggle}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
            aria-label="Search"
          >
            <Icon name="search" size={20} />
          </button>
          
          <div className="relative">
            <button
              type="button"
              onClick={() => setSortOpen(!sortOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
              aria-label="Sort"
            >
              <Icon name="sort_by_alpha" size={20} />
            </button>
            
            {sortOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setSortOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 min-w-[120px] rounded-[10px] bg-card border border-border shadow-lg overflow-hidden">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSortClick(option.value)}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between',
                        sortBy === option.value
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-secondary'
                      )}
                    >
                      <span>{option.label}</span>
                      {sortBy === option.value && (
                        <Icon 
                          name={sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'} 
                          size={16} 
                        />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
