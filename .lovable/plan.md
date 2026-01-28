

# User Profile Page Implementation Plan

## Overview
Create a new `/profile` route with user settings including display name, 12MS mode toggle, password change, delete all scores, and logout functionality. The DDR username from uploads will be stored for reference but only display_name appears in the UI.

## Database Changes

### New Table: `user_profiles`

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| display_name | TEXT | Shown throughout UI |
| ddr_username | TEXT | Captured from uploads, reference only |
| twelve_ms_mode | BOOLEAN | 12MS display mode preference |
| created_at | TIMESTAMPTZ | Record creation |
| updated_at | TIMESTAMPTZ | Last modification |

RLS: Users can only read/write their own profile.

## Implementation Steps

### 1. Database Migration
- Create `user_profiles` table with RLS policies
- Add trigger for `updated_at`

### 2. Update Upload Processing
- When processing uploads, upsert `ddr_username` to `user_profiles` if not already set
- File: `supabase/functions/process-upload/index.ts`

### 3. Create 12MS Mode Context
**New file:** `src/hooks/use12MSMode.tsx`

| Original Halo | 12MS Display |
|---------------|--------------|
| PFC | MFC |
| FC | GFC |
| GFC | PFC |
| Others | Unchanged |

### 4. Make Avatars Clickable
**Files to modify:**
- `src/components/home/UserAvatar.tsx` - Add `linkToProfile` prop
- `src/pages/Home.tsx` - Pass linkToProfile
- `src/components/scores/ScoresHeader.tsx` - Pass linkToProfile

### 5. Create Profile Page
**New file:** `src/pages/Profile.tsx`

```text
+------------------------------------------+
|  [Rainbow Header - Same as Scores page]  |
|   Back arrow              Avatar         |
+------------------------------------------+
|  [Dark card with rounded top corners]    |
|                                          |
|  Display Name                            |
|  [Input field] [Save]                    |
|                                          |
|  12MS Mode                               |
|  [Toggle switch] Description text        |
|                                          |
|  Change Password                         |
|  [Current password]                      |
|  [New password]                          |
|  [Confirm password] [Update]             |
|                                          |
|  Danger Zone                             |
|  [Delete All Songs - destructive]        |
|  [Log Out]                               |
+------------------------------------------+
```

### 6. Update useUsername Hook
**File:** `src/hooks/useUsername.tsx`

Change from fetching `username` from `user_scores` to fetching `display_name` from `user_profiles`. Fallback to email prefix if not set.

### 7. Apply 12MS Mode to Halo Displays
**File:** `src/components/scores/SongCard.tsx`
- Use `use12MSMode` context to transform halo at render time

### 8. Add Route
**File:** `src/App.tsx`
- Add `/profile` as protected route

## File Summary

| Action | File |
|--------|------|
| MIGRATE | Create user_profiles table |
| CREATE | `src/pages/Profile.tsx` |
| CREATE | `src/hooks/use12MSMode.tsx` |
| MODIFY | `src/App.tsx` |
| MODIFY | `src/components/home/UserAvatar.tsx` |
| MODIFY | `src/pages/Home.tsx` |
| MODIFY | `src/components/scores/ScoresHeader.tsx` |
| MODIFY | `src/hooks/useUsername.tsx` |
| MODIFY | `src/components/scores/SongCard.tsx` |
| MODIFY | `supabase/functions/process-upload/index.ts` |

## Validation Rules

**Display Name:** 3-30 characters, alphanumeric + spaces + basic punctuation

**Password:** Minimum 8 characters, must match confirmation

## Features

| Feature | Implementation |
|---------|----------------|
| Display Name | Stored in user_profiles, shown everywhere |
| DDR Username | Captured from uploads, stored but not displayed |
| 12MS Mode | Context provider, display-only transformation |
| Change Password | Supabase Auth updateUser |
| Delete All Songs | DELETE from user_scores with confirmation |
| Log Out | Supabase signOut, redirect to /auth |

