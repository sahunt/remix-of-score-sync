import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// ============================================================================
// Types
// ============================================================================

interface UnmatchedSong {
  name: string | null;
  difficulty: string | null;
  reason: string;
}

interface ParseResult {
  scores: ScoreRecord[];
  sourceType: 'phaseii' | 'sanbai' | 'unknown';
  unmatchedSongs: UnmatchedSong[];
}

interface ScoreRecord {
  musicdb_id: number | null;
  chart_id: number | null;
  song_id: number;
  playstyle: string;
  difficulty_name: string;
  difficulty_level: number;
  score: number | null;
  timestamp: string | null;
  username: string | null;
  rank: string | null;
  flare: number | null;
  halo: string | null;
  source_type: string;
}

interface MusicdbMatch {
  id: number;
  song_id: number;
  chart_id: number | null;
}

interface ExistingScore {
  id: string;
  musicdb_id: number;
  score: number | null;
  rank: string | null;
  flare: number | null;
  halo: string | null;
}

// ============================================================================
// Ranking Helpers - Used to determine "better" values
// ============================================================================

// Halo ranking: clear < life4 < fc < gfc < pfc < mfc
const HALO_RANK: Record<string, number> = {
  'clear': 1,
  'life4': 2,
  'fc': 3,
  'gfc': 4,
  'pfc': 5,
  'mfc': 6,
};

// Rank/Grade ranking: E < D < C < B < A < AA < AAA
const GRADE_RANK: Record<string, number> = {
  'E': 1,
  'D': 2,
  'D+': 3,
  'C-': 4,
  'C': 5,
  'C+': 6,
  'B-': 7,
  'B': 8,
  'B+': 9,
  'A-': 10,
  'A': 11,
  'A+': 12,
  'AA-': 13,
  'AA': 14,
  'AA+': 15,
  'AAA': 16,
};

function getHaloRank(halo: string | null): number {
  if (!halo) return 0;
  return HALO_RANK[halo.toLowerCase()] ?? 0;
}

function getGradeRank(rank: string | null): number {
  if (!rank) return 0;
  return GRADE_RANK[rank.toUpperCase()] ?? 0;
}

function getBetterHalo(a: string | null, b: string | null): string | null {
  return getHaloRank(a) >= getHaloRank(b) ? a : b;
}

function getBetterRank(a: string | null, b: string | null): string | null {
  return getGradeRank(a) >= getGradeRank(b) ? a : b;
}

function getBetterFlare(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

function getBetterScore(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

// ============================================================================
// JSON Sanitization - Handle malformed JSON with control characters & bad Unicode
// ============================================================================

function sanitizeJsonString(content: string): string {
  // Step 1: Remove BOM if present
  let sanitized = content.replace(/^\uFEFF/, '');
  
  // Step 2: Remove ALL control characters (0x00-0x1F except tab/newline/carriage return)
  // This handles characters like 0x05 (ENQ) that appear in PhaseII exports
  const cleanedChars: string[] = [];
  for (let i = 0; i < sanitized.length; i++) {
    const code = sanitized.charCodeAt(i);
    // Skip control characters except tab (9), newline (10), carriage return (13)
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      continue; // Skip this character entirely
    }
    // Also skip DEL character (127) and other problematic characters
    if (code === 127) {
      continue;
    }
    cleanedChars.push(sanitized[i]);
  }
  sanitized = cleanedChars.join('');
  
  console.log(`Sanitization removed ${content.length - sanitized.length} control characters`);
  
  // Step 3: Process character by character to handle strings properly
  const chars: string[] = [];
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i];
    const code = sanitized.charCodeAt(i);
    
    if (escaped) {
      // Handle specific escape sequences
      if (char === 'n' || char === 'r' || char === 't' || char === '"' || 
          char === '\\' || char === '/' || char === 'b' || char === 'f') {
        chars.push(char);
      } else if (char === 'u') {
        // Unicode escape - pass through and grab next 4 chars
        chars.push(char);
        const unicode = sanitized.substring(i + 1, i + 5);
        if (/^[0-9a-fA-F]{4}$/.test(unicode)) {
          chars.push(unicode);
          i += 4;
        }
      } else {
        // Invalid escape - just keep the character without backslash
        chars.push(char);
      }
      escaped = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      chars.push(char);
      escaped = true;
      continue;
    }
    
    if (char === '"' && !escaped) {
      inString = !inString;
      chars.push(char);
      continue;
    }
    
    if (inString) {
      // Inside string: escape control characters
      if (code < 32) {
        if (code === 9) {
          chars.push('\\t');
        } else if (code === 10) {
          chars.push('\\n');
        } else if (code === 13) {
          chars.push('\\r');
        }
        // Skip other control characters
        continue;
      }
      
      // Handle high surrogate without low surrogate (broken UTF-16)
      if (code >= 0xD800 && code <= 0xDBFF) {
        const nextCode = sanitized.charCodeAt(i + 1);
        if (nextCode < 0xDC00 || nextCode > 0xDFFF) {
          // Broken surrogate pair - replace with replacement character
          chars.push('\uFFFD');
          continue;
        }
      }
      // Handle lone low surrogate
      if (code >= 0xDC00 && code <= 0xDFFF) {
        const prevCode = sanitized.charCodeAt(i - 1);
        if (prevCode < 0xD800 || prevCode > 0xDBFF) {
          chars.push('\uFFFD');
          continue;
        }
      }
      
      chars.push(char);
    } else {
      // Outside string: skip control characters except whitespace
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
        continue;
      }
      chars.push(char);
    }
  }
  
  return chars.join('');
}

// More aggressive sanitization that handles totally corrupted files
function aggressiveSanitizeJson(content: string): string {
  // First try normal sanitization
  let sanitized = sanitizeJsonString(content);
  
  // If that doesn't work, try more aggressive fixes
  // Remove any character sequences that aren't valid JSON
  sanitized = sanitized
    // Fix unescaped quotes in strings (common issue)
    .replace(/([^\\])"([^:,\[\]{}]*)"([^:,\[\]{}]*?)"/g, '$1"$2\\"$3"')
    // Remove any remaining null bytes
    .replace(/\0/g, '')
    // Replace sequences of weird characters with placeholder
    .replace(/[\u0080-\u009F]/g, '');
    
  return sanitized;
}

// ============================================================================
// Source Detection
// ============================================================================
// Source Type Detection
// IMPORTANT: Sanbai exports can be EITHER CSV (comma-separated) OR TSV (tab-separated)!
// DO NOT assume only TSV format - the user's actual exports use CSV format.
// ============================================================================

function detectSourceType(content: string): 'phaseii' | 'sanbai' | 'unknown' {
  const trimmed = content.trim();
  
  const firstLine = trimmed.split('\n')[0];
  // Sanbai can be TSV (tab-separated) or CSV (comma-separated)
  if (firstLine.includes('Song ID') && (firstLine.includes('\t') || firstLine.includes(','))) {
    return 'sanbai';
  }
  
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const sanitized = sanitizeJsonString(trimmed);
      const parsed = JSON.parse(sanitized);
      
      if (Array.isArray(parsed)) {
        console.log(`JSON array with ${parsed.length} items`);
        if (parsed.length > 0) {
          console.log('First item keys:', Object.keys(parsed[0] || {}));
          const first = parsed[0];
          if (first?.song || first?.chart || first?.score !== undefined || 
              first?.points !== undefined || first?.difficulty || first?.lamp ||
              first?.flareRank !== undefined || first?.flareSkill !== undefined) {
            return 'phaseii';
          }
        }
      } else if (typeof parsed === 'object') {
        console.log('JSON object keys:', Object.keys(parsed));
        if (parsed.headers && parsed.data) return 'phaseii';
        if (parsed.scores && Array.isArray(parsed.scores)) return 'phaseii';
        if (parsed.data && Array.isArray(parsed.data)) return 'phaseii';
      }
      
      return 'phaseii';
    } catch (err) {
      console.error('JSON parse error in detection:', err);
      return 'phaseii';
    }
  }
  
  return 'unknown';
}

// ============================================================================
// PhaseII Parser
// ============================================================================

function parsePhaseIIChart(chart: string): { playstyle: string; difficulty_name: string; difficulty_level: number } | null {
  const match = chart.match(/^(SP|DP)\s+(\w+)\s*-\s*(\d+)$/);
  if (!match) return null;
  return {
    playstyle: match[1],
    difficulty_name: match[2].toUpperCase(),
    difficulty_level: parseInt(match[3])
  };
}

function normalizePhaseIIHalo(halo: string | null | undefined): string | null {
  if (!halo) return null;
  const map: Record<string, string> = {
    'MARVELOUS FULL COMBO': 'mfc',
    'PERFECT FULL COMBO': 'pfc',
    'GREAT FULL COMBO': 'gfc',
    'GOOD FULL COMBO': 'fc',
  };
  return map[halo.toUpperCase()] || 'clear';
}

function parsePhaseIIScore(points: string | number | null | undefined): number | null {
  if (points === null || points === undefined) return null;
  if (typeof points === 'number') return points;
  return parseInt(points.replace(/,/g, '')) || null;
}

// ============================================================================
// Sanbai Parser
// ============================================================================

function parseSanbaiDifficulty(code: string): { playstyle: string; difficulty_name: string } | null {
  const playstyle = code.endsWith('DP') ? 'DP' : 'SP';
  const diffChar = code[0];
  const diffMap: Record<string, string> = {
    'b': 'BEGINNER',
    'B': 'BASIC',
    'D': 'DIFFICULT',
    'E': 'EXPERT',
    'C': 'CHALLENGE'
  };
  const difficulty_name = diffMap[diffChar];
  if (!difficulty_name) return null;
  return { playstyle, difficulty_name };
}

function normalizeSanbaiLamp(lamp: string | null | undefined): string | null {
  if (!lamp) return null;
  const normalized = lamp.toLowerCase().trim();
  if (['mfc', 'pfc', 'gfc', 'fc', 'clear', 'fail', 'life4'].includes(normalized)) {
    return normalized;
  }
  if (normalized.includes('life')) return 'life4';
  return 'clear';
}

function parseSanbaiFlare(flare: string | null | undefined): number | null {
  if (!flare) return null;
  const romanMap: Record<string, number> = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
    'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
    'EX': 10
  };
  const upper = flare.toUpperCase().trim();
  return romanMap[upper] ?? null;
}

// ============================================================================
// Sanbai Name Normalization - Handle formatting differences between sources
// ============================================================================

/**
 * Normalize song names for matching:
 * - Convert escaped double-quotes "" to single "
 * - Normalize full-width vs ASCII punctuation (！→!, ？→?, ×→x, etc.)
 * - Remove spaces before parentheses: "Name (Suffix)" -> "Name(Suffix)"
 * - Normalize whitespace around punctuation marks
 * - Trim whitespace
 */
function normalizeSanbaiName(name: string): string {
  return name
    // Convert escaped double-quotes to single quotes
    .replace(/""/g, '"')
    // Normalize full-width punctuation to ASCII equivalents
    .replace(/！/g, '!')       // Full-width exclamation mark
    .replace(/？/g, '?')       // Full-width question mark
    .replace(/：/g, ':')       // Full-width colon
    .replace(/；/g, ';')       // Full-width semicolon
    .replace(/（/g, '(')       // Full-width left parenthesis
    .replace(/）/g, ')')       // Full-width right parenthesis
    .replace(/［/g, '[')       // Full-width left bracket
    .replace(/］/g, ']')       // Full-width right bracket
    .replace(/＊/g, '*')       // Full-width asterisk
    .replace(/×/g, 'x')        // Multiplication sign to x
    .replace(/☆/g, '☆')       // Keep star as-is (both use same char)
    // Normalize spaces around punctuation - remove spaces before/after certain chars
    .replace(/\s+\(/g, '(')    // Remove space before (
    .replace(/\(\s+/g, '(')    // Remove space after (
    .replace(/\s+\)/g, ')')    // Remove space before )
    .replace(/\s+!/g, '!')     // Remove space before !
    .replace(/!\s+/g, '!')     // Remove space after ! (in sequences like "!! ")
    .replace(/\s+\?/g, '?')    // Remove space before ?
    // Collapse multiple spaces into one
    .replace(/\s+/g, ' ')
    // Trim
    .trim();
}

// ============================================================================
// Matching Functions - BATCHED for performance
// ============================================================================

async function batchMatchBySongId(
  supabase: any,
  entries: Array<{ songId: number; playstyle: string; difficultyName: string; difficultyLevel: number }>
): Promise<Map<string, MusicdbMatch>> {
  if (entries.length === 0) return new Map();
  
  // Get unique song IDs
  const songIds = [...new Set(entries.map(e => e.songId))];
  
  console.log(`batchMatchBySongId: attempting to match ${songIds.length} unique song IDs`);
  console.log(`Sample song IDs: ${songIds.slice(0, 10).join(', ')}`);
  
  // Supabase has a default 1000 row limit that can't be overridden via .limit()
  // We need to fetch in batches and combine the results
  const BATCH_SIZE = 50; // Fetch songs in batches of 50 to stay well under any limits
  const allData: any[] = [];
  
  for (let i = 0; i < songIds.length; i += BATCH_SIZE) {
    const batchIds = songIds.slice(i, i + BATCH_SIZE);
    
    const { data, error } = await supabase
      .from('musicdb')
      .select('id, song_id, chart_id, playstyle, difficulty_name, difficulty_level')
      .in('song_id', batchIds);
    
    if (error) {
      console.error(`batchMatchBySongId batch ${i / BATCH_SIZE} error:`, error);
      continue;
    }
    
    if (data) {
      allData.push(...data);
    }
  }
  
  console.log(`batchMatchBySongId: queried ${songIds.length} song IDs in ${Math.ceil(songIds.length / BATCH_SIZE)} batches, got ${allData.length} chart matches`);
  
  // Create a lookup map
  const matchMap = new Map<string, MusicdbMatch>();
  for (const row of allData) {
    const key = `${row.song_id}|${row.playstyle}|${row.difficulty_name}|${row.difficulty_level}`;
    matchMap.set(key, { id: row.id, song_id: row.song_id, chart_id: row.chart_id });
  }
  
  return matchMap;
}

// Batch match by eamuse_id for performance
async function batchMatchByEamuseId(
  supabase: any,
  eamuseIds: string[]
): Promise<Map<string, MusicdbMatch & { eamuse_id: string }>> {
  if (eamuseIds.length === 0) return new Map();
  
  const uniqueIds = [...new Set(eamuseIds)];
  console.log(`batchMatchByEamuseId: attempting to match ${uniqueIds.length} unique eamuse IDs`);
  
  const BATCH_SIZE = 100;
  const allData: any[] = [];
  
  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const batchIds = uniqueIds.slice(i, i + BATCH_SIZE);
    
    const { data, error } = await supabase
      .from('musicdb')
      .select('id, song_id, chart_id, eamuse_id, playstyle, difficulty_name, name, difficulty_level')
      .in('eamuse_id', batchIds);
    
    if (error) {
      console.error(`batchMatchByEamuseId batch ${i / BATCH_SIZE} error:`, error);
      continue;
    }
    
    if (data) {
      allData.push(...data);
    }
  }
  
  console.log(`batchMatchByEamuseId: got ${allData.length} chart matches`);
  
  // Create lookup map: eamuse_id|playstyle|difficulty_name -> match
  const matchMap = new Map<string, MusicdbMatch & { eamuse_id: string }>();
  for (const row of allData) {
    const key = `${row.eamuse_id}|${row.playstyle}|${row.difficulty_name}`;
    matchMap.set(key, { 
      id: row.id, 
      song_id: row.song_id, 
      chart_id: row.chart_id,
      eamuse_id: row.eamuse_id 
    });
  }
  
  return matchMap;
}

// Batch match by name and chart for fallback matching (Sanbai only)
// Uses normalization to handle formatting differences between Sanbai exports and musicdb
// Strategy: Fetch all musicdb charts once, build a normalized lookup map, then match in-memory
async function batchMatchByNameAndChart(
  supabase: any,
  entries: Array<{ songName: string; playstyle: string; difficultyName: string; difficultyLevel: number }>
): Promise<Map<string, MusicdbMatch>> {
  if (entries.length === 0) return new Map();
  
  // Get unique normalized names we need to find
  const uniqueNormalizedNames = new Set<string>();
  for (const e of entries) {
    uniqueNormalizedNames.add(normalizeSanbaiName(e.songName).toLowerCase());
  }
  console.log(`batchMatchByNameAndChart: attempting to match ${uniqueNormalizedNames.size} unique song names (after normalization)`);
  
  // Fetch ALL charts from musicdb (only ~10k records, manageable)
  // This is more efficient than doing multiple queries with ILIKE
  const allData: any[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('musicdb')
      .select('id, song_id, chart_id, name, playstyle, difficulty_name, difficulty_level')
      .not('difficulty_level', 'is', null)
      .range(offset, offset + PAGE_SIZE - 1);
    
    if (error) {
      console.error(`batchMatchByNameAndChart fetch error at offset ${offset}:`, error);
      break;
    }
    
    if (data && data.length > 0) {
      allData.push(...data);
      offset += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }
  
  console.log(`batchMatchByNameAndChart: fetched ${allData.length} total charts from musicdb`);
  
  // Build lookup map: normalized_name|playstyle|difficulty_name|difficulty_level -> match
  // Only include charts whose normalized name matches one we're looking for
  const matchMap = new Map<string, MusicdbMatch>();
  let matchCount = 0;
  
  for (const row of allData) {
    const dbNameNormalized = normalizeSanbaiName(row.name || '').toLowerCase();
    
    // Only add to map if this is a name we're looking for
    if (uniqueNormalizedNames.has(dbNameNormalized)) {
      const key = `${dbNameNormalized}|${row.playstyle}|${row.difficulty_name}|${row.difficulty_level}`;
      matchMap.set(key, { id: row.id, song_id: row.song_id, chart_id: row.chart_id });
      matchCount++;
    }
  }
  
  console.log(`Name match map has ${matchMap.size} entries (from ${matchCount} chart matches)`);
  
  return matchMap;
}

// Batch update eamuse_id discoveries
async function batchDiscoverEamuseIds(
  supabase: any,
  discoveries: Array<{ songId: number; eamuseId: string }>
): Promise<void> {
  if (discoveries.length === 0) return;
  
  console.log(`Batch discovering ${discoveries.length} eamuse_id mappings...`);
  
  // Group by song_id to avoid duplicate updates
  const uniqueDiscoveries = new Map<number, string>();
  for (const d of discoveries) {
    uniqueDiscoveries.set(d.songId, d.eamuseId);
  }
  
  // Do updates in parallel batches
  const updates = Array.from(uniqueDiscoveries.entries());
  const BATCH_SIZE = 20;
  
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async ([songId, eamuseId]) => {
        const { error } = await supabase
          .from('musicdb')
          .update({ eamuse_id: eamuseId })
          .eq('song_id', songId)
          .is('eamuse_id', null); // Only update if not already set
        
        if (error) {
          console.error(`discoverEamuseId error for ${songId}:`, error);
        }
      })
    );
  }
  
  console.log(`Discovered ${uniqueDiscoveries.size} eamuse_id mappings`);
}

// matchByNameAndChart and discoverSanbaiSongId replaced by batch versions above

// ============================================================================
// Fetch Existing Scores for User - Batched
// ============================================================================

async function fetchExistingScores(
  supabase: any,
  userId: string,
  musicdbIds: number[]
): Promise<Map<number, ExistingScore>> {
  if (musicdbIds.length === 0) return new Map();
  
  // Batch the query to avoid URL length limits
  // Supabase .in() with thousands of IDs creates URLs that are too long
  const BATCH_SIZE = 100;
  const uniqueIds = [...new Set(musicdbIds)];
  const allData: any[] = [];
  
  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const batchIds = uniqueIds.slice(i, i + BATCH_SIZE);
    
    const { data, error } = await supabase
      .from('user_scores')
      .select('id, musicdb_id, score, rank, flare, halo')
      .eq('user_id', userId)
      .in('musicdb_id', batchIds);
    
    if (error) {
      console.error(`fetchExistingScores batch ${Math.floor(i / BATCH_SIZE)} error:`, error);
      continue;
    }
    
    if (data) {
      allData.push(...data);
    }
  }
  
  console.log(`fetchExistingScores: queried ${uniqueIds.length} IDs in ${Math.ceil(uniqueIds.length / BATCH_SIZE)} batches, found ${allData.length} existing scores`);
  
  const map = new Map<number, ExistingScore>();
  for (const row of allData) {
    if (row.musicdb_id) {
      map.set(row.musicdb_id, row as ExistingScore);
    }
  }
  return map;
}

// ============================================================================
// PhaseII Processing - OPTIMIZED with batch matching
// ============================================================================

function extractSongName(item: any): string | null {
  return item.song?.name || item.songName || item.name || item.title || 
         item.song?.title || item.musicTitle || null;
}

function extractChartInfo(item: any): { playstyle: string; difficulty_name: string; difficulty_level: number } | null {
  if (item.song?.chart) {
    const match = item.song.chart.match(/^(SP|DP)\s+(\w+)\s*-\s*(\d+)$/);
    if (match) {
      return {
        playstyle: match[1],
        difficulty_name: match[2].toUpperCase(),
        difficulty_level: parseInt(match[3])
      };
    }
  }
  
  if (item.chart) {
    const match = item.chart.match(/^(SP|DP)\s+(\w+)\s*-\s*(\d+)$/);
    if (match) {
      return {
        playstyle: match[1],
        difficulty_name: match[2].toUpperCase(),
        difficulty_level: parseInt(match[3])
      };
    }
  }
  
  if (item.difficulty && (item.level !== undefined || item.difficultyLevel !== undefined)) {
    const level = item.level ?? item.difficultyLevel ?? 0;
    const playstyle = item.playStyle || item.playstyle || item.style || 'SP';
    return {
      playstyle: playstyle.toUpperCase(),
      difficulty_name: String(item.difficulty).toUpperCase(),
      difficulty_level: parseInt(level)
    };
  }
  
  return null;
}

function extractScore(item: any): number | null {
  const raw = item.points ?? item.score ?? item.highScore ?? item.exScore ?? null;
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return raw;
  return parseInt(String(raw).replace(/,/g, '')) || null;
}

function extractHalo(item: any): string | null {
  const raw = item.data?.halo || item.halo || item.lamp || item.clearLamp || 
              item.fullComboType || item.fcType || null;
  if (!raw) return null;
  
  const normalized = String(raw).toUpperCase();
  const map: Record<string, string> = {
    'MARVELOUS FULL COMBO': 'mfc',
    'MFC': 'mfc',
    'PERFECT FULL COMBO': 'pfc',
    'PFC': 'pfc',
    'GREAT FULL COMBO': 'gfc',
    'GFC': 'gfc',
    'GOOD FULL COMBO': 'fc',
    'FULL COMBO': 'fc',
    'FC': 'fc',
    'LIFE4': 'life4',
    'LIFE 4': 'life4',
    'CLEAR': 'clear',
    'FAILED': 'fail',
    'FAIL': 'fail',
  };
  return map[normalized] || 'clear';
}

function extractFlare(item: any): number | null {
  const raw = item.data?.flare ?? item.flare ?? item.flareRank ?? item.flareSkill ?? null;
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return raw;
  
  const romanMap: Record<string, number> = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
    'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
    'EX': 10
  };
  const upper = String(raw).toUpperCase().trim();
  return romanMap[upper] ?? (parseInt(raw) || null);
}

function extractRank(item: any): string | null {
  return item.data?.rank || item.rank || item.grade || item.letterGrade || null;
}

// ============================================================================
// PhaseII Regex-Based Field Extraction (bypasses JSON.parse entirely)
// ============================================================================

interface PhaseIIEntry {
  songId: number | null;
  chart: string | null;
  points: string | null;
  halo: string | null;
  rank: string | null;
  flare: number | null;
  timestamp: string | null;
}

// Extract username from PhaseII export (typically in the file header or global data)
function extractPhaseIIUsername(content: string): string | null {
  // Look for "name":"USERNAME" pattern in the header/global section
  const nameMatch = content.match(/"name"\s*:\s*"([^"]+)"/);
  if (nameMatch) {
    // Avoid matching song names by checking if it's in a global context
    // PhaseII exports typically have the player name near the start
    const position = nameMatch.index || 0;
    if (position < 500) { // If found in first 500 chars, likely player name
      return nameMatch[1];
    }
  }
  
  // Also try "playerName" or "userName"
  const playerNameMatch = content.match(/"(?:playerName|userName|user)"\s*:\s*"([^"]+)"/i);
  if (playerNameMatch) {
    return playerNameMatch[1];
  }
  
  return null;
}

function extractPhaseIIEntries(content: string): { entries: PhaseIIEntry[]; skippedCount: number } {
  const entries: PhaseIIEntry[] = [];
  let skippedCount = 0;
  
  // Split into entry blocks - each score entry is a JSON object with song, data, etc.
  // We look for patterns like {"song":{...},"data":{...},...}
  // Use a regex to find each top-level entry in the array
  
  // First, find where the array starts - could be root array or nested in data/scores
  let arrayContent = content;
  
  // Try to find the main data array
  const dataArrayMatch = content.match(/"data"\s*:\s*\[/);
  const scoresArrayMatch = content.match(/"scores"\s*:\s*\[/);
  const rootArrayMatch = content.match(/^\s*\[/);
  
  if (dataArrayMatch) {
    const startIdx = dataArrayMatch.index! + dataArrayMatch[0].length - 1;
    arrayContent = content.substring(startIdx);
  } else if (scoresArrayMatch) {
    const startIdx = scoresArrayMatch.index! + scoresArrayMatch[0].length - 1;
    arrayContent = content.substring(startIdx);
  } else if (rootArrayMatch) {
    arrayContent = content;
  }
  
  // Split by looking for entry boundaries: },{ pattern
  // This is more robust than trying to parse full JSON
  const entryBlocks: string[] = [];
  let depth = 0;
  let currentBlock = '';
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < arrayContent.length; i++) {
    const char = arrayContent[i];
    
    if (escaped) {
      escaped = false;
      currentBlock += char;
      continue;
    }
    
    if (char === '\\' && inString) {
      escaped = true;
      currentBlock += char;
      continue;
    }
    
    if (char === '"' && !escaped) {
      inString = !inString;
      currentBlock += char;
      continue;
    }
    
    if (!inString) {
      if (char === '{') {
        if (depth === 0 && currentBlock.trim()) {
          // Starting a new entry
          currentBlock = '';
        }
        depth++;
        currentBlock += char;
      } else if (char === '}') {
        depth--;
        currentBlock += char;
        if (depth === 0 && currentBlock.trim()) {
          entryBlocks.push(currentBlock);
          currentBlock = '';
        }
      } else if (char === '[' && depth === 0) {
        // Start of array, skip
        continue;
      } else if (char === ']' && depth === 0) {
        // End of array
        break;
      } else {
        if (depth > 0) {
          currentBlock += char;
        }
      }
    } else {
      currentBlock += char;
    }
  }
  
  console.log(`Found ${entryBlocks.length} entry blocks to process`);
  
  // Process each block with regex extraction
  for (const block of entryBlocks) {
    try {
      const entry = extractFieldsFromBlock(block);
      if (entry.songId !== null && entry.chart !== null) {
        entries.push(entry);
      } else {
        // Missing required fields
        skippedCount++;
        console.log(`Skipped entry: missing songId or chart`);
      }
    } catch (err) {
      skippedCount++;
      console.log(`Skipped corrupted entry: ${err}`);
    }
  }
  
  return { entries, skippedCount };
}

function extractFieldsFromBlock(block: string): PhaseIIEntry {
  // Extract song.id - look for "song":{..."id":12345...}
  let songId: number | null = null;
  const songIdMatch = block.match(/"song"\s*:\s*\{[^}]*?"id"\s*:\s*(\d+)/);
  if (songIdMatch) {
    songId = parseInt(songIdMatch[1]);
  }
  
  // Extract song.chart - "chart":"SP EXPERT - 15"
  let chart: string | null = null;
  const chartMatch = block.match(/"chart"\s*:\s*"([^"]+)"/);
  if (chartMatch) {
    chart = chartMatch[1];
  }
  
  // Extract points - "points":"999,880" or "points":999880
  let points: string | null = null;
  // Try quoted format first: "points":"999,880"
  const quotedPointsMatch = block.match(/"points"\s*:\s*"([^"]+)"/);
  if (quotedPointsMatch) {
    points = quotedPointsMatch[1];
  } else {
    // Fallback to unquoted number: "points":999880
    const unquotedPointsMatch = block.match(/"points"\s*:\s*(\d+)/);
    if (unquotedPointsMatch) {
      points = unquotedPointsMatch[1];
    }
  }
  
  // Extract data.halo - look for "data":{..."halo":"PERFECT FULL COMBO"...}
  let halo: string | null = null;
  const haloMatch = block.match(/"halo"\s*:\s*"([^"]+)"/);
  if (haloMatch) {
    halo = haloMatch[1];
  }
  
  // Extract data.rank - "rank":"AAA"
  let rank: string | null = null;
  const rankMatch = block.match(/"rank"\s*:\s*"([^"]+)"/);
  if (rankMatch) {
    rank = rankMatch[1];
  }
  
  // Extract data.flare - "flare":10
  let flare: number | null = null;
  const flareMatch = block.match(/"flare"\s*:\s*(\d+)/);
  if (flareMatch) {
    flare = parseInt(flareMatch[1]);
  }
  
  // Extract timestamp - "timestamp":"2025-11-19 21:34:50"
  let timestamp: string | null = null;
  const timestampMatch = block.match(/"timestamp"\s*:\s*"([^"]+)"/);
  if (timestampMatch) {
    timestamp = timestampMatch[1];
  }
  
  return { songId, chart, points, halo, rank, flare, timestamp };
}

function parseChartString(chart: string): { playstyle: string; difficulty_name: string; difficulty_level: number } | null {
  const match = chart.match(/^(SP|DP)\s+(\w+)\s*-\s*(\d+)$/);
  if (!match) return null;
  return {
    playstyle: match[1],
    difficulty_name: match[2].toUpperCase(),
    difficulty_level: parseInt(match[3])
  };
}

function normalizeExtractedHalo(halo: string | null): string | null {
  if (!halo) return null;
  const normalized = halo.toUpperCase();
  const map: Record<string, string> = {
    'MARVELOUS FULL COMBO': 'mfc',
    'MFC': 'mfc',
    'PERFECT FULL COMBO': 'pfc',
    'PFC': 'pfc',
    'GREAT FULL COMBO': 'gfc',
    'GFC': 'gfc',
    'GOOD FULL COMBO': 'fc',
    'FULL COMBO': 'fc',
    'FC': 'fc',
    'LIFE4': 'life4',
    'LIFE 4': 'life4',
    'CLEAR': 'clear',
    'FAILED': 'fail',
    'FAIL': 'fail',
  };
  return map[normalized] || 'clear';
}

function parseExtractedScore(points: string | null): number | null {
  if (!points) return null;
  return parseInt(points.replace(/,/g, '')) || null;
}

async function processPhaseII(
  supabase: any,
  content: string
): Promise<ParseResult> {
  const scores: ScoreRecord[] = [];
  const unmatchedSongs: UnmatchedSong[] = [];
  
  // Use regex-based extraction instead of JSON.parse
  console.log('Using regex-based field extraction for PhaseII...');
  const { entries, skippedCount } = extractPhaseIIEntries(content);
  
  console.log(`Extracted ${entries.length} valid entries, ${skippedCount} skipped due to corruption`);
  
  if (skippedCount > 0) {
    unmatchedSongs.push({ 
      name: `${skippedCount} entries`, 
      difficulty: null, 
      reason: 'corrupt_entry' 
    });
  }
  
  if (entries.length === 0) {
    return { scores, sourceType: 'phaseii', unmatchedSongs };
  }
  
  // Sample logging
  if (entries.length > 0) {
    console.log('Sample extracted entry:', JSON.stringify(entries[0]));
  }
  
  // Collect entries for batch matching
  const entriesToMatch: Array<{
    entry: PhaseIIEntry;
    chartInfo: { playstyle: string; difficulty_name: string; difficulty_level: number };
  }> = [];
  
  for (const entry of entries) {
    if (!entry.chart) {
      unmatchedSongs.push({ name: null, difficulty: null, reason: 'missing_chart_info' });
      continue;
    }
    
    const chartInfo = parseChartString(entry.chart);
    if (!chartInfo) {
      unmatchedSongs.push({ name: null, difficulty: entry.chart, reason: 'invalid_chart_format' });
      continue;
    }
    
    if (entry.songId === null) {
      unmatchedSongs.push({ name: null, difficulty: entry.chart, reason: 'missing_song_id' });
      continue;
    }
    
    entriesToMatch.push({ entry, chartInfo });
  }
  
  // BATCH MATCH: Fetch all matches in one query
  const matchMap = await batchMatchBySongId(
    supabase,
    entriesToMatch.map(e => ({
      songId: e.entry.songId!,
      playstyle: e.chartInfo.playstyle,
      difficultyName: e.chartInfo.difficulty_name,
      difficultyLevel: e.chartInfo.difficulty_level,
    }))
  );
  
  // Process entries - ID-based matching
  let idMatchCount = 0;
  
  for (const { entry, chartInfo } of entriesToMatch) {
    const key = `${entry.songId}|${chartInfo.playstyle}|${chartInfo.difficulty_name}|${chartInfo.difficulty_level}`;
    const match = matchMap.get(key) ?? null;
    
    if (!match) {
      unmatchedSongs.push({ 
        name: null, 
        difficulty: `${chartInfo.playstyle} ${chartInfo.difficulty_name} ${chartInfo.difficulty_level}`,
        reason: 'no_match_by_id' 
      });
      continue;
    }
    
    idMatchCount++;
    scores.push({
      musicdb_id: match.id,
      chart_id: match.chart_id,
      song_id: match.song_id,
      playstyle: chartInfo.playstyle,
      difficulty_name: chartInfo.difficulty_name,
      difficulty_level: chartInfo.difficulty_level,
      score: parseExtractedScore(entry.points),
      timestamp: entry.timestamp,
      username: null,
      rank: entry.rank,
      flare: entry.flare,
      halo: normalizeExtractedHalo(entry.halo),
      source_type: 'phaseii',
    });
  }
  
  console.log(`PhaseII matching: ${idMatchCount} matched by ID`);
  console.log(`PhaseII: ${scores.length} matched, ${unmatchedSongs.length} unmatched`);
  return { scores, sourceType: 'phaseii', unmatchedSongs };
}

// ============================================================================
// Sanbai Processing
// ============================================================================

async function processSanbai(
  supabase: any,
  content: string
): Promise<ParseResult> {
  const scores: ScoreRecord[] = [];
  const unmatchedSongs: UnmatchedSong[] = [];
  
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    return { scores, sourceType: 'sanbai', unmatchedSongs: [{ name: null, difficulty: null, reason: 'no_data_rows' }] };
  }
  
  // Detect separator: if first line contains tabs, use tab; otherwise use comma
  const firstLine = lines[0];
  const separator = firstLine.includes('\t') ? '\t' : ',';
  console.log(`Sanbai using separator: ${separator === '\t' ? 'TAB' : 'COMMA'}`);
  
  const headers = lines[0].split(separator).map(h => h.trim());
  const colIndex: Record<string, number> = {};
  headers.forEach((h, i) => { colIndex[h] = i; });
  
  const requiredCols = ['Song ID', 'Song Name', 'Difficulty', 'Rating', 'Score'];
  for (const col of requiredCols) {
    if (colIndex[col] === undefined) {
      return { scores, sourceType: 'sanbai', unmatchedSongs: [{ name: null, difficulty: null, reason: `missing_column_${col}` }] };
    }
  }
  
  console.log(`Processing ${lines.length - 1} Sanbai rows`);
  
  // PHASE 1: Parse all rows and collect data for batch matching
  interface ParsedRow {
    eamuseId: string;
    songName: string;
    diffInfo: { playstyle: string; difficulty_name: string };
    rating: number;
    scoreVal: number | null;
    grade: string | null;
    lamp: string | null;
    flare: string | null;
  }
  
  const parsedRows: ParsedRow[] = [];
  const allEamuseIds: string[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = line.split(separator);
    const sanbaiSongId = cols[colIndex['Song ID']]?.trim();
    const songName = cols[colIndex['Song Name']]?.trim();
    const difficultyCode = cols[colIndex['Difficulty']]?.trim();
    const rating = parseInt(cols[colIndex['Rating']]?.trim()) || 0;
    const scoreVal = parseInt(cols[colIndex['Score']]?.trim()) || null;
    const grade = cols[colIndex['Grade']]?.trim() || null;
    const lamp = cols[colIndex['Lamp']]?.trim() || null;
    const flare = cols[colIndex['Flare']]?.trim() || null;
    
    if (!sanbaiSongId || !difficultyCode) {
      unmatchedSongs.push({ name: songName, difficulty: difficultyCode, reason: 'missing_id_or_difficulty' });
      continue;
    }
    
    const diffInfo = parseSanbaiDifficulty(difficultyCode);
    if (!diffInfo) {
      unmatchedSongs.push({ name: songName, difficulty: difficultyCode, reason: 'invalid_difficulty_code' });
      continue;
    }
    
    parsedRows.push({ eamuseId: sanbaiSongId, songName, diffInfo, rating, scoreVal, grade, lamp, flare });
    allEamuseIds.push(sanbaiSongId);
  }
  
  console.log(`Parsed ${parsedRows.length} valid rows, ${unmatchedSongs.length} invalid`);
  
  // PHASE 2: Batch fetch all charts with known eamuse_ids
  const eamuseMatchMap = await batchMatchByEamuseId(supabase, allEamuseIds);
  console.log(`Eamuse ID match map has ${eamuseMatchMap.size} entries`);
  
  // PHASE 3: Match by eamuse_id ONLY - no fallback to names
  const matchedRows: Array<{ row: ParsedRow; match: MusicdbMatch }> = [];
  
  for (const row of parsedRows) {
    const key = `${row.eamuseId}|${row.diffInfo.playstyle}|${row.diffInfo.difficulty_name}`;
    const match = eamuseMatchMap.get(key);
    
    if (match) {
      matchedRows.push({ row, match });
    } else {
      // No eamuse_id match - add to unmatched (no fallback to name matching)
      unmatchedSongs.push({ 
        name: row.songName, 
        difficulty: `${row.diffInfo.playstyle} ${row.diffInfo.difficulty_name} ${row.rating}`, 
        reason: 'eamuse_id_not_found' 
      });
    }
  }
  
  console.log(`Eamuse ID matches: ${matchedRows.length}, unmatched: ${unmatchedSongs.length}`);
  
  // PHASE 6: Build score records
  for (const { row, match } of matchedRows) {
    scores.push({
      musicdb_id: match.id,
      chart_id: match.chart_id,
      song_id: match.song_id,
      playstyle: row.diffInfo.playstyle,
      difficulty_name: row.diffInfo.difficulty_name,
      difficulty_level: row.rating,
      score: row.scoreVal,
      timestamp: null,
      username: null,
      rank: row.grade,
      flare: parseSanbaiFlare(row.flare),
      halo: normalizeSanbaiLamp(row.lamp),
      source_type: 'sanbai',
    });
  }
  
  console.log(`Sanbai: ${scores.length} matched, ${unmatchedSongs.length} unmatched`);
  return { scores, sourceType: 'sanbai', unmatchedSongs };
}

// ============================================================================
// Smart Upsert - BATCHED for performance
// ============================================================================

interface UpsertResult {
  inserted: number;
  updated: number;
  skipped: number;
}

async function smartUpsertScores(
  supabase: any,
  userId: string,
  uploadId: string,
  scores: ScoreRecord[],
  existingScores: Map<number, ExistingScore>
): Promise<UpsertResult> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  
  // CRITICAL: Deduplicate scores by musicdb_id, keeping the best values
  // This prevents "ON CONFLICT DO UPDATE command cannot affect row a second time" errors
  const deduplicatedScores = new Map<number, ScoreRecord>();
  
  for (const score of scores) {
    if (!score.musicdb_id) {
      skipped++;
      continue;
    }
    
    const existingInBatch = deduplicatedScores.get(score.musicdb_id);
    if (!existingInBatch) {
      deduplicatedScores.set(score.musicdb_id, score);
    } else {
      // Merge: keep the best values from both records
      deduplicatedScores.set(score.musicdb_id, {
        ...existingInBatch,
        score: getBetterScore(existingInBatch.score, score.score),
        halo: getBetterHalo(existingInBatch.halo, score.halo),
        flare: getBetterFlare(existingInBatch.flare, score.flare),
        rank: getBetterRank(existingInBatch.rank, score.rank),
        // Keep the most recent timestamp
        timestamp: score.timestamp || existingInBatch.timestamp,
      });
    }
  }
  
  console.log(`Deduplicated ${scores.length} score entries to ${deduplicatedScores.size} unique charts`);
  
  // Separate new records from updates
  const toInsert: any[] = [];
  const toUpdate: Array<{ id: string; data: any }> = [];
  
  for (const score of deduplicatedScores.values()) {
    const existing = existingScores.get(score.musicdb_id!);
    
    if (!existing) {
      toInsert.push({
        user_id: userId,
        upload_id: uploadId,
        musicdb_id: score.musicdb_id,
        chart_id: score.chart_id,
        song_id: score.song_id,
        playstyle: score.playstyle,
        difficulty_name: score.difficulty_name,
        difficulty_level: score.difficulty_level,
        score: score.score,
        timestamp: score.timestamp,
        username: score.username,
        rank: score.rank,
        flare: score.flare,
        halo: score.halo,
        source_type: score.source_type,
      });
    } else {
      const bestScore = getBetterScore(existing.score, score.score);
      const bestHalo = getBetterHalo(existing.halo, score.halo);
      const bestFlare = getBetterFlare(existing.flare, score.flare);
      const bestRank = getBetterRank(existing.rank, score.rank);
      
      const scoreImproved = bestScore !== existing.score;
      const haloImproved = bestHalo !== existing.halo;
      const flareImproved = bestFlare !== existing.flare;
      const rankImproved = bestRank !== existing.rank;
      
      if (scoreImproved || haloImproved || flareImproved || rankImproved) {
        toUpdate.push({
          id: existing.id,
          data: {
            score: bestScore,
            halo: bestHalo,
            flare: bestFlare,
            rank: bestRank,
            upload_id: uploadId,
          }
        });
      } else {
        skipped++;
      }
    }
  }
  
  // BATCH INSERT new scores
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('user_scores')
      .upsert(toInsert, {
        onConflict: 'user_id,musicdb_id',
        ignoreDuplicates: false,
      });
    
    if (insertError) {
      console.error('Batch insert error:', insertError);
    } else {
      inserted = toInsert.length;
      console.log(`Inserted ${inserted} new scores`);
    }
  }
  
  // BATCH UPDATE existing scores (need to do individually due to different data per row)
  for (const update of toUpdate) {
    const { error: updateError } = await supabase
      .from('user_scores')
      .update(update.data)
      .eq('id', update.id);
    
    if (updateError) {
      console.error('Update error:', updateError);
    } else {
      updated++;
    }
  }
  
  if (updated > 0) {
    console.log(`Updated ${updated} existing scores with improvements`);
  }
  
  return { inserted, updated, skipped };
}

// ============================================================================
// Upsert DDR Username to User Profiles
// ============================================================================

async function upsertDdrUsername(
  supabase: any,
  userId: string,
  ddrUsername: string | null
): Promise<void> {
  if (!ddrUsername) return;
  
  try {
    // Only set ddr_username if not already set
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('ddr_username')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (existing?.ddr_username) {
      console.log(`DDR username already set for user ${userId}: ${existing.ddr_username}`);
      return;
    }
    
    const { error } = await supabase
      .from('user_profiles')
      .upsert(
        { user_id: userId, ddr_username: ddrUsername },
        { onConflict: 'user_id' }
      );
    
    if (error) {
      console.error('Error upserting ddr_username:', error);
    } else {
      console.log(`Set ddr_username for user ${userId}: ${ddrUsername}`);
    }
  } catch (err) {
    console.error('Error upserting ddr_username:', err);
  }
}

// ============================================================================
// Background Processing Function
// ============================================================================

async function processUploadInBackground(
  supabaseUrl: string,
  supabaseServiceKey: string,
  userId: string,
  uploadId: string,
  content: string,
  sourceType: 'phaseii' | 'sanbai' | 'unknown'
): Promise<void> {
  console.log(`Background processing started for upload ${uploadId}`);
  
  // Create a new service role client for background processing
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Extract username from content if PhaseII
    let extractedUsername: string | null = null;
    if (sourceType === 'phaseii') {
      extractedUsername = extractPhaseIIUsername(content);
      console.log(`Extracted username from PhaseII: ${extractedUsername}`);
    }
    
    // Process based on source type
    let parseResult: ParseResult;
    
    if (sourceType === 'phaseii') {
      parseResult = await processPhaseII(supabase, content);
    } else if (sourceType === 'sanbai') {
      parseResult = await processSanbai(supabase, content);
    } else {
      await supabase
        .from('uploads')
        .update({
          parse_status: 'failed',
          parse_error: 'Unknown file format. Expected PhaseII JSON or Sanbai TSV.',
        })
        .eq('id', uploadId);
      return;
    }

    // If no scores matched, mark as failed
    if (parseResult.scores.length === 0) {
      await supabase
        .from('uploads')
        .update({
          parse_status: 'failed',
          parse_error: 'No scores could be matched to the catalog',
          parse_summary: {
            total_rows: parseResult.unmatchedSongs.length,
            mapped_rows: 0,
            skipped_rows: parseResult.unmatchedSongs.length,
            source_type: parseResult.sourceType,
            unmatched_songs: parseResult.unmatchedSongs.slice(0, 50),
          },
        })
        .eq('id', uploadId);
      return;
    }

    // Fetch existing scores for smart upsert
    const musicdbIds = parseResult.scores
      .map(s => s.musicdb_id)
      .filter((id): id is number => id !== null);
    
    const existingScores = await fetchExistingScores(supabase, userId, musicdbIds);
    console.log(`Found ${existingScores.size} existing scores for comparison`);

    // Smart upsert - merge best values
    const upsertResult = await smartUpsertScores(
      supabase,
      userId,
      uploadId,
      parseResult.scores,
      existingScores
    );
    
    // Upsert DDR username to user_profiles if extracted
    if (extractedUsername) {
      await upsertDdrUsername(supabase, userId, extractedUsername);
    }

    // Update upload record with summary
    const totalRows = parseResult.scores.length + parseResult.unmatchedSongs.length;
    await supabase
      .from('uploads')
      .update({
        parse_status: 'parsed',
        parse_summary: {
          total_rows: totalRows,
          mapped_rows: parseResult.scores.length,
          skipped_rows: parseResult.unmatchedSongs.length,
          inserted: upsertResult.inserted,
          updated: upsertResult.updated,
          unchanged: upsertResult.skipped,
          source_type: parseResult.sourceType,
          unmatched_songs: parseResult.unmatchedSongs.slice(0, 50),
        },
      })
      .eq('id', uploadId);
    
    console.log(`Background processing completed for upload ${uploadId}`);
  } catch (err) {
    console.error('Background processing error:', err);
    await supabase
      .from('uploads')
      .update({
        parse_status: 'failed',
        parse_error: err instanceof Error ? err.message : 'Background processing failed',
      })
      .eq('id', uploadId);
  }
}

// ============================================================================
// Main Handler - Returns immediately, processes in background
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await req.json();
    const { file_name, file_mime_type, file_size_bytes, raw_storage_path, content } = body;

    if (!content || !file_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Detect source type
    const sourceType = detectSourceType(content);
    console.log(`Detected source type: ${sourceType} for file: ${file_name}`);

    // Create upload record with 'processing' status
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .insert({
        user_id: user.id,
        file_name,
        file_mime_type,
        file_size_bytes,
        raw_storage_path,
        parse_status: 'processing', // Changed from 'pending' to 'processing'
        source_type: sourceType,
      })
      .select('id')
      .single();

    if (uploadError) {
      console.error('Upload insert error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to create upload record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uploadId = upload.id;

    // Start background processing using EdgeRuntime.waitUntil
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(
      processUploadInBackground(
        supabaseUrl,
        supabaseServiceKey,
        user.id,
        uploadId,
        content,
        sourceType
      )
    );

    // Return immediately with upload ID - client will poll for status
    return new Response(JSON.stringify({
      upload_id: uploadId,
      status: 'processing',
      message: 'Upload received. Processing in background.',
    }), {
      status: 202, // Accepted - processing started
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ 
      error: err instanceof Error ? err.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
