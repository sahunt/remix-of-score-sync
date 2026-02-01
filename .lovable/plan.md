

# Add Filter Edit & Delete Functionality

## UX Analysis & Approach

### The Problem with 4 Buttons
Having Apply, Create, Edit, and Delete buttons would clutter the UI. Your instinct about iOS-style jiggle mode is interesting, but there are some UX gaps:

1. **Discoverability** - New users won't know to long-press
2. **Jiggle mode complexity** - What happens to the Apply/Create buttons? How do you exit jiggle mode?
3. **Mental model mismatch** - iOS jiggle mode works for app icons (delete/rearrange), but filters also need an "edit" action which iOS doesn't have

### Recommended Approach: Contextual Actions via Three-Dot Menu

The three-dot menu (already in the header) is the **ideal place** for edit/delete actions. Here's why:

| Pattern | Pros | Cons |
|---------|------|------|
| **Three-dot menu** | Discoverable, standard pattern, keeps main UI clean | Requires extra tap to access |
| **Jiggle mode** | Playful, familiar from iOS | Hard to discover, complex state management |
| **Swipe-to-reveal** | Quick access | Not discoverable, conflicts with scrolling |
| **Long-press context menu** | iOS-native feeling | Poor discoverability |

### The Proposed UX Flow

```text
User opens "Add filter..." sheet
    ↓
Sees filter list with three-dot menu (⋮) in header
    ↓
Taps ⋮ → sees "Manage Filters" option
    ↓
Taps "Manage Filters" → enters edit mode:
  • Header shows "Done" button instead of ⋮
  • Each filter chip shows ✏️ and 🗑️ icons overlaid
  • Apply/Create buttons hide (replaced by "Done")
    ↓
Tap ✏️ → opens CreateFilterSheet with filter data pre-populated
Tap 🗑️ → shows delete confirmation, removes filter
Tap "Done" → exits edit mode, returns to normal view
```

### Visual Mockup (Edit Mode)

```text
┌─────────────────────────────────────────┐
│ ✕         Manage Filters          Done  │
├─────────────────────────────────────────┤
│ My saved filters                        │
│                                         │
│ ┌───────────────┐  ┌───────────────┐    │
│ │ Level 17+ ✏️🗑️│  │ All PFCs  ✏️🗑️│    │
│ └───────────────┘  └───────────────┘    │
│                                         │
│ ┌───────────────┐                       │
│ │ Gold Era  ✏️🗑️ │                       │
│ └───────────────┘                       │
│                                         │
└─────────────────────────────────────────┘
```

### Why This Works

1. **Discoverable** - Three-dot menu is a universal "more options" pattern
2. **Non-destructive** - Edit mode is explicit, not accidental
3. **Clean main flow** - Apply/Create stay focused on the primary task
4. **Reuses existing UI** - CreateFilterSheet already exists, we just pass the editing filter

---

## Technical Implementation

### 1. Add `editMode` State to ChooseFilterSheet

Track whether we're in edit mode and which filter (if any) is being edited.

```typescript
interface ChooseFilterSheetProps {
  // ... existing props
  onEditFilter: (filter: SavedFilter) => void;  // NEW
  onDeleteFilter: (id: string) => void;         // NEW
}

// Inside component
const [editMode, setEditMode] = useState(false);
```

### 2. Add DropdownMenu to Header

Replace the placeholder three-dot button with an actual menu:

```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className="p-2 ...">
      <Icon name="more_vert" size={24} />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => setEditMode(true)}>
      <Icon name="edit" size={20} className="mr-2" />
      Manage Filters
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 3. Edit Mode UI Changes

When `editMode` is true:
- Header shows "Manage Filters" title and "Done" button (replaces three-dot)
- Filter chips show edit/delete icons
- Apply/Create buttons are hidden
- Selecting a filter doesn't toggle selection (only edit/delete icons work)

```typescript
// In edit mode, each filter chip becomes:
<div className="relative">
  <div className="filter-chip-content">{filter.name}</div>
  <div className="absolute -top-1 -right-1 flex gap-1">
    <button onClick={() => onEditFilter(filter)}>
      <Icon name="edit" size={16} />
    </button>
    <button onClick={() => handleDelete(filter.id)}>
      <Icon name="delete" size={16} />
    </button>
  </div>
</div>
```

### 4. Wire Up Filter Editing in FilterModal

Add new view state `'edit'` to handle editing:

```typescript
type ModalView = 'choose' | 'create' | 'edit';

const [editingFilter, setEditingFilter] = useState<SavedFilter | null>(null);

// When editing, pass the filter to CreateFilterSheet
{view === 'edit' && editingFilter && (
  <CreateFilterSheet
    scores={scores}
    editingFilter={editingFilter}  // NEW prop
    onSave={handleUpdateFilter}
    onShowResults={handleShowResults}
    onBack={() => setView('choose')}
    onCancel={() => onOpenChange(false)}
  />
)}
```

### 5. Extend CreateFilterSheet for Edit Mode

Similar to how we extended it for goals:

```typescript
interface CreateFilterSheetProps {
  // ... existing
  editingFilter?: SavedFilter | null;  // NEW
}

// Initialize form from editingFilter if provided
useEffect(() => {
  if (editingFilter) {
    setFilterName(editingFilter.name);
    setRules(editingFilter.rules);
    setMatchMode(editingFilter.matchMode);
  }
}, [editingFilter]);

// Conditional UI
<h2>{editingFilter ? 'Edit Filter' : 'New Filter'}</h2>
<Button>{editingFilter ? 'Update Filter' : 'Save Filter'}</Button>
```

### 6. Add Delete Confirmation

Use AlertDialog (already used in GoalDetailHeader):

```typescript
const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

<AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
  <AlertDialogContent>
    <AlertDialogTitle>Delete Filter</AlertDialogTitle>
    <AlertDialogDescription>
      Are you sure? This action cannot be undone.
    </AlertDialogDescription>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => handleConfirmDelete()}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/filters/ChooseFilterSheet.tsx` | Add edit mode, three-dot menu with "Manage Filters", edit/delete icons on chips, delete confirmation |
| `src/components/filters/CreateFilterSheet.tsx` | Add `editingFilter` prop, pre-populate form, conditional header/button text |
| `src/components/filters/FilterModal.tsx` | Add `'edit'` view state, pass editing filter to CreateFilterSheet, wire up `updateFilter` |
| `tailwind.config.ts` | (Optional) Add subtle jiggle animation for edit mode polish |

---

## Data Flow

```text
User taps ⋮ → "Manage Filters"
    ↓
editMode = true
    ↓
User taps ✏️ on "Level 17+"
    ↓
view = 'edit', editingFilter = { id: '...', name: 'Level 17+', ... }
    ↓
CreateFilterSheet opens with form pre-populated
    ↓
User modifies rules, taps "Update Filter"
    ↓
updateFilter(id, { name, rules, matchMode }) called
    ↓
onSuccess → view = 'choose', toast "Filter updated!"
```

---

## Alternative: Long-Press to Activate

If you want the iOS-style discoverability boost, we can **add** long-press as a secondary trigger for edit mode (in addition to the menu). This gives power users a shortcut without hiding the main path:

```typescript
// Add long-press handler to filter chips (only in non-edit mode)
<button
  onClick={!editMode ? () => onSelectFilter(filter.id) : undefined}
  onContextMenu={(e) => {
    e.preventDefault();
    setEditMode(true);
  }}
  // ... 
>
```

This way:
- Tap → selects filter (normal behavior)
- Long-press/right-click → enters edit mode (power user shortcut)
- Three-dot menu → enters edit mode (discoverable path)

---

## Testing Checklist

1. Tap three-dot menu → verify "Manage Filters" option appears
2. Tap "Manage Filters" → verify edit mode activates (icons appear, buttons change)
3. Tap edit icon → verify CreateFilterSheet opens with filter data
4. Modify filter name and save → verify toast and filter updates
5. Tap delete icon → verify confirmation dialog appears
6. Confirm delete → verify filter is removed from list
7. Tap "Done" → verify exit from edit mode
8. Create new filter → verify form resets to defaults (not old edit values)

