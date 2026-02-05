// Tool executor for Edi function calling
// Executes tool calls by querying Supabase

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ToolCall } from "../utils/types.ts";

// Result format for songs (frontend expects this marker format)
interface SongMarker {
  song_id: number;
  title: string;
  difficulty: string;
  level: number;
  eamuse_id: string | null;
}

function formatSongMarker(song: SongMarker): string {
  return `[[SONG:${JSON.stringify(song)}]]`;
}

// Search for songs by name
async function searchSongs(
  args: {
    query: string;
    difficulty_level?: number;
    difficulty_name?: string;
    include_user_scores?: boolean;
  },
  supabaseServiceRole: SupabaseClient,
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { query, difficulty_level, difficulty_name, include_user_scores = true } = args;

  // Search musicdb for matching songs
  let musicDbQuery = supabaseServiceRole
    .from("musicdb")
    .select("id, song_id, name, artist, difficulty_name, difficulty_level, eamuse_id, era, sanbai_rating")
    .eq("playstyle", "SP")
    .eq("deleted", false)
    .ilike("name", `%${query}%`)
    .order("difficulty_level", { ascending: true })
    .limit(50);

  if (difficulty_level !== undefined) {
    musicDbQuery = musicDbQuery.eq("difficulty_level", difficulty_level);
  }
  if (difficulty_name !== undefined) {
    musicDbQuery = musicDbQuery.eq("difficulty_name", difficulty_name);
  }

  const { data: musicDbResults, error: musicDbError } = await musicDbQuery;

  if (musicDbError) {
    console.error("Error searching songs:", musicDbError);
    return JSON.stringify({ error: "Failed to search songs", details: musicDbError.message });
  }

  if (!musicDbResults || musicDbResults.length === 0) {
    return JSON.stringify({
      message: `No songs found matching "${query}"`,
      results: []
    });
  }

  // Get song_ids for chart_analysis lookup
  const songIds = [...new Set(musicDbResults.map(m => m.song_id))];
  const musicdbIds = musicDbResults.map(m => m.id);

  // Fetch chart_analysis for pattern data
  const { data: chartData, error: chartError } = await supabaseServiceRole
    .from("chart_analysis")
    .select("song_id, difficulty_name, crossovers, full_crossovers, footswitches, up_footswitches, down_footswitches, sideswitches, jacks, notes, bpm, peak_nps, mines, stop_count, stream")
    .in("song_id", songIds);

  if (chartError) {
    console.error("Error fetching chart analysis:", chartError);
  }

  // Build chart analysis lookup map
  const chartMap = new Map<string, Record<string, unknown>>();
  if (chartData) {
    for (const c of chartData) {
      const key = `${c.song_id}_${(c.difficulty_name as string).toUpperCase()}`;
      chartMap.set(key, c);
    }
  }

  // Fetch user scores if requested
  const userScoreMap = new Map<number, { score: number; halo: string; rank: string; flare: number | null }>();
  if (include_user_scores) {
    const { data: userScores, error: userScoreError } = await supabase
      .from("user_scores")
      .select("musicdb_id, score, halo, rank, flare")
      .eq("user_id", userId)
      .in("musicdb_id", musicdbIds);

    if (userScoreError) {
      console.error("Error fetching user scores:", userScoreError);
    }

    if (userScores) {
      for (const us of userScores) {
        userScoreMap.set(us.musicdb_id, {
          score: us.score,
          halo: us.halo,
          rank: us.rank,
          flare: us.flare,
        });
      }
    }
  }

  // Build results
  const results = musicDbResults.map(m => {
    const chartKey = `${m.song_id}_${(m.difficulty_name as string).toUpperCase()}`;
    const patterns = chartMap.get(chartKey);
    const userScore = userScoreMap.get(m.id);

    const songMarker = formatSongMarker({
      song_id: m.song_id,
      title: m.name,
      difficulty: m.difficulty_name,
      level: m.difficulty_level,
      eamuse_id: m.eamuse_id,
    });

    return {
      song_marker: songMarker,
      name: m.name,
      artist: m.artist,
      difficulty: m.difficulty_name,
      level: m.difficulty_level,
      era: m.era,
      sanbai_rating: m.sanbai_rating,
      patterns: patterns ? {
        crossovers: patterns.crossovers,
        full_crossovers: patterns.full_crossovers,
        footswitches: patterns.footswitches,
        up_footswitches: patterns.up_footswitches,
        down_footswitches: patterns.down_footswitches,
        sideswitches: patterns.sideswitches,
        jacks: patterns.jacks,
        mines: patterns.mines,
        notes: patterns.notes,
        bpm: patterns.bpm,
        peak_nps: patterns.peak_nps,
        stop_count: patterns.stop_count,
        stream: patterns.stream,
      } : null,
      user_score: userScore ? {
        score: userScore.score,
        halo: userScore.halo,
        rank: userScore.rank,
        flare: userScore.flare,
      } : null,
    };
  });

  return JSON.stringify({
    message: `Found ${results.length} chart(s) matching "${query}"`,
    results,
  });
}

// Get songs by gameplay criteria
async function getSongsByCriteria(
  args: {
    difficulty_level?: number;
    min_difficulty_level?: number;
    max_difficulty_level?: number;
    difficulty_name?: string;
    halo_filter?: string;
    min_crossovers?: number;
    min_footswitches?: number;
    min_jacks?: number;
    min_mines?: number;
    min_stops?: number;
    min_notes?: number;
    min_bpm?: number;
    max_bpm?: number;
    min_score?: number;
    max_score?: number;
    era?: number;
    sort_by?: string;
    limit?: number;
  },
  supabaseServiceRole: SupabaseClient,
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const {
    difficulty_level,
    min_difficulty_level,
    max_difficulty_level,
    difficulty_name,
    halo_filter,
    min_crossovers,
    min_footswitches,
    min_jacks,
    min_mines,
    min_stops,
    min_notes,
    min_bpm,
    max_bpm,
    min_score,
    max_score,
    era,
    sort_by,
    limit = 10,
  } = args;

  const effectiveLimit = Math.min(limit, 25);

  // Step 1: Get all user scores for this user
  const { data: allUserScores, error: userScoreError } = await supabase
    .from("user_scores")
    .select(`
      musicdb_id,
      score,
      halo,
      rank,
      flare,
      musicdb!inner(song_id, difficulty_level, difficulty_name, name, artist, eamuse_id)
    `)
    .eq("user_id", userId);

  if (userScoreError) {
    console.error("Error fetching user scores:", userScoreError);
  }

  // Build user score map by musicdb_id
  const userScoreByMusicdbId = new Map<number, { score: number; halo: string; rank: string; flare: number | null }>();
  const scoredMusicdbIds = new Set<number>();

  if (allUserScores) {
    for (const us of allUserScores) {
      userScoreByMusicdbId.set(us.musicdb_id, {
        score: us.score,
        halo: us.halo,
        rank: us.rank,
        flare: us.flare,
      });
      scoredMusicdbIds.add(us.musicdb_id);
    }
  }

  // Step 2: Build musicdb query
  let musicDbQuery = supabaseServiceRole
    .from("musicdb")
    .select("id, song_id, name, artist, difficulty_name, difficulty_level, eamuse_id, era, sanbai_rating")
    .eq("playstyle", "SP")
    .eq("deleted", false);

  if (difficulty_level !== undefined) {
    musicDbQuery = musicDbQuery.eq("difficulty_level", difficulty_level);
  }
  if (min_difficulty_level !== undefined) {
    musicDbQuery = musicDbQuery.gte("difficulty_level", min_difficulty_level);
  }
  if (max_difficulty_level !== undefined) {
    musicDbQuery = musicDbQuery.lte("difficulty_level", max_difficulty_level);
  }
  if (difficulty_name !== undefined) {
    musicDbQuery = musicDbQuery.eq("difficulty_name", difficulty_name);
  }

  // We need to fetch more than the limit for filtering
  musicDbQuery = musicDbQuery.limit(1000);

  const { data: musicDbResults, error: musicDbError } = await musicDbQuery;

  if (musicDbError) {
    console.error("Error fetching musicdb:", musicDbError);
    return JSON.stringify({ error: "Failed to fetch songs", details: musicDbError.message });
  }

  if (!musicDbResults || musicDbResults.length === 0) {
    return JSON.stringify({
      message: "No songs found matching criteria",
      results: [],
    });
  }

  // Step 3: Get chart_analysis for pattern filtering
  const songIds = [...new Set(musicDbResults.map(m => m.song_id))];

  let chartQuery = supabaseServiceRole
    .from("chart_analysis")
    .select("song_id, difficulty_name, crossovers, full_crossovers, footswitches, up_footswitches, down_footswitches, sideswitches, jacks, notes, bpm, peak_nps, mines, stop_count, stream")
    .in("song_id", songIds);

  const { data: chartData, error: chartError } = await chartQuery;

  if (chartError) {
    console.error("Error fetching chart analysis:", chartError);
  }

  // Build chart analysis lookup map
  const chartMap = new Map<string, Record<string, unknown>>();
  if (chartData) {
    for (const c of chartData) {
      const key = `${c.song_id}_${(c.difficulty_name as string).toUpperCase()}`;
      chartMap.set(key, c);
    }
  }

  // Step 4: Filter and build results
  let results: Array<{
    musicdb_id: number;
    song_id: number;
    name: string;
    artist: string;
    difficulty: string;
    level: number;
    eamuse_id: string | null;
    era: number | null;
    sanbai_rating: number | null;
    patterns: Record<string, unknown> | null;
    user_score: { score: number; halo: string; rank: string; flare: number | null } | null;
  }> = [];

  for (const m of musicDbResults) {
    const chartKey = `${m.song_id}_${(m.difficulty_name as string).toUpperCase()}`;
    const patterns = chartMap.get(chartKey);
    const userScore = userScoreByMusicdbId.get(m.id) || null;

    // Apply halo filter
    if (halo_filter) {
      const halo = userScore?.halo?.toLowerCase() || "";
      const hasScore = userScore !== null;

      switch (halo_filter) {
        case "no_score":
          if (hasScore) continue;
          break;
        case "no_clear":
          if (hasScore && !["fail", "none", ""].includes(halo)) continue;
          break;
        case "clear_no_fc":
          if (!hasScore) continue;
          if (["fc", "gfc", "pfc", "mfc", "fail", "none", ""].includes(halo)) continue;
          break;
        case "fc_no_pfc":
          if (!hasScore) continue;
          if (!["fc", "gfc"].includes(halo)) continue;
          break;
        case "pfc_no_mfc":
          if (!hasScore) continue;
          if (halo !== "pfc") continue;
          break;
        case "has_pfc":
          if (!hasScore) continue;
          if (!["pfc", "mfc"].includes(halo)) continue;
          break;
        case "has_mfc":
          if (!hasScore) continue;
          if (halo !== "mfc") continue;
          break;
      }
    }

    // Apply era filter (from musicdb, not patterns)
    if (era !== undefined && m.era !== era) continue;

    // Apply pattern filters
    if (patterns) {
      if (min_crossovers !== undefined && ((patterns.crossovers as number) || 0) < min_crossovers) continue;
      if (min_footswitches !== undefined && ((patterns.footswitches as number) || 0) < min_footswitches) continue;
      if (min_jacks !== undefined && ((patterns.jacks as number) || 0) < min_jacks) continue;
      if (min_mines !== undefined && ((patterns.mines as number) || 0) < min_mines) continue;
      if (min_stops !== undefined && ((patterns.stop_count as number) || 0) < min_stops) continue;
      if (min_notes !== undefined && ((patterns.notes as number) || 0) < min_notes) continue;
      if (min_bpm !== undefined && ((patterns.bpm as number) || 0) < min_bpm) continue;
      if (max_bpm !== undefined && ((patterns.bpm as number) || Infinity) > max_bpm) continue;
    } else {
      // If pattern filters are requested but no pattern data exists, skip
      if (min_crossovers !== undefined || min_footswitches !== undefined ||
          min_jacks !== undefined || min_mines !== undefined || min_stops !== undefined ||
          min_notes !== undefined || min_bpm !== undefined || max_bpm !== undefined) continue;
    }

    // Apply score filters
    if (min_score !== undefined || max_score !== undefined) {
      if (!userScore) continue;
      if (min_score !== undefined && userScore.score < min_score) continue;
      if (max_score !== undefined && userScore.score > max_score) continue;
    }

    results.push({
      musicdb_id: m.id,
      song_id: m.song_id,
      name: m.name,
      artist: m.artist,
      difficulty: m.difficulty_name,
      level: m.difficulty_level,
      eamuse_id: m.eamuse_id,
      era: m.era,
      sanbai_rating: m.sanbai_rating,
      patterns: patterns ? {
        crossovers: patterns.crossovers,
        full_crossovers: patterns.full_crossovers,
        footswitches: patterns.footswitches,
        up_footswitches: patterns.up_footswitches,
        down_footswitches: patterns.down_footswitches,
        sideswitches: patterns.sideswitches,
        jacks: patterns.jacks,
        mines: patterns.mines,
        notes: patterns.notes,
        bpm: patterns.bpm,
        peak_nps: patterns.peak_nps,
        stop_count: patterns.stop_count,
        stream: patterns.stream,
      } : null,
      user_score: userScore,
    });
  }

  // Step 5: Sort results
  if (sort_by) {
    switch (sort_by) {
      case "crossovers":
        results.sort((a, b) => ((b.patterns?.crossovers as number) || 0) - ((a.patterns?.crossovers as number) || 0));
        break;
      case "footswitches":
        results.sort((a, b) => ((b.patterns?.footswitches as number) || 0) - ((a.patterns?.footswitches as number) || 0));
        break;
      case "jacks":
        results.sort((a, b) => ((b.patterns?.jacks as number) || 0) - ((a.patterns?.jacks as number) || 0));
        break;
      case "mines":
        results.sort((a, b) => ((b.patterns?.mines as number) || 0) - ((a.patterns?.mines as number) || 0));
        break;
      case "notes":
        results.sort((a, b) => ((b.patterns?.notes as number) || 0) - ((a.patterns?.notes as number) || 0));
        break;
      case "bpm":
        results.sort((a, b) => ((b.patterns?.bpm as number) || 0) - ((a.patterns?.bpm as number) || 0));
        break;
      case "peak_nps":
        results.sort((a, b) => ((b.patterns?.peak_nps as number) || 0) - ((a.patterns?.peak_nps as number) || 0));
        break;
      case "score":
        results.sort((a, b) => (b.user_score?.score || 0) - (a.user_score?.score || 0));
        break;
      case "random":
        // Fisher-Yates shuffle
        for (let i = results.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [results[i], results[j]] = [results[j], results[i]];
        }
        break;
    }
  }

  // Limit results
  results = results.slice(0, effectiveLimit);

  // Format output with song markers
  const formattedResults = results.map(r => ({
    song_marker: formatSongMarker({
      song_id: r.song_id,
      title: r.name,
      difficulty: r.difficulty,
      level: r.level,
      eamuse_id: r.eamuse_id,
    }),
    name: r.name,
    artist: r.artist,
    difficulty: r.difficulty,
    level: r.level,
    era: r.era,
    sanbai_rating: r.sanbai_rating,
    patterns: r.patterns,
    user_score: r.user_score,
  }));

  return JSON.stringify({
    message: `Found ${formattedResults.length} chart(s) matching criteria`,
    total_matches: results.length,
    results: formattedResults,
  });
}

// Get song offset
async function getSongOffset(
  args: { query: string },
  supabaseServiceRole: SupabaseClient
): Promise<string> {
  const { query } = args;

  // First find the song in musicdb
  const { data: musicDbResults, error: musicDbError } = await supabaseServiceRole
    .from("musicdb")
    .select("song_id, name")
    .eq("playstyle", "SP")
    .eq("deleted", false)
    .ilike("name", `%${query}%`)
    .limit(10);

  if (musicDbError) {
    console.error("Error searching songs for offset:", musicDbError);
    return JSON.stringify({ error: "Failed to search songs", details: musicDbError.message });
  }

  if (!musicDbResults || musicDbResults.length === 0) {
    return JSON.stringify({
      message: `No song found matching "${query}". Cannot look up offset.`,
      offset: null,
    });
  }

  // Get unique song_ids
  const songIds = [...new Set(musicDbResults.map(m => m.song_id))];
  const songNames = [...new Set(musicDbResults.map(m => m.name))];

  // Look up offset data
  const { data: biasData, error: biasError } = await supabaseServiceRole
    .from("song_bias")
    .select("song_id, bias_ms, confidence")
    .in("song_id", songIds);

  if (biasError) {
    console.error("Error fetching song bias:", biasError);
    return JSON.stringify({ error: "Failed to fetch offset data", details: biasError.message });
  }

  if (!biasData || biasData.length === 0) {
    return JSON.stringify({
      message: `Found song "${songNames[0]}" but no offset data is available for it.`,
      song_name: songNames[0],
      offset: null,
    });
  }

  // Match bias to song
  const biasMap = new Map<number, { bias_ms: number; confidence: number | null }>();
  for (const b of biasData) {
    biasMap.set(b.song_id, { bias_ms: b.bias_ms, confidence: b.confidence });
  }

  const results = songNames.map(name => {
    const matchedRecord = musicDbResults.find(m => m.name === name);
    const songId = matchedRecord?.song_id;
    const biasInfo = songId ? biasMap.get(songId) : null;

    if (biasInfo) {
      // Recommended offset is -bias_ms (negative of stored value)
      const recommendedOffset = -biasInfo.bias_ms;
      return {
        song_name: name,
        recommended_offset: Math.round(recommendedOffset),
        raw_bias_ms: biasInfo.bias_ms,
        confidence: biasInfo.confidence,
        explanation: biasInfo.bias_ms > 0
          ? `Chart is ${biasInfo.bias_ms}ms late relative to music. Set offset to ${Math.round(recommendedOffset)}ms.`
          : biasInfo.bias_ms < 0
          ? `Chart is ${Math.abs(biasInfo.bias_ms)}ms early relative to music. Set offset to ${Math.round(recommendedOffset)}ms.`
          : "Chart is in sync with music. No offset needed.",
      };
    }
    return {
      song_name: name,
      recommended_offset: null,
      explanation: "No offset data available for this song.",
    };
  });

  return JSON.stringify({
    message: `Offset data for "${query}"`,
    results,
  });
}

// Get catalog stats
async function getCatalogStats(
  args: { difficulty_level?: number },
  supabaseServiceRole: SupabaseClient
): Promise<string> {
  const { difficulty_level } = args;

  // Count charts by level
  let query = supabaseServiceRole
    .from("musicdb")
    .select("difficulty_level", { count: "exact", head: false })
    .eq("playstyle", "SP")
    .eq("deleted", false);

  if (difficulty_level !== undefined) {
    query = query.eq("difficulty_level", difficulty_level);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching catalog stats:", error);
    return JSON.stringify({ error: "Failed to fetch catalog stats", details: error.message });
  }

  // If filtering by specific level, just return the count
  if (difficulty_level !== undefined) {
    return JSON.stringify({
      message: `Level ${difficulty_level} catalog statistics`,
      level: difficulty_level,
      chart_count: count || 0,
    });
  }

  // Otherwise, group by level
  const levelCounts = new Map<number, number>();
  if (data) {
    for (const row of data) {
      const level = row.difficulty_level;
      levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
    }
  }

  // Convert to sorted array
  const byLevel: Array<{ level: number; count: number }> = [];
  for (const [level, count] of levelCounts.entries()) {
    byLevel.push({ level, count });
  }
  byLevel.sort((a, b) => a.level - b.level);

  return JSON.stringify({
    message: "Catalog statistics by difficulty level",
    total_charts: count || 0,
    by_level: byLevel,
  });
}

// Main executor function
export async function executeToolCall(
  toolCall: ToolCall,
  supabase: SupabaseClient,
  supabaseServiceRole: SupabaseClient,
  userId: string
): Promise<string> {
  const { name, arguments: argsString } = toolCall.function;

  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsString);
  } catch (e) {
    console.error("Failed to parse tool arguments:", e);
    return JSON.stringify({ error: "Invalid tool arguments", details: String(e) });
  }

  console.log(`Executing tool: ${name} with args:`, args);

  switch (name) {
    case "search_songs":
      return await searchSongs(
        args as { query: string; difficulty_level?: number; difficulty_name?: string; include_user_scores?: boolean },
        supabaseServiceRole,
        supabase,
        userId
      );

    case "get_songs_by_criteria":
      return await getSongsByCriteria(
        args as {
          difficulty_level?: number;
          min_difficulty_level?: number;
          max_difficulty_level?: number;
          difficulty_name?: string;
          halo_filter?: string;
          min_crossovers?: number;
          min_footswitches?: number;
          min_jacks?: number;
          min_mines?: number;
          min_stops?: number;
          min_notes?: number;
          min_bpm?: number;
          max_bpm?: number;
          min_score?: number;
          max_score?: number;
          era?: number;
          sort_by?: string;
          limit?: number;
        },
        supabaseServiceRole,
        supabase,
        userId
      );

    case "get_song_offset":
      return await getSongOffset(
        args as { query: string },
        supabaseServiceRole
      );

    case "get_catalog_stats":
      return await getCatalogStats(
        args as { difficulty_level?: number },
        supabaseServiceRole
      );

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
