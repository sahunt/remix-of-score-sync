# User Profile Page Implementation Plan

## ✅ COMPLETED

Implementation completed on 2026-01-28.

## Overview
Created a new `/profile` route with user settings including display name, 12MS mode toggle, password change, delete all scores, and logout functionality. The DDR username from uploads is stored for reference but only display_name appears in the UI.

## Database Changes

### New Table: `user_profiles` ✅

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

## Implementation Summary

### Files Created
- `src/pages/Profile.tsx` - Profile page with all settings
- `src/hooks/use12MSMode.tsx` - Context for 12MS mode

### Files Modified
- `src/App.tsx` - Added /profile route and TwelveMSModeProvider
- `src/components/home/UserAvatar.tsx` - Added linkToProfile prop
- `src/pages/Home.tsx` - Avatar now links to profile
- `src/components/scores/ScoresHeader.tsx` - Avatar now links to profile
- `src/hooks/useUsername.tsx` - Now fetches from user_profiles
- `src/components/scores/SongCard.tsx` - Applies 12MS transformation
- `supabase/functions/process-upload/index.ts` - Extracts and stores ddr_username

## Features Implemented

| Feature | Status |
|---------|--------|
| Display Name | ✅ Stored in user_profiles, shown everywhere |
| DDR Username | ✅ Captured from uploads, stored but not displayed |
| 12MS Mode | ✅ Context provider, display-only transformation |
| Change Password | ✅ Supabase Auth updateUser |
| Delete All Songs | ✅ DELETE from user_scores with confirmation |
| Log Out | ✅ Supabase signOut, redirect to /auth |
| Avatar Links | ✅ Clickable to profile from Home and Scores |

## 12MS Mode Transformation

| Original Halo | 12MS Display |
|---------------|--------------|
| PFC | MFC |
| FC | GFC |
| GFC | PFC |
| Others | Unchanged |

