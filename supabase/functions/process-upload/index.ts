import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// ============================================================================
// SHARED TYPES - Minimal shared interfaces for parser outputs
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
  song_name?: string | null;
  difficulty_name?: string | null;
  difficulty_level?: number | null;
}

interface ScoreChange {
  song_name: string;
  difficulty_name: string;
  difficulty_level: number;
  old_score: number | null;
  new_score: number | null;
  old_flare: number | null;
  new_flare: number | null;
  old_rank: string | null;
  new_rank: string | null;
  old_halo: string | null;
  new_halo: string | null;
}

// ============================================================================
// SHARED UTILITIES - Small, focused helpers used by both parsers
// ============================================================================

const HALO_RANK: Record<string, number> = {
  'clear': 1,
  'life4': 2,
  'fc': 3,
  'gfc': 4,
  'pfc': 5,
  'mfc': 6,
};

const GRADE_RANK: Record<string, number> = {
  'E': 1, 'D': 2, 'D+': 3, 'C-': 4, 'C': 5, 'C+': 6,
  'B-': 7, 'B': 8, 'B+': 9, 'A-': 10, 'A': 11, 'A+': 12,
  'AA-': 13, 'AA': 14, 'AA+': 15, 'AAA': 16,
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
// SOURCE DETECTION - Isolated, simple detection logic
// ============================================================================

function detectSourceType(content: string): 'phaseii' | 'sanbai' | 'unknown' {
  const trimmed = content.trim();
  
  // Check for Sanbai CSV/TSV header
  const firstLine = trimmed.split('\n')[0];
  if (firstLine.includes('Song ID') && (firstLine.includes('\t') || firstLine.includes(','))) {
    console.log('Source detected: Sanbai (header contains "Song ID")');
    return 'sanbai';
  }
  
  // Check for JSON (PhaseII)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    console.log('Source detected: PhaseII (JSON structure)');
    return 'phaseii';
  }
  
  console.log('Source detection: unknown format');
  return 'unknown';
}

// ============================================================================
// PHASEII PARSER MODULE - Completely isolated
// ============================================================================
// This module handles PhaseII JSON parsing. It has NO dependencies on Sanbai logic.
// All functions in this section are prefixed with 'phaseii_' for clarity.
// ============================================================================

interface PhaseIIEntry {
  songId: number | null;
  songName: string | null;  // Added for better error reporting
  chart: string | null;
  points: string | null;
  halo: string | null;
  rank: string | null;
  flare: number | null;
  timestamp: string | null;
}

// Remove control characters and invalid unicode sequences that break JSON parsing
// This handles Shift-JIS corruption, invalid UTF-8, and other encoding issues
function phaseii_sanitizeContent(content: string): string {
  let sanitized = content.replace(/^\uFEFF/, ''); // Remove BOM
  
  // Replace common problematic sequences that appear in corrupted exports
  // These patterns appear when Shift-JIS is incorrectly decoded as UTF-8
  sanitized = sanitized.replace(/<0x[a-fA-F0-9]+>/g, '?'); // Hex escape sequences like <0xad>
  sanitized = sanitized.replace(/\\x[a-fA-F0-9]{2}/g, '?'); // Escaped hex like \xad
  
  // Remove ASCII control characters except tab/newline/carriage return
  // Also remove high surrogates that are unpaired (common with encoding errors)
  const cleanedChars: string[] = [];
  let removedCount = 0;
  
  for (let i = 0; i < sanitized.length; i++) {
    const code = sanitized.charCodeAt(i);
    
    // Skip ASCII control characters (except whitespace)
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      removedCount++;
      continue;
    }
    
    // Skip DEL character
    if (code === 127) {
      removedCount++;
      continue;
    }
    
    // Skip replacement character (often indicates encoding errors)
    if (code === 0xFFFD) {
      removedCount++;
      cleanedChars.push('?');
      continue;
    }
    
    // Skip unpaired surrogates (0xD800-0xDFFF)
    if (code >= 0xD800 && code <= 0xDFFF) {
      const nextCode = i + 1 < sanitized.length ? sanitized.charCodeAt(i + 1) : 0;
      // Check if this is a proper surrogate pair
      if (code >= 0xD800 && code <= 0xDBFF && nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
        // Valid surrogate pair - keep both
        cleanedChars.push(sanitized[i]);
        cleanedChars.push(sanitized[i + 1]);
        i++; // Skip the next char since we already processed it
        continue;
      }
      // Unpaired surrogate - skip
      removedCount++;
      continue;
    }
    
    cleanedChars.push(sanitized[i]);
  }
  sanitized = cleanedChars.join('');
  
  console.log(`PhaseII: Sanitized content - removed ${removedCount} problematic characters`);
  return sanitized;
}

// Extract a JSON array from content by key name using bracket matching
function phaseii_extractArray(content: string, key: string): string | null {
  const pattern = new RegExp(`"${key}"\\s*:\\s*\\[`);
  const match = content.match(pattern);
  
  if (!match || match.index === undefined) return null;
  
  const startIdx = match.index + match[0].length - 1; // Include the '['
  let depth = 0;
  let endIdx = startIdx;
  let inString = false;
  let escaped = false;
  
  for (let i = startIdx; i < content.length; i++) {
    const char = content[i];
    
    if (escaped) { escaped = false; continue; }
    if (char === '\\' && inString) { escaped = true; continue; }
    if (char === '"' && !escaped) { inString = !inString; continue; }
    
    if (!inString) {
      if (char === '[') depth++;
      else if (char === ']') {
        depth--;
        if (depth === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
  }
  
  return content.substring(startIdx, endIdx);
}

// Extract objects from a JSON array string
function phaseii_extractObjectsFromArray(arrayContent: string): string[] {
  const objects: string[] = [];
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
        if (depth === 0) currentBlock = '';
        depth++;
        currentBlock += char;
      } else if (char === '}') {
        depth--;
        currentBlock += char;
        if (depth === 0 && currentBlock.trim()) {
          objects.push(currentBlock);
          currentBlock = '';
        }
      } else if (char === '[' && depth === 0) {
        continue;
      } else if (char === ']' && depth === 0) {
        break;
      } else {
        if (depth > 0) currentBlock += char;
      }
    } else {
      currentBlock += char;
    }
  }
  
  return objects;
}

// Extract entry blocks from JSON content
// PhaseII format: { headers: [...], data: [{ userId, username, scores: [...] }, ...] }
// Each player in data array has a nested "scores" array with the actual score entries
function phaseii_extractBlocks(content: string): string[] {
  const sanitized = phaseii_sanitizeContent(content);
  
  // Check if this is a wrapper with "data" array (format 2: player-level export)
  const dataArrayContent = phaseii_extractArray(sanitized, 'data');
  
  if (dataArrayContent) {
    console.log(`PhaseII: Found wrapper object with data array (length: ${dataArrayContent.length})`);
    
    // Extract player objects from data array
    const playerObjects = phaseii_extractObjectsFromArray(dataArrayContent);
    console.log(`PhaseII: Found ${playerObjects.length} player objects`);
    
    if (playerObjects.length > 0) {
      // Log sample player structure - show more to find all keys
      const samplePlayer = playerObjects[0];
      console.log(`PhaseII: Sample player object (first 500 chars): ${samplePlayer.substring(0, 500)}`);
      
      // Log all array keys we find in the first player object
      const arrayKeyMatches = samplePlayer.matchAll(/"(\w+)"\s*:\s*\[/g);
      const arrayKeys = [...arrayKeyMatches].map(m => m[1]);
      console.log(`PhaseII: Array keys found in player object: ${arrayKeys.join(', ') || 'none'}`);
    }
    
    // Now extract scores from each player object
    const allScoreBlocks: string[] = [];
    
    // Try multiple possible array key names for scores
    const possibleScoreKeys = ['scores', 'ddr', 'records', 'plays', 'history', 'results'];
    
    for (const playerObj of playerObjects) {
      for (const key of possibleScoreKeys) {
        const scoresArray = phaseii_extractArray(playerObj, key);
        if (scoresArray) {
          console.log(`PhaseII: Found '${key}' array in player object`);
          const scoreObjects = phaseii_extractObjectsFromArray(scoresArray);
          allScoreBlocks.push(...scoreObjects);
          break; // Found scores for this player, move to next
        }
      }
    }
    
    console.log(`PhaseII: Extracted ${allScoreBlocks.length} score blocks from player objects`);
    
    if (allScoreBlocks.length > 0) {
      const sampleScore = allScoreBlocks[0].substring(0, 300);
      console.log(`PhaseII: Sample score block: ${sampleScore}`);
      return allScoreBlocks;
    }
    
    // If no nested scores found, the data array might contain score objects directly
    // Mixed format: some entries might be player profiles, others are score records
    console.log('PhaseII: No nested scores found, checking if data contains score objects directly');
    
    // Filter objects to only those that look like score entries (have "song" object)
    const scoreObjects = playerObjects.filter(obj => obj.includes('"song"'));
    
    if (scoreObjects.length > 0) {
      console.log(`PhaseII: Found ${scoreObjects.length} score objects in data array (filtered from ${playerObjects.length} total)`);
      const sampleScore = scoreObjects[0].substring(0, 400);
      console.log(`PhaseII: Sample score object: ${sampleScore}`);
      return scoreObjects;
    }
    
    // Check if any object has chart or points (alternative score format)
    const altScoreObjects = playerObjects.filter(obj => 
      obj.includes('"chart"') || obj.includes('"points"')
    );
    
    if (altScoreObjects.length > 0) {
      console.log(`PhaseII: Found ${altScoreObjects.length} alternative score objects`);
      return altScoreObjects;
    }
    
    // No score-like objects found
    console.log('PhaseII: No score objects found in data array');
    return playerObjects;
  }
  
  // Format 1: Direct array of score objects [{ song: {...}, chart: "...", ... }, ...]
  if (sanitized.trim().startsWith('[')) {
    console.log('PhaseII: Processing as direct array of score objects');
    const objects = phaseii_extractObjectsFromArray(sanitized);
    
    if (objects.length > 0) {
      const firstObj = objects[0];
      const sampleContent = firstObj.substring(0, 200);
      console.log(`PhaseII: First block sample: ${sampleContent}`);
      
      // Check if this is aggregated song-catalog format
      // Characteristics: has "charts" array and top-level numeric "id", no "song" object
      if (firstObj.includes('"charts"') && 
          firstObj.match(/"id"\s*:\s*\d+/) && 
          !firstObj.includes('"song"')) {
        console.log('PhaseII: Detected aggregated song-chart format');
        return phaseii_extractAggregatedBlocks(objects);
      }
    }
    
    return objects;
  }
  
  // Format 3: Single object - try to find any array within
  console.log('PhaseII: Trying to find any array in the object');
  const objects = phaseii_extractObjectsFromArray(sanitized);
  return objects;
}

// Chart index to playstyle/difficulty mapping (official PhaseII table)
const PHASEII_CHART_MAP: Record<number, { playstyle: string; difficulty: string }> = {
  0: { playstyle: 'SP', difficulty: 'BEGINNER' },
  1: { playstyle: 'SP', difficulty: 'BASIC' },
  2: { playstyle: 'SP', difficulty: 'DIFFICULT' },
  3: { playstyle: 'SP', difficulty: 'EXPERT' },
  4: { playstyle: 'SP', difficulty: 'CHALLENGE' },
  5: { playstyle: 'DP', difficulty: 'BEGINNER' },
  6: { playstyle: 'DP', difficulty: 'BASIC' },
  7: { playstyle: 'DP', difficulty: 'DIFFICULT' },
  8: { playstyle: 'DP', difficulty: 'EXPERT' },
  9: { playstyle: 'DP', difficulty: 'CHALLENGE' },
};

// Extract score blocks from aggregated song-catalog format
// This format has songs as top-level objects with nested charts arrays
function phaseii_extractAggregatedBlocks(songObjects: string[]): string[] {
  const scoreBlocks: string[] = [];
  let processedSongs = 0;
  let chartsWithRecords = 0;
  
  for (const songObj of songObjects) {
    // Extract song_id (mcode) from top level
    const songIdMatch = songObj.match(/"id"\s*:\s*(\d+)/);
    if (!songIdMatch) continue;
    const songId = songIdMatch[1];
    processedSongs++;
    
    // Extract charts array
    const chartsArray = phaseii_extractArray(songObj, 'charts');
    if (!chartsArray) continue;
    
    const chartObjects = phaseii_extractObjectsFromArray(chartsArray);
    
    for (const chartObj of chartObjects) {
      // Only process charts with a record (played charts)
      if (!chartObj.includes('"record"')) continue;
      
      // Extract chart index (0-9)
      const chartMatch = chartObj.match(/"chart"\s*:\s*(\d+)/);
      if (!chartMatch) continue;
      const chartIndex = parseInt(chartMatch[1]);
      
      // Extract difficulty level from nested data object
      const chartDataContent = phaseii_extractNestedObject(chartObj, 'data');
      const diffMatch = chartDataContent?.match(/"difficulty"\s*:\s*(\d+)/);
      const diffLevel = diffMatch ? diffMatch[1] : '0';
      
      // Extract record object
      const recordContent = phaseii_extractNestedObject(chartObj, 'record');
      if (!recordContent) continue;
      
      chartsWithRecords++;
      
      // Build a synthetic block that phaseii_extractFields can parse
      const syntheticBlock = phaseii_buildSyntheticBlock(songId, chartIndex, diffLevel, recordContent);
      scoreBlocks.push(syntheticBlock);
    }
  }
  
  console.log(`PhaseII: Processed ${processedSongs} songs, extracted ${chartsWithRecords} score blocks from aggregated format`);
  return scoreBlocks;
}

// Build a synthetic score block from aggregated format data
// Converts to the format that phaseii_extractFields() expects
function phaseii_buildSyntheticBlock(
  songId: string, 
  chartIndex: number, 
  diffLevel: string, 
  recordContent: string
): string {
  const chartInfo = PHASEII_CHART_MAP[chartIndex] || { playstyle: 'SP', difficulty: 'UNKNOWN' };
  const chartString = `${chartInfo.playstyle} ${chartInfo.difficulty} - ${diffLevel}`;
  
  // Extract fields from record content
  const pointsMatch = recordContent.match(/"points"\s*:\s*(\d+)/);
  const points = pointsMatch ? pointsMatch[1] : '0';
  
  // Convert Unix timestamp to ISO string
  const timestampMatch = recordContent.match(/"timestamp"\s*:\s*(\d+)/);
  const timestamp = timestampMatch 
    ? new Date(parseInt(timestampMatch[1]) * 1000).toISOString()
    : null;
  
  // Extract nested data from record.data
  const recordDataContent = phaseii_extractNestedObject(`{${recordContent}}`, 'data');
  const haloMatch = recordDataContent?.match(/"halo"\s*:\s*(\d+)/);
  const rankMatch = recordDataContent?.match(/"rank"\s*:\s*(\d+)/);
  const flareMatch = recordDataContent?.match(/"flare"\s*:\s*(\d+)/);
  
  // Build synthetic block in existing format
  return JSON.stringify({
    song: { id: parseInt(songId), chart: chartString },
    points: points,
    data: {
      halo: haloMatch ? haloMatch[1] : null,
      rank: rankMatch ? rankMatch[1] : null,
      flare: flareMatch ? parseInt(flareMatch[1]) : null
    },
    timestamp: timestamp
  });
}

// Find the bounds of a nested JSON object and extract content within
function phaseii_extractNestedObject(block: string, key: string): string | null {
  const startPattern = new RegExp(`"${key}"\\s*:\\s*\\{`);
  const match = block.match(startPattern);
  
  if (!match || match.index === undefined) return null;
  
  const startIdx = match.index + match[0].length;
  let depth = 1;
  let endIdx = startIdx;
  let inString = false;
  let escaped = false;
  
  for (let i = startIdx; i < block.length && depth > 0; i++) {
    const char = block[i];
    
    if (escaped) { escaped = false; continue; }
    if (char === '\\' && inString) { escaped = true; continue; }
    if (char === '"' && !escaped) { inString = !inString; continue; }
    
    if (!inString) {
      if (char === '{') depth++;
      else if (char === '}') depth--;
    }
    endIdx = i;
  }
  
  return block.substring(startIdx, endIdx);
}

// Extract fields from a single entry block
// PhaseII score format:
// {
//   "song": { "id": 38656, "chart": "SP EXPERT - 16", ... },
//   "points": "997,310",
//   "data": { "halo": "CLEARED", "rank": "AAA", "flare": 10, ... },
//   "timestamp": "2026-01-20 08:27:37"
// }
// Safely extract fields from a block, tolerating encoding errors
// CRITICAL: This function must never throw - it wraps all operations in try-catch
// and focuses on extracting the essential numeric IDs (songId) and chart info
function phaseii_extractFields(block: string): PhaseIIEntry {
  let songId: number | null = null;
  let songName: string | null = null;
  let chart: string | null = null;
  let points: string | null = null;
  let halo: string | null = null;
  let rank: string | null = null;
  let flare: number | null = null;
  let timestamp: string | null = null;
  
  try {
    // PRIORITY: Extract song.id first - this is the critical matching field
    // Use a simple regex that works even with corrupted surrounding content
    // Look for "id": followed by a number anywhere after "song"
    const songIdMatch = block.match(/"song"\s*:\s*\{[^}]*?"id"\s*:\s*(\d+)/);
    if (songIdMatch) {
      songId = parseInt(songIdMatch[1]);
    } else {
      // Fallback: try to find id in a song object using nested extraction
      const songContent = phaseii_extractNestedObject(block, 'song');
      if (songContent) {
        const idMatch = songContent.match(/"id"\s*:\s*(\d+)/);
        if (idMatch) songId = parseInt(idMatch[1]);
      }
    }
  } catch (e) {
    // If song ID extraction fails, try a more aggressive pattern
    try {
      // Look for any "id": number pattern after "song"
      const songSection = block.substring(block.indexOf('"song"'));
      const idMatch = songSection.match(/"id"\s*:\s*(\d+)/);
      if (idMatch) songId = parseInt(idMatch[1]);
    } catch (_) { /* Continue without songId */ }
  }
  
  try {
    // Extract chart - second most critical field for matching
    // Chart can be a string "SP EXPERT - 16" OR a numeric index (0-9)
    // Numeric chart format: 0-4 = SP (BEGINNER, BASIC, DIFFICULT, EXPERT, CHALLENGE)
    //                       5-9 = DP (BEGINNER, BASIC, DIFFICULT, EXPERT, CHALLENGE) but often 5 is omitted
    //                       so 5/6/7/8/9 are BASIC, DIFFICULT, EXPERT, CHALLENGE for DP
    
    // First try string format
    const chartStrMatch = block.match(/"chart"\s*:\s*"((SP|DP)\s+\w+\s*-\s*\d+)"/);
    if (chartStrMatch) {
      chart = chartStrMatch[1];
    } else {
      // Try numeric chart format - look inside "song" object
      const songContent = phaseii_extractNestedObject(block, 'song');
      if (songContent) {
        const numericChartMatch = songContent.match(/"chart"\s*:\s*(\d+)/);
        if (numericChartMatch) {
          const chartIndex = parseInt(numericChartMatch[1]);
          // Also extract difficulty level from song.data.difficulty
          const diffMatch = songContent.match(/"difficulty"\s*:\s*(\d+)/);
          const diffLevel = diffMatch ? parseInt(diffMatch[1]) : 0;
          
          // Convert chart index to playstyle + difficulty name
          const CHART_MAP: Record<number, { playstyle: string; difficulty: string }> = {
            0: { playstyle: 'SP', difficulty: 'BEGINNER' },
            1: { playstyle: 'SP', difficulty: 'BASIC' },
            2: { playstyle: 'SP', difficulty: 'DIFFICULT' },
            3: { playstyle: 'SP', difficulty: 'EXPERT' },
            4: { playstyle: 'SP', difficulty: 'CHALLENGE' },
            5: { playstyle: 'DP', difficulty: 'BEGINNER' },
            6: { playstyle: 'DP', difficulty: 'BASIC' },
            7: { playstyle: 'DP', difficulty: 'DIFFICULT' },
            8: { playstyle: 'DP', difficulty: 'EXPERT' },
            9: { playstyle: 'DP', difficulty: 'CHALLENGE' },
          };
          
          const chartInfo = CHART_MAP[chartIndex];
          if (chartInfo && diffLevel > 0) {
            chart = `${chartInfo.playstyle} ${chartInfo.difficulty} - ${diffLevel}`;
          }
        }
      }
      
      // Fallback: try numeric chart at top level
      if (!chart) {
        const topLevelChart = block.match(/"chart"\s*:\s*(\d+)/);
        if (topLevelChart) {
          const chartIndex = parseInt(topLevelChart[1]);
          const diffMatch = block.match(/"difficulty"\s*:\s*(\d+)/);
          const diffLevel = diffMatch ? parseInt(diffMatch[1]) : 0;
          
          const CHART_MAP: Record<number, { playstyle: string; difficulty: string }> = {
            0: { playstyle: 'SP', difficulty: 'BEGINNER' },
            1: { playstyle: 'SP', difficulty: 'BASIC' },
            2: { playstyle: 'SP', difficulty: 'DIFFICULT' },
            3: { playstyle: 'SP', difficulty: 'EXPERT' },
            4: { playstyle: 'SP', difficulty: 'CHALLENGE' },
            5: { playstyle: 'DP', difficulty: 'BEGINNER' },
            6: { playstyle: 'DP', difficulty: 'BASIC' },
            7: { playstyle: 'DP', difficulty: 'DIFFICULT' },
            8: { playstyle: 'DP', difficulty: 'EXPERT' },
            9: { playstyle: 'DP', difficulty: 'CHALLENGE' },
          };
          
          const chartInfo = CHART_MAP[chartIndex];
          if (chartInfo && diffLevel > 0) {
            chart = `${chartInfo.playstyle} ${chartInfo.difficulty} - ${diffLevel}`;
          }
        }
      }
    }
  } catch (_) { /* Continue without chart */ }
  
  try {
    // Extract song name - used for error reporting only, not for matching
    // This field is most likely to be corrupted due to encoding issues
    const nameMatch = block.match(/"name"\s*:\s*"([^"]{1,200})"/);
    if (nameMatch) {
      songName = nameMatch[1];
      // If the name looks corrupted (contains replacement chars or weird patterns), 
      // just mark it as unknown
      if (songName.includes('?') && songName.length < 10) {
        songName = `(encoding error - id:${songId || 'unknown'})`;
      }
    }
  } catch (_) { 
    songName = `(failed to extract name - id:${songId || 'unknown'})`;
  }
  
  try {
    // Extract points
    const quotedPoints = block.match(/"points"\s*:\s*"([^"]+)"/);
    if (quotedPoints) {
      points = quotedPoints[1];
    } else {
      const unquotedPoints = block.match(/"points"\s*:\s*(\d+)/);
      if (unquotedPoints) points = unquotedPoints[1];
    }
  } catch (_) { /* Continue without points */ }
  
  try {
    // Extract halo, rank, flare from nested "data" object or top level
    // IMPORTANT: These can be strings OR numeric codes
    // Numeric halo: 1000=fail, 200=clear, 2000=FC?, etc.
    // Numeric rank: 100=E, 200=D, 300=C, 400=B, 500=A, 600=AA, 700=AAA
    const dataContent = phaseii_extractNestedObject(block, 'data');
    if (dataContent) {
      // Try string halo first, then numeric
      const haloStrMatch = dataContent.match(/"halo"\s*:\s*"([^"]+)"/);
      if (haloStrMatch) {
        halo = haloStrMatch[1];
      } else {
        const haloNumMatch = dataContent.match(/"halo"\s*:\s*(\d+)/);
        if (haloNumMatch) halo = haloNumMatch[1]; // Keep as string, will convert later
      }
      
      // Try string rank first, then numeric
      const rankStrMatch = dataContent.match(/"rank"\s*:\s*"([^"]+)"/);
      if (rankStrMatch) {
        rank = rankStrMatch[1];
      } else {
        const rankNumMatch = dataContent.match(/"rank"\s*:\s*(\d+)/);
        if (rankNumMatch) rank = rankNumMatch[1]; // Keep as string, will convert later
      }
      
      const flareMatch = dataContent.match(/"flare"\s*:\s*(-?\d+)/);
      if (flareMatch) flare = parseInt(flareMatch[1]);
    }
    
    // Fallback: check top level
    if (halo === null) {
      const haloStrMatch = block.match(/"halo"\s*:\s*"([^"]+)"/);
      if (haloStrMatch) {
        halo = haloStrMatch[1];
      } else {
        const haloNumMatch = block.match(/"halo"\s*:\s*(\d+)/);
        if (haloNumMatch) halo = haloNumMatch[1];
      }
    }
    if (rank === null) {
      const rankStrMatch = block.match(/"rank"\s*:\s*"([^"]+)"/);
      if (rankStrMatch) {
        rank = rankStrMatch[1];
      } else {
        const rankNumMatch = block.match(/"rank"\s*:\s*(\d+)/);
        if (rankNumMatch) rank = rankNumMatch[1];
      }
    }
    if (flare === null) {
      const flareMatch = block.match(/"flare"\s*:\s*(-?\d+)/);
      if (flareMatch) flare = parseInt(flareMatch[1]);
    }
  } catch (_) { /* Continue without halo/rank/flare */ }
  
  try {
    const timestampMatch = block.match(/"timestamp"\s*:\s*"([^"]+)"/);
    if (timestampMatch) timestamp = timestampMatch[1];
  } catch (_) { /* Continue without timestamp */ }
  
  return { songId, songName, chart, points, halo, rank, flare, timestamp };
}

// Parse chart string like "SP EXPERT - 15"
function phaseii_parseChart(chart: string): { playstyle: string; difficulty_name: string; difficulty_level: number } | null {
  const match = chart.match(/^(SP|DP)\s+(\w+)\s*-\s*(\d+)$/);
  if (!match) return null;
  return {
    playstyle: match[1],
    difficulty_name: match[2].toUpperCase(),
    difficulty_level: parseInt(match[3])
  };
}

// Normalize halo string or numeric code to standard format
// Official PhaseII halo code mapping from the PhaseII source tables
function phaseii_normalizeHalo(halo: string | null): string | null {
  if (!halo) return null;
  
  // Check if it's a numeric code
  const numericValue = parseInt(halo);
  if (!isNaN(numericValue) && halo === String(numericValue)) {
    // Official PhaseII halo code mapping
    const numericMap: Record<number, string> = {
      100: 'clear',   // (empty)
      200: 'fc',      // FULL COMBO
      300: 'gfc',     // GREAT FULL COMBO
      400: 'pfc',     // PERFECT FULL COMBO
      500: 'mfc',     // MARVELOUS FULL COMBO
      600: 'clear',   // (empty)
      1000: 'fail',   // FAILED
      2000: 'clear',  // CLEARED
      4000: 'life4',  // LIFE4 CLEARED
    };
    
    // Check exact matches first
    if (numericMap[numericValue] !== undefined) {
      return numericMap[numericValue];
    }
    
    // Fallback for any unexpected codes - return 'clear' as safe default
    console.log(`PhaseII: Unknown halo code ${numericValue}, defaulting to 'clear'`);
    return 'clear';
  }
  
  // String-based normalization
  const normalized = halo.toUpperCase();
  const map: Record<string, string> = {
    'MARVELOUS FULL COMBO': 'mfc', 'MFC': 'mfc',
    'PERFECT FULL COMBO': 'pfc', 'PFC': 'pfc',
    'GREAT FULL COMBO': 'gfc', 'GFC': 'gfc',
    'GOOD FULL COMBO': 'fc', 'FULL COMBO': 'fc', 'FC': 'fc',
    'LIFE4': 'life4', 'LIFE 4': 'life4', 'LIFE4 CLEARED': 'life4',
    'CLEAR': 'clear', 'CLEARED': 'clear',
    'FAILED': 'fail', 'FAIL': 'fail',
  };
  return map[normalized] || 'clear';
}

// Normalize rank string or numeric code to standard format
// Official PhaseII rank code mapping from the PhaseII source tables
function phaseii_normalizeRank(rank: string | null): string | null {
  if (!rank) return null;
  
  // Check if it's a numeric code
  const numericValue = parseInt(rank);
  if (!isNaN(numericValue) && rank === String(numericValue)) {
    // Official PhaseII rank code mapping with +/- variants
    const numericMap: Record<number, string> = {
      100: 'E',
      200: 'D',
      233: 'D+',
      266: 'C-',
      300: 'C',
      333: 'C+',
      366: 'B-',
      400: 'B',
      433: 'B+',
      466: 'A-',
      500: 'A',
      533: 'A+',
      566: 'AA-',
      600: 'AA',
      650: 'AA+',
      700: 'AAA',
    };
    
    // Check exact matches first
    if (numericMap[numericValue]) {
      return numericMap[numericValue];
    }
    
    // Handle ranges for any unexpected values
    if (numericValue < 200) return 'E';
    if (numericValue < 266) return 'D';
    if (numericValue < 300) return 'C-';
    if (numericValue < 366) return 'C';
    if (numericValue < 400) return 'B-';
    if (numericValue < 466) return 'B';
    if (numericValue < 500) return 'A-';
    if (numericValue < 566) return 'A';
    if (numericValue < 600) return 'AA-';
    if (numericValue < 700) return 'AA';
    return 'AAA';
  }
  
  // Already a string - just normalize case
  const upper = rank.toUpperCase();
  // Valid ranks in DDR
  const validRanks = ['E', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'AA-', 'AA', 'AA+', 'AAA'];
  if (validRanks.includes(upper)) {
    return upper;
  }
  return upper; // Return as-is if not recognized
}

// Parse score points
function phaseii_parseScore(points: string | null): number | null {
  if (!points) return null;
  return parseInt(points.replace(/,/g, '')) || null;
}

// Batch match by song_id
async function phaseii_batchMatch(
  supabase: any,
  entries: Array<{ songId: number; playstyle: string; difficultyName: string; difficultyLevel: number }>
): Promise<Map<string, MusicdbMatch>> {
  if (entries.length === 0) return new Map();
  
  const songIds = [...new Set(entries.map(e => e.songId))];
  console.log(`PhaseII: Batch matching ${songIds.length} unique song IDs`);
  
  const BATCH_SIZE = 50;
  const allData: any[] = [];
  
  for (let i = 0; i < songIds.length; i += BATCH_SIZE) {
    const batchIds = songIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('musicdb')
      .select('id, song_id, chart_id, playstyle, difficulty_name, difficulty_level')
      .in('song_id', batchIds);
    
    if (error) {
      console.error(`PhaseII batch ${i / BATCH_SIZE} error:`, error);
      continue;
    }
    if (data) allData.push(...data);
  }
  
  console.log(`PhaseII: Found ${allData.length} chart matches`);
  
  const matchMap = new Map<string, MusicdbMatch>();
  for (const row of allData) {
    const key = `${row.song_id}|${row.playstyle}|${row.difficulty_name}|${row.difficulty_level}`;
    matchMap.set(key, { id: row.id, song_id: row.song_id, chart_id: row.chart_id });
  }
  
  return matchMap;
}

// Main PhaseII processor
async function processPhaseII(supabase: any, content: string): Promise<ParseResult> {
  console.log('=== Starting PhaseII Processing ===');
  
  const scores: ScoreRecord[] = [];
  const unmatchedSongs: UnmatchedSong[] = [];
  
  // Step 1: Extract entry blocks
  const blocks = phaseii_extractBlocks(content);
  
  if (blocks.length === 0) {
    console.log('PhaseII: No entry blocks found');
    return { scores, sourceType: 'phaseii', unmatchedSongs };
  }
  
  // Log sample for debugging (already logged in extractBlocks, but log more details here)
  
  // Step 2: Parse fields from blocks with error tolerance
  // CRITICAL: Wrap each block in try-catch to ensure encoding errors don't stop processing
  const parsedEntries: Array<{ entry: PhaseIIEntry; chartInfo: { playstyle: string; difficulty_name: string; difficulty_level: number } }> = [];
  let skippedMissingSongId = 0;
  let skippedMissingChart = 0;
  let skippedInvalidChart = 0;
  let skippedDueToError = 0;
  
  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
    const block = blocks[blockIndex];
    
    try {
      const entry = phaseii_extractFields(block);
      
      if (entry.songId === null) {
        skippedMissingSongId++;
        // Log a sample of the problematic block for debugging
        if (skippedMissingSongId <= 3) {
          const sample = block.substring(0, 200).replace(/[\n\r]/g, ' ');
          console.log(`PhaseII: Block ${blockIndex} missing songId, sample: ${sample}`);
        }
        continue;
      }
      
      if (!entry.chart) {
        skippedMissingChart++;
        console.log(`PhaseII: Block ${blockIndex} has songId ${entry.songId} but missing chart`);
        continue;
      }
      
      const chartInfo = phaseii_parseChart(entry.chart);
      if (!chartInfo) {
        skippedInvalidChart++;
        unmatchedSongs.push({ name: entry.songName, difficulty: entry.chart, reason: 'invalid_chart_format' });
        continue;
      }
      
      parsedEntries.push({ entry, chartInfo });
    } catch (blockError) {
      // This block caused an error - log it but continue processing
      skippedDueToError++;
      if (skippedDueToError <= 5) {
        const errorMsg = blockError instanceof Error ? blockError.message : String(blockError);
        console.error(`PhaseII: Error parsing block ${blockIndex}: ${errorMsg}`);
        // Try to extract just the song ID for logging
        try {
          const idMatch = block.match(/"id"\s*:\s*(\d+)/);
          if (idMatch) {
            console.log(`PhaseII: Block ${blockIndex} contained song_id ${idMatch[1]}`);
          }
        } catch (_) { /* ignore */ }
      }
      continue;
    }
  }
  
  console.log(`PhaseII: Parsed ${parsedEntries.length} entries (skipped: ${skippedMissingSongId} missing songId, ${skippedMissingChart} missing chart, ${skippedInvalidChart} invalid chart, ${skippedDueToError} errors)`);
  
  if (skippedMissingSongId > 0 || skippedMissingChart > 0 || skippedDueToError > 0) {
    unmatchedSongs.push({
      name: `${skippedMissingSongId + skippedMissingChart + skippedDueToError} entries`,
      difficulty: null,
      reason: 'missing_required_fields_or_parse_errors'
    });
  }
  
  if (parsedEntries.length === 0) {
    return { scores, sourceType: 'phaseii', unmatchedSongs };
  }
  
  // Step 3: Batch match against musicdb
  const matchMap = await phaseii_batchMatch(
    supabase,
    parsedEntries.map(e => ({
      songId: e.entry.songId!,
      playstyle: e.chartInfo.playstyle,
      difficultyName: e.chartInfo.difficulty_name,
      difficultyLevel: e.chartInfo.difficulty_level,
    }))
  );
  
  // Step 4: Build score records
  let matchedCount = 0;
  for (const { entry, chartInfo } of parsedEntries) {
    const key = `${entry.songId}|${chartInfo.playstyle}|${chartInfo.difficulty_name}|${chartInfo.difficulty_level}`;
    const match = matchMap.get(key);
    
    if (!match) {
      unmatchedSongs.push({
        name: entry.songName,  // Now includes song name from PhaseII data
        difficulty: `${chartInfo.playstyle} ${chartInfo.difficulty_name} ${chartInfo.difficulty_level}`,
        reason: `no_match_by_id (song_id: ${entry.songId})`
      });
      continue;
    }
    
    matchedCount++;
    scores.push({
      musicdb_id: match.id,
      chart_id: match.chart_id,
      song_id: match.song_id,
      playstyle: chartInfo.playstyle,
      difficulty_name: chartInfo.difficulty_name,
      difficulty_level: chartInfo.difficulty_level,
      score: phaseii_parseScore(entry.points),
      timestamp: entry.timestamp,
      username: null,
      rank: phaseii_normalizeRank(entry.rank),
      flare: entry.flare,
      halo: phaseii_normalizeHalo(entry.halo),
      source_type: 'phaseii',
    });
  }
  
  console.log(`PhaseII: ${matchedCount} matched, ${unmatchedSongs.length} unmatched`);
  console.log('=== PhaseII Processing Complete ===');
  
  return { scores, sourceType: 'phaseii', unmatchedSongs };
}

// ============================================================================
// SANBAI PARSER MODULE - Completely isolated
// ============================================================================
// This module handles Sanbai CSV/TSV parsing. It has NO dependencies on PhaseII logic.
// All functions in this section are prefixed with 'sanbai_' for clarity.
// ============================================================================

// Parse difficulty code like "bSP", "ESP", "CDP"
function sanbai_parseDifficulty(code: string): { playstyle: string; difficulty_name: string } | null {
  const playstyle = code.endsWith('DP') ? 'DP' : 'SP';
  const diffChar = code[0];
  const diffMap: Record<string, string> = {
    'b': 'BEGINNER', 'B': 'BASIC', 'D': 'DIFFICULT', 'E': 'EXPERT', 'C': 'CHALLENGE'
  };
  const difficulty_name = diffMap[diffChar];
  if (!difficulty_name) return null;
  return { playstyle, difficulty_name };
}

// Normalize lamp value
function sanbai_normalizeLamp(lamp: string | null): string | null {
  if (!lamp) return null;
  const normalized = lamp.toLowerCase().trim();
  if (['mfc', 'pfc', 'gfc', 'fc', 'clear', 'fail', 'life4'].includes(normalized)) {
    return normalized;
  }
  if (normalized.includes('life')) return 'life4';
  return 'clear';
}

// Parse flare roman numeral
function sanbai_parseFlare(flare: string | null): number | null {
  if (!flare) return null;
  const romanMap: Record<string, number> = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
    'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 'EX': 10
  };
  const upper = flare.toUpperCase().trim();
  return romanMap[upper] ?? null;
}

// Batch match by eamuse_id
async function sanbai_batchMatch(
  supabase: any,
  eamuseIds: string[]
): Promise<Map<string, MusicdbMatch & { eamuse_id: string }>> {
  if (eamuseIds.length === 0) return new Map();
  
  const uniqueIds = [...new Set(eamuseIds)];
  console.log(`Sanbai: Batch matching ${uniqueIds.length} unique eamuse IDs`);
  
  const BATCH_SIZE = 100;
  const allData: any[] = [];
  
  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const batchIds = uniqueIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('musicdb')
      .select('id, song_id, chart_id, eamuse_id, playstyle, difficulty_name')
      .in('eamuse_id', batchIds);
    
    if (error) {
      console.error(`Sanbai batch ${i / BATCH_SIZE} error:`, error);
      continue;
    }
    if (data) allData.push(...data);
  }
  
  console.log(`Sanbai: Found ${allData.length} chart matches`);
  
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

// Main Sanbai processor
async function processSanbai(supabase: any, content: string): Promise<ParseResult> {
  console.log('=== Starting Sanbai Processing ===');
  
  const scores: ScoreRecord[] = [];
  const unmatchedSongs: UnmatchedSong[] = [];
  
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    console.log('Sanbai: No data rows found');
    return { scores, sourceType: 'sanbai', unmatchedSongs: [{ name: null, difficulty: null, reason: 'no_data_rows' }] };
  }
  
  // Detect separator
  const firstLine = lines[0];
  const separator = firstLine.includes('\t') ? '\t' : ',';
  console.log(`Sanbai: Using ${separator === '\t' ? 'TAB' : 'COMMA'} separator`);
  
  // Parse headers
  const headers = firstLine.split(separator).map(h => h.trim());
  const colIndex: Record<string, number> = {};
  headers.forEach((h, i) => { colIndex[h] = i; });
  
  // Validate required columns
  const requiredCols = ['Song ID', 'Song Name', 'Difficulty', 'Rating', 'Score'];
  for (const col of requiredCols) {
    if (colIndex[col] === undefined) {
      console.log(`Sanbai: Missing required column: ${col}`);
      return { scores, sourceType: 'sanbai', unmatchedSongs: [{ name: null, difficulty: null, reason: `missing_column_${col}` }] };
    }
  }
  
  // Parse data rows
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
    const eamuseId = cols[colIndex['Song ID']]?.trim();
    const songName = cols[colIndex['Song Name']]?.trim();
    const difficultyCode = cols[colIndex['Difficulty']]?.trim();
    const rating = parseInt(cols[colIndex['Rating']]?.trim()) || 0;
    const scoreVal = parseInt(cols[colIndex['Score']]?.trim()) || null;
    const grade = cols[colIndex['Grade']]?.trim() || null;
    const lamp = cols[colIndex['Lamp']]?.trim() || null;
    const flare = cols[colIndex['Flare']]?.trim() || null;
    
    if (!eamuseId || !difficultyCode) {
      unmatchedSongs.push({ name: songName, difficulty: difficultyCode, reason: 'missing_id_or_difficulty' });
      continue;
    }
    
    const diffInfo = sanbai_parseDifficulty(difficultyCode);
    if (!diffInfo) {
      unmatchedSongs.push({ name: songName, difficulty: difficultyCode, reason: 'invalid_difficulty_code' });
      continue;
    }
    
    parsedRows.push({ eamuseId, songName, diffInfo, rating, scoreVal, grade, lamp, flare });
    allEamuseIds.push(eamuseId);
  }
  
  console.log(`Sanbai: Parsed ${parsedRows.length} valid rows`);
  
  // Batch match
  const matchMap = await sanbai_batchMatch(supabase, allEamuseIds);
  
  // Build score records
  for (const row of parsedRows) {
    const key = `${row.eamuseId}|${row.diffInfo.playstyle}|${row.diffInfo.difficulty_name}`;
    const match = matchMap.get(key);
    
    if (!match) {
      unmatchedSongs.push({
        name: row.songName,
        difficulty: `${row.diffInfo.playstyle} ${row.diffInfo.difficulty_name} ${row.rating}`,
        reason: 'eamuse_id_not_found'
      });
      continue;
    }
    
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
      flare: sanbai_parseFlare(row.flare),
      halo: sanbai_normalizeLamp(row.lamp),
      source_type: 'sanbai',
    });
  }
  
  console.log(`Sanbai: ${scores.length} matched, ${unmatchedSongs.length} unmatched`);
  console.log('=== Sanbai Processing Complete ===');
  
  return { scores, sourceType: 'sanbai', unmatchedSongs };
}

// ============================================================================
// DATABASE OPERATIONS - Shared, but isolated from parsing logic
// ============================================================================

async function fetchExistingScores(
  supabase: any,
  userId: string,
  musicdbIds: number[]
): Promise<Map<number, ExistingScore>> {
  if (musicdbIds.length === 0) return new Map();
  
  const BATCH_SIZE = 100;
  const uniqueIds = [...new Set(musicdbIds)];
  const allData: any[] = [];
  
  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const batchIds = uniqueIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('user_scores')
      .select(`id, musicdb_id, score, rank, flare, halo, musicdb:musicdb_id (name, difficulty_name, difficulty_level)`)
      .eq('user_id', userId)
      .in('musicdb_id', batchIds);
    
    if (error) {
      console.error(`fetchExistingScores batch error:`, error);
      continue;
    }
    if (data) allData.push(...data);
  }
  
  console.log(`Found ${allData.length} existing scores`);
  
  const map = new Map<number, ExistingScore>();
  for (const row of allData) {
    if (row.musicdb_id) {
      const musicdb = row.musicdb as { name: string | null; difficulty_name: string | null; difficulty_level: number | null } | null;
      map.set(row.musicdb_id, {
        id: row.id,
        musicdb_id: row.musicdb_id,
        score: row.score,
        rank: row.rank,
        flare: row.flare,
        halo: row.halo,
        song_name: musicdb?.name ?? null,
        difficulty_name: musicdb?.difficulty_name ?? null,
        difficulty_level: musicdb?.difficulty_level ?? null,
      });
    }
  }
  return map;
}

interface UpsertResult {
  inserted: number;
  updated: number;
  skipped: number;
  changes: ScoreChange[];
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
  const changes: ScoreChange[] = [];
  
  // Deduplicate by musicdb_id, keeping best values
  const deduplicatedScores = new Map<number, ScoreRecord>();
  
  for (const score of scores) {
    if (!score.musicdb_id) {
      skipped++;
      continue;
    }
    
    const existing = deduplicatedScores.get(score.musicdb_id);
    if (!existing) {
      deduplicatedScores.set(score.musicdb_id, score);
    } else {
      // Merge: keep best values
      deduplicatedScores.set(score.musicdb_id, {
        ...existing,
        score: getBetterScore(existing.score, score.score),
        flare: getBetterFlare(existing.flare, score.flare),
        rank: getBetterRank(existing.rank, score.rank),
        halo: getBetterHalo(existing.halo, score.halo),
        timestamp: score.timestamp || existing.timestamp,
      });
    }
  }
  
  console.log(`Deduplicated ${scores.length} scores to ${deduplicatedScores.size}`);
  
  // Separate into inserts and updates
  const toInsert: any[] = [];
  const toUpdate: Array<{ id: string; data: any; change: ScoreChange }> = [];
  
  for (const score of deduplicatedScores.values()) {
    const existing = existingScores.get(score.musicdb_id!);
    
    if (!existing) {
      // New score - only write user achievements + musicdb_id reference
      // Chart metadata (difficulty_level, difficulty_name, playstyle, song_id, chart_id)
      // is NOT written here - it comes from musicdb via the relation (SINGLE SOURCE OF TRUTH)
      toInsert.push({
        user_id: userId,
        upload_id: uploadId,
        musicdb_id: score.musicdb_id,
        score: score.score,
        timestamp: score.timestamp,
        username: score.username,
        rank: score.rank,
        flare: score.flare,
        halo: score.halo,
        source_type: score.source_type,
      });
    } else {
      // Check for improvements
      const newScore = getBetterScore(existing.score, score.score);
      const newFlare = getBetterFlare(existing.flare, score.flare);
      const newRank = getBetterRank(existing.rank, score.rank);
      const newHalo = getBetterHalo(existing.halo, score.halo);
      
      const hasImprovement =
        newScore !== existing.score ||
        newFlare !== existing.flare ||
        newRank !== existing.rank ||
        newHalo !== existing.halo;
      
      if (hasImprovement) {
        toUpdate.push({
          id: existing.id,
          data: {
            score: newScore,
            flare: newFlare,
            rank: newRank,
            halo: newHalo,
            upload_id: uploadId,
            timestamp: score.timestamp || undefined,
            source_type: score.source_type, // Update source_type to reflect the new upload source
          },
          change: {
            song_name: existing.song_name || 'Unknown',
            difficulty_name: existing.difficulty_name || score.difficulty_name,
            difficulty_level: existing.difficulty_level || score.difficulty_level,
            old_score: existing.score,
            new_score: newScore,
            old_flare: existing.flare,
            new_flare: newFlare,
            old_rank: existing.rank,
            new_rank: newRank,
            old_halo: existing.halo,
            new_halo: newHalo,
          },
        });
      } else {
        skipped++;
      }
    }
  }
  
  console.log(`To insert: ${toInsert.length}, to update: ${toUpdate.length}, skipped: ${skipped}`);
  
  // Batch insert
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('user_scores')
      .insert(toInsert);
    
    if (insertError) {
      console.error('Batch insert error:', insertError);
    } else {
      inserted = toInsert.length;
      console.log(`Inserted ${inserted} new scores`);
    }
  }
  
  // Update existing scores
  for (const update of toUpdate) {
    const { error: updateError } = await supabase
      .from('user_scores')
      .update(update.data)
      .eq('id', update.id);
    
    if (updateError) {
      console.error('Update error:', updateError);
    } else {
      updated++;
      changes.push(update.change);
    }
  }
  
  if (updated > 0) {
    console.log(`Updated ${updated} existing scores`);
  }
  
  return { inserted, updated, skipped, changes };
}

// ============================================================================
// BACKGROUND PROCESSOR
// ============================================================================

async function processUploadInBackground(
  supabaseUrl: string,
  supabaseServiceKey: string,
  userId: string,
  uploadId: string,
  content: string,
  sourceType: 'phaseii' | 'sanbai' | 'unknown'
): Promise<void> {
  console.log(`\n========================================`);
  console.log(`Background processing started: ${uploadId}`);
  console.log(`Source type: ${sourceType}`);
  console.log(`========================================\n`);
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Route to appropriate parser
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
    
    // Handle empty results
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
    
    // Fetch existing scores
    const musicdbIds = parseResult.scores
      .map(s => s.musicdb_id)
      .filter((id): id is number => id !== null);
    
    const existingScores = await fetchExistingScores(supabase, userId, musicdbIds);
    
    // Smart upsert
    const upsertResult = await smartUpsertScores(
      supabase,
      userId,
      uploadId,
      parseResult.scores,
      existingScores
    );
    
    // Update upload record
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
          changes: upsertResult.changes.slice(0, 100),
        },
      })
      .eq('id', uploadId);
    
    console.log(`\n========================================`);
    console.log(`Background processing COMPLETE: ${uploadId}`);
    console.log(`========================================\n`);
    
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
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { file_name, file_mime_type, file_size_bytes, raw_storage_path, content } = body;

    if (!content || !file_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sourceType = detectSourceType(content);
    console.log(`Detected source type: ${sourceType} for file: ${file_name}`);

    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .insert({
        user_id: user.id,
        file_name,
        file_mime_type,
        file_size_bytes,
        raw_storage_path,
        parse_status: 'processing',
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

    return new Response(JSON.stringify({
      upload_id: uploadId,
      status: 'processing',
      message: 'Upload received. Processing in background.',
    }), {
      status: 202,
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
