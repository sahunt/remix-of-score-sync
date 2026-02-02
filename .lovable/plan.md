

# Fix: Persist Search Field Visibility Across Navigation

## Problem

When a search is active on the Scores page and the user navigates away and back:
- The results are correctly filtered by the persisted search query
- BUT the search input is collapsed/hidden
- No visual feedback shows that a search is active

## Root Cause

`SearchSortBar.tsx` manages its own local state that resets on every mount:

```typescript
// Lines 17-18 - these reset to false/empty on navigation
const [searchExpanded, setSearchExpanded] = useState(false);
const [searchQuery, setSearchQuery] = useState('');
```

Meanwhile, `useScoresFilterState` correctly persists the `searchQuery` to localStorage, but `SearchSortBar` never receives it.

## Solution

Make `SearchSortBar` a controlled component:

1. Pass the persisted `searchQuery` value as a prop
2. Derive `searchExpanded` state from whether `searchQuery` has content
3. On mount, if `searchQuery` is non-empty, show the expanded search field

## Changes Required

### File: `src/components/scores/SearchSortBar.tsx`

**Update props interface:**
```typescript
interface SearchSortBarProps {
  searchQuery: string;                    // NEW: Controlled value
  onSearchChange: (query: string) => void;
  sortBy: SortOption;
  sortDirection: SortDirection;
  onSortChange: (sort: SortOption, direction: SortDirection) => void;
}
```

**Update component logic:**
```typescript
export function SearchSortBar({ 
  searchQuery,        // NEW: Receive persisted value
  onSearchChange, 
  sortBy, 
  sortDirection, 
  onSortChange 
}: SearchSortBarProps) {
  // Derive expanded state from whether query has content
  const [searchExpanded, setSearchExpanded] = useState(searchQuery.length > 0);
  const [sortOpen, setSortOpen] = useState(false);

  // Keep expanded state in sync if query changes externally
  useEffect(() => {
    if (searchQuery.length > 0 && !searchExpanded) {
      setSearchExpanded(true);
    }
  }, [searchQuery]);

  const handleSearchToggle = () => {
    if (searchExpanded) {
      onSearchChange('');  // Clear via callback
    }
    setSearchExpanded(!searchExpanded);
  };

  const handleSearchInput = (value: string) => {
    onSearchChange(value);  // Pass to parent, no local state
  };

  // In the JSX, use searchQuery prop instead of local state:
  <Input
    value={searchQuery}  // Was: value={local searchQuery state}
    onChange={(e) => handleSearchInput(e.target.value)}
    // ...
  />
}
```

### File: `src/pages/Scores.tsx`

**Update SearchSortBar usage (around line 389):**
```typescript
<SearchSortBar
  searchQuery={searchQuery}    // NEW: Pass persisted value
  onSearchChange={setSearchQuery}
  sortBy={sortBy}
  sortDirection={sortDirection}
  onSortChange={setSortOptions}
/>
```

## Expected Behavior After Fix

1. User types "butterfly" in search → results filter
2. User navigates to Home page
3. User returns to Scores page
4. Search field is **expanded and shows "butterfly"**
5. Results remain filtered by "butterfly"

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/scores/SearchSortBar.tsx` | Add `searchQuery` prop, derive expanded state from it, use controlled value |
| `src/pages/Scores.tsx` | Pass `searchQuery` to SearchSortBar |

