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

// ============================================================================
// Source Detection
// ============================================================================

function detectSourceType(content: string): 'phaseii' | 'sanbai' | 'unknown' {
  const trimmed = content.trim();
  
  // PhaseII: JSON with headers/data structure
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.headers && parsed.data) return 'phaseii';
      if (Array.isArray(parsed) && parsed[0]?.song?.chart) return 'phaseii';
    } catch {
      // Not valid JSON
    }
  }
  
  // Sanbai: TSV with "Song ID" header
  const firstLine = trimmed.split('\n')[0];
  if (firstLine.includes('Song ID') && firstLine.includes('\t')) {
    return 'sanbai';
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
  if (['mfc', 'pfc', 'gfc', 'fc', 'clear', 'fail'].includes(normalized)) {
    return normalized;
  }
  // Handle "Life4" or other special lamps as clear
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
// PhaseII Processing
// ============================================================================

async function processPhaseII(
  supabase: any,
  content: string
): Promise<ParseResult> {
  const scores: ScoreRecord[] = [];
  const unmatchedSongs: UnmatchedSong[] = [];
  
  let parsed: any;
  try {
    parsed = JSON.parse(content.trim());
  } catch (err) {
    console.error('PhaseII JSON parse error:', err);
    return { scores, sourceType: 'phaseii', unmatchedSongs: [{ name: null, difficulty: null, reason: 'invalid_json' }] };
  }
  
  // Handle both { data: [...] } and [...] formats
  const dataArray = parsed.data || (Array.isArray(parsed) ? parsed : []);
  
  console.log(`Processing ${dataArray.length} PhaseII entries`);
  
  for (const item of dataArray) {
    const song = item.song;
    if (!song?.chart || !song?.name) {
      unmatchedSongs.push({ name: song?.name ?? null, difficulty: null, reason: 'missing_chart_or_name' });
      continue;
    }
    
    const chartInfo = parsePhaseIIChart(song.chart);
    if (!chartInfo) {
      unmatchedSongs.push({ name: song.name, difficulty: song.chart, reason: 'invalid_chart_format' });
      continue;
    }
    
    // Match to musicdb by name + playstyle + difficulty_name + level
    const match = await matchByNameAndChart(
      supabase,
      song.name,
      chartInfo.playstyle,
      chartInfo.difficulty_name,
      chartInfo.difficulty_level
    );
    
    if (!match) {
      unmatchedSongs.push({ 
        name: song.name, 
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
      score: parsePhaseIIScore(item.points),
      timestamp: item.timestamp || null,
      username: item.username || null,
      rank: item.data?.rank || null,
      flare: item.data?.flare ?? null,
      halo: normalizePhaseIIHalo(item.data?.halo),
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
            unmatched_songs: parseResult.unmatchedSongs.slice(0, 50), // Limit to first 50
          },
        })
        .eq('id', uploadId);

      return new Response(JSON.stringify({
        error: 'No scores could be matched to the catalog',
        total_rows: parseResult.unmatchedSongs.length,
        mapped_rows: 0,
        skipped_rows: parseResult.unmatchedSongs.length,
        source_type: parseResult.sourceType,
        unmatched_songs: parseResult.unmatchedSongs.slice(0, 10),
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert scores
    const scoresToInsert = parseResult.scores.map(score => ({
      user_id: user.id,
      upload_id: uploadId,
      ...score,
    }));

    const { error: insertError } = await supabase
      .from('user_scores')
      .insert(scoresToInsert);

    if (insertError) {
      console.error('Score insert error:', insertError);
      await supabase
        .from('uploads')
        .update({
          parse_status: 'failed',
          parse_error: `Failed to insert scores: ${insertError.message}`,
        })
        .eq('id', uploadId);

      return new Response(JSON.stringify({
        error: `Failed to insert scores: ${insertError.message}`,
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
      source_type: parseResult.sourceType,
      unmatched_songs: parseResult.unmatchedSongs.slice(0, 10),
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
