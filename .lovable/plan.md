

# Offset/Bias Feature - Database Schema

## Feature Overview

This feature allows users to adjust timing offsets for DDR songs based on audio sync data:

1. Store a **master bias value per SONG** (from your static list)
2. Allow users to **override bias per SONG** (optional, personal preference)
3. Allow users to set a **reference song** in their profile to adjust all calculated offsets

## How the Math Works

Based on the finaloffset.telp.gg website:

```text
Final Offset = Target Song Bias - Reference Song Bias

Example:
- Reference song "3y3s" has bias: -0.9ms
- Target song "NGO" has bias: +12.4ms
- Final offset: 12.4 - (-0.9) = 13.3ms early
```

---

## Database Changes

### 1. New Table: `song_bias` (Master Bias Values)

Stores the static bias values per song from your imported list.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `song_id` | bigint | Unique song identifier |
| `eamuse_id` | text | E-Amusement ID for external matching |
| `bias_ms` | numeric(6,2) | Bias value in milliseconds |
| `confidence` | smallint | Optional: confidence percentage (0-100) |
| `created_at` | timestamptz | Record creation time |
| `updated_at` | timestamptz | Last update time |

### 2. New Table: `user_song_offsets` (User Overrides)

Stores user-specific offset overrides per song.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | User identifier |
| `song_id` | bigint | The song being overridden |
| `custom_bias_ms` | numeric(6,2) | User's custom bias value in ms |
| `created_at` | timestamptz | Record creation time |
| `updated_at` | timestamptz | Last update time |

### 3. Modify Table: `user_profiles`

| New Column | Type | Description |
|------------|------|-------------|
| `reference_song_id` | bigint | The song the user considers "on sync" (nullable) |

---

## Schema Diagram

```text
┌─────────────────────────────────┐
│          musicdb                │
│  (existing - chart-level)       │
├─────────────────────────────────┤
│  id (PK)                        │
│  song_id ─────────────┐         │
│  eamuse_id            │         │
│  name                 │         │
│  ...                  │         │
└───────────────────────│─────────┘
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌─────────────────────┐
│  song_bias    │  │ user_profiles │  │ user_song_offsets   │
│  (NEW)        │  │ (MODIFIED)    │  │ (NEW)               │
├───────────────┤  ├───────────────┤  ├─────────────────────┤
│ song_id (UK)  │  │ user_id       │  │ user_id             │
│ eamuse_id     │  │ display_name  │  │ song_id             │
│ bias_ms       │  │ reference_    │  │ custom_bias_ms      │
│ confidence    │  │   song_id     │  │                     │
└───────────────┘  └───────────────┘  └─────────────────────┘
```

---

## SQL Migration

```sql
-- 1. Create song_bias table for master bias values
CREATE TABLE public.song_bias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id BIGINT NOT NULL UNIQUE,
  eamuse_id TEXT,
  bias_ms NUMERIC(6,2) NOT NULL,
  confidence SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on eamuse_id for faster lookups during import
CREATE INDEX idx_song_bias_eamuse_id ON public.song_bias(eamuse_id);

-- Enable RLS but allow all authenticated users to read
ALTER TABLE public.song_bias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read song_bias"
  ON public.song_bias
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Create user_song_offsets table for user overrides
CREATE TABLE public.user_song_offsets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  song_id BIGINT NOT NULL,
  custom_bias_ms NUMERIC(6,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, song_id)
);

-- Enable RLS
ALTER TABLE public.user_song_offsets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own offsets"
  ON public.user_song_offsets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own offsets"
  ON public.user_song_offsets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own offsets"
  ON public.user_song_offsets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own offsets"
  ON public.user_song_offsets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Add reference_song_id to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN reference_song_id BIGINT;

-- 4. Create triggers for updated_at on new tables
CREATE TRIGGER update_song_bias_updated_at
  BEFORE UPDATE ON public.song_bias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_song_offsets_updated_at
  BEFORE UPDATE ON public.user_song_offsets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Data Import Strategy

For the master `song_bias` table, you'll provide a CSV with:
- `eamuse_id` (for matching to musicdb)
- `bias_ms` value
- Optional: `confidence` percentage

An edge function will:
1. Parse the CSV
2. Look up `song_id` from musicdb using `eamuse_id`
3. UPSERT into `song_bias` table with both `song_id` and `eamuse_id`

---

## Summary of Changes

| Change Type | Object | Description |
|-------------|--------|-------------|
| CREATE | `song_bias` table | Master bias values per song (includes eamuse_id) |
| CREATE | `user_song_offsets` table | User override biases per song |
| ALTER | `user_profiles` table | Add `reference_song_id` column |
| CREATE | 1 index | Index on `song_bias.eamuse_id` for fast imports |
| CREATE | 2 triggers | Auto-update `updated_at` timestamps |
| CREATE | 5 RLS policies | Secure access to new tables |

