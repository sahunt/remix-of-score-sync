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
// JSON Sanitization - Handle malformed JSON with control characters
// ============================================================================

function sanitizeJsonString(content: string): string {
  // JSON doesn't allow raw control characters (0x00-0x1F) inside string literals
  // except when properly escaped as \n, \r, \t, etc.
  // 
  // The problem: PhaseII exports contain raw control characters AND raw newlines
  // inside JSON string values (e.g., song names with line breaks)
  //
  // Solution: Process the JSON character by character, escaping control characters
  // when we're inside a string literal
  
  const chars: string[] = [];
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const code = content.charCodeAt(i);
    
    if (escaped) {
      // Previous char was backslash, this is an escape sequence
      chars.push(char);
      escaped = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      // Start of escape sequence
      chars.push(char);
      escaped = true;
      continue;
    }
    
    if (char === '"' && !escaped) {
      // Toggle string mode
      inString = !inString;
      chars.push(char);
      continue;
    }
    
    if (inString && code < 32) {
      // Control character inside string - escape or remove it
      if (code === 9) {
        chars.push('\\t');  // Tab
      } else if (code === 10) {
        chars.push('\\n');  // Newline - escape it properly
      } else if (code === 13) {
        chars.push('\\r');  // Carriage return
      } else {
        // Other control characters - remove them
        continue;
      }
    } else if (!inString && code < 32 && code !== 9 && code !== 10 && code !== 13) {
      // Control character outside string - remove it
      continue;
    } else {
      chars.push(char);
    }
  }
  
  return chars.join('');
}

// ============================================================================
// Source Detection
// ============================================================================

function detectSourceType(content: string): 'phaseii' | 'sanbai' | 'unknown' {
  const trimmed = content.trim();
  
  // Check for Sanbai TSV first (has "Song ID" header with tabs)
  const firstLine = trimmed.split('\n')[0];
  if (firstLine.includes('Song ID') && firstLine.includes('\t')) {
    return 'sanbai';
  }
  
  // Check for JSON formats (PhaseII)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      // Sanitize JSON before parsing to handle control characters
      const sanitized = sanitizeJsonString(trimmed);
      const parsed = JSON.parse(sanitized);
      
      // Log the structure for debugging
      if (Array.isArray(parsed)) {
        console.log(`JSON array with ${parsed.length} items`);
        if (parsed.length > 0) {
          console.log('First item keys:', Object.keys(parsed[0] || {}));
          // PhaseII exports DDR scores as array with score objects
          // Check for common DDR score fields
          const first = parsed[0];
          if (first?.song || first?.chart || first?.score !== undefined || 
              first?.points !== undefined || first?.difficulty || first?.lamp ||
              first?.flareRank !== undefined || first?.flareSkill !== undefined) {
            return 'phaseii';
          }
        }
      } else if (typeof parsed === 'object') {
        console.log('JSON object keys:', Object.keys(parsed));
        // Check for headers/data structure
        if (parsed.headers && parsed.data) return 'phaseii';
        // Check if it's a wrapper object with an array
        if (parsed.scores && Array.isArray(parsed.scores)) return 'phaseii';
        if (parsed.data && Array.isArray(parsed.data)) return 'phaseii';
      }
      
      // If it's valid JSON but we don't recognize the structure, 
      // still try to process it as PhaseII
      return 'phaseii';
    } catch (err) {
      console.error('JSON parse error in detection:', err);
      // If it looks like JSON but failed to parse, still try as phaseii
      // The processing step will do more robust parsing
      return 'phaseii';
    }
  }
  
  return 'unknown';
}

// ============================================================================
// PhaseII Parser
// ============================================================================

function parsePhaseIIChart(chart: string): { playstyle: string; difficulty_name: string; difficulty_level: number } | null {
  // "SP CHALLENGE - 14" -> { playstyle: 'SP', difficulty_name: 'CHALLENGE', level: 14 }
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
  // Remove commas: "999,910" -> 999910
  return parseInt(points.replace(/,/g, '')) || null;
}

// ============================================================================
// Sanbai Parser
// ============================================================================

function parseSanbaiDifficulty(code: string): { playstyle: string; difficulty_name: string } | null {
  // "ESP" -> { playstyle: 'SP', difficulty_name: 'EXPERT' }
  // "CDP" -> { playstyle: 'DP', difficulty_name: 'CHALLENGE' }
  // "bSP" -> { playstyle: 'SP', difficulty_name: 'BEGINNER' }
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
  // Handle "Life4" or other special lamps as life4
  if (normalized.includes('life')) return 'life4';
  return 'clear';
}

function parseSanbaiFlare(flare: string | null | undefined): number | null {
  if (!flare) return null;
  // Flare can be roman numerals: "X", "IX", "VIII", etc. or "EX"
  const romanMap: Record<string, number> = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
    'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
    'EX': 10 // EX is max flare
  };
  const upper = flare.toUpperCase().trim();
  return romanMap[upper] ?? null;
}

// ============================================================================
// Matching Functions
// ============================================================================

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
  // Update ALL charts for this song with the sanbai_song_id
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
// Fetch Existing Scores for User
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
// PhaseII Processing - Flexible JSON parser for various DDR score formats
// ============================================================================

// Extract song name from various possible field names
function extractSongName(item: any): string | null {
  return item.song?.name || item.songName || item.name || item.title || 
         item.song?.title || item.musicTitle || null;
}

// Extract chart/difficulty info from various field formats
function extractChartInfo(item: any): { playstyle: string; difficulty_name: string; difficulty_level: number } | null {
  // Try nested song.chart format: "SP CHALLENGE - 14"
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
  
  // Try separate chart field: "SP EXPERT - 15"
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
  
  // Try difficulty field with level: { difficulty: "EXPERT", level: 15, playStyle: "SP" }
  if (item.difficulty && (item.level !== undefined || item.difficultyLevel !== undefined)) {
    const level = item.level ?? item.difficultyLevel ?? 0;
    const playstyle = item.playStyle || item.playstyle || item.style || 'SP';
    return {
      playstyle: playstyle.toUpperCase(),
      difficulty_name: String(item.difficulty).toUpperCase(),
      difficulty_level: parseInt(level)
    };
  }
  
  // Try diffLv format (array index based)
  // This is less common but some exports use it
  
  return null;
}

// Extract score value from various field names
function extractScore(item: any): number | null {
  const raw = item.points ?? item.score ?? item.highScore ?? item.exScore ?? null;
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return raw;
  // Remove commas: "999,910" -> 999910
  return parseInt(String(raw).replace(/,/g, '')) || null;
}

// Extract halo/lamp from various field names
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

// Extract flare from various field names  
function extractFlare(item: any): number | null {
  const raw = item.data?.flare ?? item.flare ?? item.flareRank ?? item.flareSkill ?? null;
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return raw;
  
  // Handle roman numerals or "EX"
  const romanMap: Record<string, number> = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
    'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
    'EX': 10
  };
  const upper = String(raw).toUpperCase().trim();
  return romanMap[upper] ?? (parseInt(raw) || null);
}

// Extract rank/grade from various field names
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
    // Sanitize JSON to remove control characters before parsing
    const sanitized = sanitizeJsonString(content.trim());
    parsed = JSON.parse(sanitized);
  } catch (err) {
    console.error('PhaseII JSON parse error:', err);
    return { scores, sourceType: 'phaseii', unmatchedSongs: [{ name: null, difficulty: null, reason: 'invalid_json' }] };
  }
  
  // Handle various wrapper formats
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
    // Maybe the object itself contains score fields?
    dataArray = [parsed];
  }
  
  console.log(`Processing ${dataArray.length} PhaseII entries`);
  
  // Log first item structure for debugging
  if (dataArray.length > 0) {
    const sample = dataArray[0];
    console.log('Sample item structure:', JSON.stringify(sample, null, 2).substring(0, 500));
  }
  
  for (const item of dataArray) {
    const songName = extractSongName(item);
    const chartInfo = extractChartInfo(item);
    
    if (!songName) {
      console.log('Skipping item - no song name found:', JSON.stringify(item).substring(0, 200));
      unmatchedSongs.push({ name: null, difficulty: null, reason: 'missing_song_name' });
      continue;
    }
    
    if (!chartInfo) {
      console.log('Skipping item - no chart info found:', songName);
      unmatchedSongs.push({ name: songName, difficulty: null, reason: 'missing_chart_info' });
      continue;
    }
    
    // Match to musicdb by name + playstyle + difficulty_name + level
    const match = await matchByNameAndChart(
      supabase,
      songName,
      chartInfo.playstyle,
      chartInfo.difficulty_name,
      chartInfo.difficulty_level
    );
    
    if (!match) {
      unmatchedSongs.push({ 
        name: songName, 
        difficulty: `${chartInfo.playstyle} ${chartInfo.difficulty_name} ${chartInfo.difficulty_level}`, 
        reason: 'no_match' 
      });
      continue;
    }
    
    scores.push({
      musicdb_id: match.id,
      chart_id: match.chart_id,
      song_id: match.song_id,
      playstyle: chartInfo.playstyle,
      difficulty_name: chartInfo.difficulty_name,
      difficulty_level: chartInfo.difficulty_level,
      score: extractScore(item),
      timestamp: item.timestamp || item.playedAt || item.date || null,
      username: item.username || item.playerName || null,
      rank: extractRank(item),
      flare: extractFlare(item),
      halo: extractHalo(item),
      source_type: 'phaseii',
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
  
  // Parse header to get column indices
  const headers = lines[0].split('\t').map(h => h.trim());
  const colIndex: Record<string, number> = {};
  headers.forEach((h, i) => { colIndex[h] = i; });
  
  // Required columns
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
    
    // Try primary match: sanbai_song_id + playstyle + difficulty_name
    let match = await matchSanbaiChart(supabase, sanbaiSongId, diffInfo.playstyle, diffInfo.difficulty_name);
    
    // Fallback: name + playstyle + difficulty_name + level
    if (!match && songName && rating > 0) {
      match = await matchByNameAndChart(supabase, songName, diffInfo.playstyle, diffInfo.difficulty_name, rating);
      
      // If fallback matched, discover the sanbai_song_id for future matches
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
      timestamp: null, // Sanbai doesn't include timestamps
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
// Smart Upsert - Merge best values from existing and new scores
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
  
  for (const score of scores) {
    if (!score.musicdb_id) {
      skipped++;
      continue;
    }
    
    const existing = existingScores.get(score.musicdb_id);
    
    if (!existing) {
      // No existing score - insert new record using upsert to handle race conditions
      const { error: insertError } = await supabase
        .from('user_scores')
        .upsert({
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
        }, {
          onConflict: 'user_id,musicdb_id',
          ignoreDuplicates: false, // Update if exists
        });
      
      if (insertError) {
        console.error('Upsert error:', insertError);
        // Continue with other scores
      } else {
        inserted++;
      }
    } else {
      // Existing score - compute the best values
      const bestScore = getBetterScore(existing.score, score.score);
      const bestHalo = getBetterHalo(existing.halo, score.halo);
      const bestFlare = getBetterFlare(existing.flare, score.flare);
      const bestRank = getBetterRank(existing.rank, score.rank);
      
      // Check if anything improved
      const scoreImproved = bestScore !== existing.score;
      const haloImproved = bestHalo !== existing.halo;
      const flareImproved = bestFlare !== existing.flare;
      const rankImproved = bestRank !== existing.rank;
      
      if (scoreImproved || haloImproved || flareImproved || rankImproved) {
        const { error: updateError } = await supabase
          .from('user_scores')
          .update({
            score: bestScore,
            halo: bestHalo,
            flare: bestFlare,
            rank: bestRank,
            upload_id: uploadId, // Track which upload caused the update
          })
          .eq('id', existing.id);
        
        if (updateError) {
          console.error('Update error:', updateError);
          // Continue with other updates
        } else {
          updated++;
        }
      } else {
        skipped++;
      }
    }
  }
  
  if (inserted > 0) {
    console.log(`Inserted ${inserted} new scores`);
  }
  if (updated > 0) {
    console.log(`Updated ${updated} existing scores with improvements`);
  }
  
  return {
    inserted,
    updated,
    skipped,
  };
}

// ============================================================================
// Main Handler
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

    // Create upload record
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .insert({
        user_id: user.id,
        file_name,
        file_mime_type,
        file_size_bytes,
        raw_storage_path,
        parse_status: 'pending',
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

    // Process based on source type
    let parseResult: ParseResult;
    
    if (sourceType === 'phaseii') {
      parseResult = await processPhaseII(supabase, content);
    } else if (sourceType === 'sanbai') {
      parseResult = await processSanbai(supabase, content);
    } else {
      // Unknown format - mark as failed
      await supabase
        .from('uploads')
        .update({
          parse_status: 'failed',
          parse_error: 'Unknown file format. Expected PhaseII JSON or Sanbai TSV.',
        })
        .eq('id', uploadId);

      return new Response(JSON.stringify({
        error: 'Unknown file format. Expected PhaseII JSON or Sanbai TSV.',
        total_rows: 0,
        mapped_rows: 0,
        skipped_rows: 0,
        source_type: 'unknown',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

      return new Response(JSON.stringify({
        error: 'No scores could be matched to the catalog',
        total_rows: parseResult.unmatchedSongs.length,
        mapped_rows: 0,
        skipped_rows: parseResult.unmatchedSongs.length,
        source_type: parseResult.sourceType,
        unmatched_songs: parseResult.unmatchedSongs,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch existing scores for smart upsert
    const musicdbIds = parseResult.scores
      .map(s => s.musicdb_id)
      .filter((id): id is number => id !== null);
    
    const existingScores = await fetchExistingScores(supabase, user.id, musicdbIds);
    console.log(`Found ${existingScores.size} existing scores for comparison`);

    // Smart upsert - merge best values
    let upsertResult: UpsertResult;
    try {
      upsertResult = await smartUpsertScores(
        supabase,
        user.id,
        uploadId,
        parseResult.scores,
        existingScores
      );
    } catch (err) {
      console.error('Upsert error:', err);
      await supabase
        .from('uploads')
        .update({
          parse_status: 'failed',
          parse_error: err instanceof Error ? err.message : 'Failed to save scores',
        })
        .eq('id', uploadId);

      return new Response(JSON.stringify({
        error: err instanceof Error ? err.message : 'Failed to save scores',
        total_rows: parseResult.scores.length + parseResult.unmatchedSongs.length,
        mapped_rows: 0,
        skipped_rows: parseResult.scores.length + parseResult.unmatchedSongs.length,
        source_type: parseResult.sourceType,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    return new Response(JSON.stringify({
      upload_id: uploadId,
      total_rows: totalRows,
      mapped_rows: parseResult.scores.length,
      skipped_rows: parseResult.unmatchedSongs.length,
      inserted: upsertResult.inserted,
      updated: upsertResult.updated,
      unchanged: upsertResult.skipped,
      source_type: parseResult.sourceType,
      unmatched_songs: parseResult.unmatchedSongs,
    }), {
      status: 200,
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