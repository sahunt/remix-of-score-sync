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
  
  // Step 2: Replace common problematic Unicode characters
  // These are often corrupted UTF-8 sequences that break JSON parsing
  sanitized = sanitized
    // Remove null bytes
    .replace(/\x00/g, '')
    // Replace other control characters (except tab, newline, carriage return)
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, '')
    // Handle escaped newlines in strings that might cause issues
    .replace(/\\n(?=[^"]*"[^"]*$)/gm, ' ');
  
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

function detectSourceType(content: string): 'phaseii' | 'sanbai' | 'unknown' {
  const trimmed = content.trim();
  
  const firstLine = trimmed.split('\n')[0];
  if (firstLine.includes('Song ID') && firstLine.includes('\t')) {
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

async function matchSanbaiChart(
  supabase: any,
  sanbaiSongId: string,
  playstyle: string,
  difficultyName: string
): Promise<MusicdbMatch | null> {
  const { data, error } = await supabase
    .from('musicdb')
    .select('id, song_id, chart_id')
    .eq('sanbai_song_id', sanbaiSongId)
    .eq('playstyle', playstyle)
    .eq('difficulty_name', difficultyName)
    .limit(1)
    .maybeSingle();
  
  if (error) {
    console.error('matchSanbaiChart error:', error);
    return null;
  }
  return data;
}

async function matchByNameAndChart(
  supabase: any,
  songName: string,
  playstyle: string,
  difficultyName: string,
  difficultyLevel: number
): Promise<MusicdbMatch | null> {
  const { data, error } = await supabase
    .from('musicdb')
    .select('id, song_id, chart_id')
    .ilike('name', songName)
    .eq('playstyle', playstyle)
    .eq('difficulty_name', difficultyName)
    .eq('difficulty_level', difficultyLevel)
    .limit(1)
    .maybeSingle();
  
  if (error) {
    console.error('matchByNameAndChart error:', error);
    return null;
  }
  return data;
}

async function discoverSanbaiSongId(
  supabase: any,
  songId: number,
  sanbaiSongId: string
): Promise<void> {
  const { error } = await supabase
    .from('musicdb')
    .update({ sanbai_song_id: sanbaiSongId })
    .eq('song_id', songId);
  
  if (error) {
    console.error('discoverSanbaiSongId error:', error);
  } else {
    console.log(`Discovered sanbai_song_id ${sanbaiSongId} for song_id ${songId}`);
  }
}

// ============================================================================
// Fetch Existing Scores for User - Batched
// ============================================================================

async function fetchExistingScores(
  supabase: any,
  userId: string,
  musicdbIds: number[]
): Promise<Map<number, ExistingScore>> {
  if (musicdbIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from('user_scores')
    .select('id, musicdb_id, score, rank, flare, halo')
    .eq('user_id', userId)
    .in('musicdb_id', musicdbIds);
  
  if (error) {
    console.error('fetchExistingScores error:', error);
    return new Map();
  }
  
  const map = new Map<number, ExistingScore>();
  for (const row of data || []) {
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

async function processPhaseII(
  supabase: any,
  content: string
): Promise<ParseResult> {
  const scores: ScoreRecord[] = [];
  const unmatchedSongs: UnmatchedSong[] = [];
  
  let parsed: any;
  try {
    const sanitized = sanitizeJsonString(content.trim());
    parsed = JSON.parse(sanitized);
  } catch (err) {
    console.error('PhaseII JSON parse error (first attempt):', err);
    // Try aggressive sanitization as fallback
    try {
      console.log('Attempting aggressive JSON sanitization...');
      const aggressivelySanitized = aggressiveSanitizeJson(content.trim());
      parsed = JSON.parse(aggressivelySanitized);
      console.log('Aggressive sanitization succeeded');
    } catch (err2) {
      console.error('PhaseII JSON parse error (aggressive attempt):', err2);
      // Final fallback: try to extract just the data array
      const dataMatch = content.match(/"data"\s*:\s*(\[[\s\S]*?\])\s*}/);
      if (dataMatch) {
        try {
          console.log('Attempting to extract data array directly...');
          const dataArrayStr = sanitizeJsonString(dataMatch[1]);
          parsed = { data: JSON.parse(dataArrayStr) };
          console.log('Data array extraction succeeded');
        } catch (err3) {
          console.error('PhaseII JSON parse error (data extraction):', err3);
          return { scores, sourceType: 'phaseii', unmatchedSongs: [{ name: null, difficulty: null, reason: 'invalid_json' }] };
        }
      } else {
        return { scores, sourceType: 'phaseii', unmatchedSongs: [{ name: null, difficulty: null, reason: 'invalid_json' }] };
      }
    }
  }
  
  let dataArray: any[];
  if (Array.isArray(parsed)) {
    dataArray = parsed;
  } else if (parsed.data && Array.isArray(parsed.data)) {
    dataArray = parsed.data;
  } else if (parsed.scores && Array.isArray(parsed.scores)) {
    dataArray = parsed.scores;
  } else if (parsed.results && Array.isArray(parsed.results)) {
    dataArray = parsed.results;
  } else {
    dataArray = [parsed];
  }
  
  console.log(`Processing ${dataArray.length} PhaseII entries`);
  
  if (dataArray.length > 0) {
    const sample = dataArray[0];
    console.log('Sample item structure:', JSON.stringify(sample, null, 2).substring(0, 500));
  }
  
  // OPTIMIZATION: Collect all entries that need song.id matching
  const entriesToMatch: Array<{
    index: number;
    item: any;
    chartInfo: { playstyle: string; difficulty_name: string; difficulty_level: number };
    songId: number;
  }> = [];
  
  const itemsWithoutSongId: Array<{
    index: number;
    item: any;
    chartInfo: { playstyle: string; difficulty_name: string; difficulty_level: number };
  }> = [];
  
  // First pass: categorize items
  for (let i = 0; i < dataArray.length; i++) {
    const item = dataArray[i];
    const chartInfo = extractChartInfo(item);
    
    if (!chartInfo) {
      const songName = extractSongName(item);
      unmatchedSongs.push({ name: songName, difficulty: null, reason: 'missing_chart_info' });
      continue;
    }
    
    const phaseiiSongId = item.song?.id ?? null;
    
    if (phaseiiSongId !== null && typeof phaseiiSongId === 'number') {
      entriesToMatch.push({ index: i, item, chartInfo, songId: phaseiiSongId });
    } else {
      itemsWithoutSongId.push({ index: i, item, chartInfo });
    }
  }
  
  // BATCH MATCH: Fetch all matches in one query
  const matchMap = await batchMatchBySongId(
    supabase,
    entriesToMatch.map(e => ({
      songId: e.songId,
      playstyle: e.chartInfo.playstyle,
      difficultyName: e.chartInfo.difficulty_name,
      difficultyLevel: e.chartInfo.difficulty_level,
    }))
  );
  
  // Process entries with song.id - ID-based matching ONLY
  let idMatchCount = 0;
  
  for (const entry of entriesToMatch) {
    const key = `${entry.songId}|${entry.chartInfo.playstyle}|${entry.chartInfo.difficulty_name}|${entry.chartInfo.difficulty_level}`;
    const match = matchMap.get(key) ?? null;
    
    if (!match) {
      const songName = extractSongName(entry.item);
      unmatchedSongs.push({ 
        name: songName, 
        difficulty: `${entry.chartInfo.playstyle} ${entry.chartInfo.difficulty_name} ${entry.chartInfo.difficulty_level}`,
        reason: 'no_match_by_id' 
      });
      continue;
    }
    
    idMatchCount++;
    scores.push({
      musicdb_id: match.id,
      chart_id: match.chart_id,
      song_id: match.song_id,
      playstyle: entry.chartInfo.playstyle,
      difficulty_name: entry.chartInfo.difficulty_name,
      difficulty_level: entry.chartInfo.difficulty_level,
      score: extractScore(entry.item),
      timestamp: entry.item.timestamp || entry.item.playedAt || entry.item.date || null,
      username: entry.item.username || entry.item.playerName || null,
      rank: extractRank(entry.item),
      flare: extractFlare(entry.item),
      halo: extractHalo(entry.item),
      source_type: 'phaseii',
    });
  }
  
  console.log(`PhaseII matching: ${idMatchCount} matched by ID`);
  
  // Entries without song.id cannot be matched - mark as unmatched
  for (const entry of itemsWithoutSongId) {
    const songName = extractSongName(entry.item);
    unmatchedSongs.push({ 
      name: songName, 
      difficulty: `${entry.chartInfo.playstyle} ${entry.chartInfo.difficulty_name} ${entry.chartInfo.difficulty_level}`,
      reason: 'missing_song_id' 
    });
  }
  
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
  
  const headers = lines[0].split('\t').map(h => h.trim());
  const colIndex: Record<string, number> = {};
  headers.forEach((h, i) => { colIndex[h] = i; });
  
  const requiredCols = ['Song ID', 'Song Name', 'Difficulty', 'Rating', 'Score'];
  for (const col of requiredCols) {
    if (colIndex[col] === undefined) {
      return { scores, sourceType: 'sanbai', unmatchedSongs: [{ name: null, difficulty: null, reason: `missing_column_${col}` }] };
    }
  }
  
  console.log(`Processing ${lines.length - 1} Sanbai rows`);
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = line.split('\t');
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
    
    let match = await matchSanbaiChart(supabase, sanbaiSongId, diffInfo.playstyle, diffInfo.difficulty_name);
    
    if (!match && songName && rating > 0) {
      match = await matchByNameAndChart(supabase, songName, diffInfo.playstyle, diffInfo.difficulty_name, rating);
      
      if (match) {
        await discoverSanbaiSongId(supabase, match.song_id, sanbaiSongId);
      }
    }
    
    if (!match) {
      unmatchedSongs.push({ 
        name: songName, 
        difficulty: `${diffInfo.playstyle} ${diffInfo.difficulty_name} ${rating}`, 
        reason: 'no_match' 
      });
      continue;
    }
    
    scores.push({
      musicdb_id: match.id,
      chart_id: match.chart_id,
      song_id: match.song_id,
      playstyle: diffInfo.playstyle,
      difficulty_name: diffInfo.difficulty_name,
      difficulty_level: rating,
      score: scoreVal,
      timestamp: null,
      username: null,
      rank: grade,
      flare: parseSanbaiFlare(flare),
      halo: normalizeSanbaiLamp(lamp),
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
