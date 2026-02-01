/**
 * Canonical type definitions for score data used across the application.
 * This is the SINGLE SOURCE OF TRUTH for score interfaces.
 * 
 * All score-related hooks and components should import from here
 * to ensure type consistency across Home, Scores, and Goal pages.
 */

/**
 * Core score data with associated song/chart information.
 * Used for filtering, display, and goal progress calculations.
 */
export interface ScoreWithSong {
  id: string;
  score: number | null;
  timestamp?: string | null;
  playstyle: string | null;
  difficulty_name: string | null;
  difficulty_level: number | null;
  rank: string | null;
  flare: number | null;
  halo: string | null;
  source_type?: string | null;
  musicdb_id?: number | null;
  // musicdb is optional because unplayed charts from musicdb don't have this relation
  musicdb?: {
    name: string | null;
    artist: string | null;
    eamuse_id: string | null;
    song_id: number | null;
    name_romanized?: string | null;
    era: number | null;
    deleted?: boolean | null;
  } | null;
  // For unplayed charts (from musicdb) - flattened fields
  name?: string | null;
  artist?: string | null;
  eamuse_id?: string | null;
  song_id?: number | null;
  era?: number | null;
  isUnplayed?: boolean;
}

/**
 * Minimal score data interface for filter matching.
 * Used when we only need filtering fields without full song data.
 */
export interface ScoreForFiltering {
  score: number | null;
  difficulty_level: number | null;
  difficulty_name: string | null;
  rank: string | null;
  halo: string | null;
  flare: number | null;
  musicdb?: {
    name: string | null;
    artist: string | null;
    eamuse_id?: string | null;
    song_id?: number | null;
    era?: number | null;
  } | null;
}

/**
 * Display-optimized score for the Scores page song list.
 * Flattens musicdb fields for easier rendering.
 */
export interface DisplaySong {
  id: string;
  score: number | null;
  rank: string | null;
  flare: number | null;
  halo: string | null;
  difficulty_level: number | null;
  difficulty_name: string | null;
  name: string | null;
  artist: string | null;
  eamuse_id: string | null;
  song_id: number | null;
  name_romanized: string | null;
  era: number | null;
  isNoPlay: boolean;
}

/**
 * Chart info from musicdb (without user score data).
 * Used for identifying unplayed charts.
 */
export interface ChartInfo {
  id: number;
  name: string | null;
  artist: string | null;
  difficulty_level: number | null;
  difficulty_name: string | null;
  playstyle: string | null;
  song_id?: number | null;
  eamuse_id?: string | null;
  era?: number | null;
}

/**
 * Preloaded chart data for the song detail modal.
 * Combines chart info with user's score for instant modal rendering.
 */
export interface PreloadedChart {
  id: number;
  difficulty_name: string;
  difficulty_level: number;
  score: number | null;
  rank: string | null;
  flare: number | null;
  halo: string | null;
  source_type: string | null;
}

/**
 * MusicDB chart row structure from Supabase query.
 */
export interface MusicDbChart {
  id: number;
  song_id: number;
  name: string | null;
  artist: string | null;
  eamuse_id: string | null;
  difficulty_name: string | null;
  difficulty_level: number | null;
  playstyle: string | null;
  name_romanized: string | null;
  era: number | null;
}
