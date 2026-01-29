import { useState, useEffect, useCallback } from 'react';
import type { SortOption, SortDirection } from '@/components/scores/SearchSortBar';
import type { ActiveFilter } from '@/components/scores/FiltersSection';

const STORAGE_KEY = 'scores-filter-state';

interface ScoresFilterState {
  selectedLevel: number | null;
  activeFilters: ActiveFilter[];
  searchQuery: string;
  sortBy: SortOption;
  sortDirection: SortDirection;
}

const defaultState: ScoresFilterState = {
  selectedLevel: null,
  activeFilters: [],
  searchQuery: '',
  sortBy: 'name',
  sortDirection: 'asc',
};

function loadState(): ScoresFilterState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultState;
    const parsed = JSON.parse(stored);
    return {
      selectedLevel: parsed.selectedLevel ?? null,
      activeFilters: parsed.activeFilters ?? [],
      searchQuery: parsed.searchQuery ?? '',
      sortBy: parsed.sortBy ?? 'name',
      sortDirection: parsed.sortDirection ?? 'asc',
    };
  } catch {
    return defaultState;
  }
}

function saveState(state: ScoresFilterState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save filter state:', e);
  }
}

// Extract levels from filter rules
function extractLevelsFromFilters(filters: ActiveFilter[]): number[] {
  const levels: number[] = [];
  
  for (const af of filters) {
    for (const rule of af.filter.rules) {
      if (rule.type === 'level') {
        const value = rule.value;
        if (Array.isArray(value)) {
          // Multi-select or range
          levels.push(...value.filter(v => typeof v === 'number'));
        } else if (typeof value === 'number') {
          levels.push(value);
        }
      }
    }
  }
  
  return [...new Set(levels)];
}

export function useScoresFilterState() {
  const [state, setState] = useState<ScoresFilterState>(loadState);

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Compute levels from active filters (for rating grid sync)
  const levelsFromFilters = extractLevelsFromFilters(state.activeFilters);

  const setSelectedLevel = useCallback((level: number | null) => {
    setState(prev => ({ ...prev, selectedLevel: level }));
  }, []);

  const setActiveFilters = useCallback((filters: ActiveFilter[] | ((prev: ActiveFilter[]) => ActiveFilter[])) => {
    setState(prev => ({
      ...prev,
      activeFilters: typeof filters === 'function' ? filters(prev.activeFilters) : filters,
    }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const setSortBy = useCallback((sort: SortOption) => {
    setState(prev => ({ ...prev, sortBy: sort }));
  }, []);

  const setSortDirection = useCallback((direction: SortDirection) => {
    setState(prev => ({ ...prev, sortDirection: direction }));
  }, []);

  const setSortOptions = useCallback((sort: SortOption, direction: SortDirection) => {
    setState(prev => ({ ...prev, sortBy: sort, sortDirection: direction }));
  }, []);

  return {
    selectedLevel: state.selectedLevel,
    activeFilters: state.activeFilters,
    searchQuery: state.searchQuery,
    sortBy: state.sortBy,
    sortDirection: state.sortDirection,
    levelsFromFilters,
    setSelectedLevel,
    setActiveFilters,
    setSearchQuery,
    setSortBy,
    setSortDirection,
    setSortOptions,
  };
}
