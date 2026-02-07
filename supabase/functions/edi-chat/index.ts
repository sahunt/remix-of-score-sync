// EDI Chat - Consolidated Single File
// All modules inlined to reduce bundle complexity and fix deployment timeouts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

// ============================================================================
// TYPES
// ============================================================================

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface BaseMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
}

interface AssistantMessage extends BaseMessage {
  role: "assistant";
  content: string | null;
  tool_calls?: ToolCall[];
}

interface ToolMessage extends BaseMessage {
  role: "tool";
  content: string;
  tool_call_id: string;
}

type Message = BaseMessage | AssistantMessage | ToolMessage;

interface ChatCompletionChoice {
  index: number;
  message: {
    role: "assistant";
    content: string | null;
    tool_calls?: ToolCall[];
  };
  finish_reason: string;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
}

type PlayerStage = 'developing' | 'intermediate' | 'advanced' | 'elite';
type MasteryTier = 'crushing' | 'solid' | 'pushing' | 'survival' | 'untouched';

interface LevelMastery {
  level: number;
  played: number;
  avgScore: number;
  scoreVariance: number;
  clearRate: number;
  fcRate: number;
  pfcRate: number;
  aaaRate: number;
  pfcCount: number;
  aaaCount: number;
  fcCount: number;
  gfcCount: number;
  mfcCount: number;
  masteryTier: MasteryTier;
}

interface PlayerProfile {
  playerStage: PlayerStage;
  clearCeiling: number;
  fcCeiling: number;
  pfcCeiling: number;
  comfortCeiling: number;
  totalPlays: number;
  level12PlusPlays: number;
  levelMastery: LevelMastery[];
  proficiencies: {
    crossovers: { score: number; consistency: number };
    footswitches: { score: number; consistency: number };
    stamina: { score: number; consistency: number };
    speed: { score: number; consistency: number };
    jacks: { score: number; consistency: number };
  };
}

interface ChartAnalysis {
  song_id: number;
  title: string;
  artist: string;
  difficulty_name: string;
  difficulty_level: number;
  bpm: number | null;
  crossovers: number | null;
  full_crossovers: number | null;
  footswitches: number | null;
  jacks: number | null;
  notes: number | null;
  stream: number | null;
  peak_nps: number | null;
  eamuse_id: string | null;
  era: number | null;
  sanbai_rating: number | null;
  hasPatternData: boolean;
}

interface UserScore {
  musicdb_id: number;
  score: number;
  halo: string;
  rank: string;
  flare: number | null;
  musicdb: {
    song_id: number;
    difficulty_level: number;
    difficulty_name: string;
    name: string;
  } | null;
}

interface TotalStats {
  totalPlayed: number;
  totalMfcs: number;
  totalPfcs: number;
  totalGfcs: number;
  totalFcs: number;
  totalLife4s: number;
  totalClears: number;
  totalAAAs: number;
}

// Pre-computed table row types (from player_summary and player_level_stats)
interface PlayerSummaryRow {
  user_id: string;
  total_scores: number;
  mfc_count: number;
  pfc_count: number;
  gfc_count: number;
  fc_count: number;
  life4_count: number;
  clear_count: number;
  fail_count: number;
  aaa_count: number;
  player_stage: string;
  clear_ceiling: number;
  fc_ceiling: number;
  pfc_ceiling: number;
  comfort_zone_high: number;
  total_plays: number;
  level_12_plus_plays: number;
  proficiencies: Record<string, { score: number; consistency: number }>;
}

interface PlayerLevelStatsRow {
  difficulty_level: number;
  played: number;
  avg_score: number;
  score_variance: number;
  clear_rate: number;
  fc_rate: number;
  pfc_rate: number;
  aaa_rate: number;
  mfc_count: number;
  pfc_count: number;
  gfc_count: number;
  fc_count: number;
  life4_count: number;
  clear_count: number;
  fail_count: number;
  aaa_count: number;
  mastery_tier: string;
  total_charts_available: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = "gemini-3-flash-preview";
const MAX_TOOL_ROUNDS = 2;
const PAGE_SIZE = 1000;
const MAX_CONVERSATION_MESSAGES = 20;

// ============================================================================
// DATA FETCHERS
// ============================================================================

async function fetchUserScores(supabase: SupabaseClient, userId: string): Promise<UserScore[]> {
  let allRawScores: Record<string, unknown>[] = [];
  let from = 0;
  let hasMore = true;
  
  while (hasMore) {
    const { data: pageData, error: pageError } = await supabase
      .from("user_scores")
      .select(`musicdb_id, score, halo, rank, flare, musicdb!inner(song_id, difficulty_level, difficulty_name, name, deleted)`)
      .eq("user_id", userId)
      .eq("musicdb.deleted", false)
      .range(from, from + PAGE_SIZE - 1);
    
    if (pageError) {
      console.error("Error fetching user scores:", pageError);
      throw new Error("Failed to fetch user scores");
    }
    
    if (pageData && pageData.length > 0) {
      allRawScores = [...allRawScores, ...pageData as Record<string, unknown>[]];
      from += PAGE_SIZE;
      hasMore = pageData.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }
  
  console.log(`Fetched ${allRawScores.length} total user scores`);

  return allRawScores.map((s: Record<string, unknown>) => ({
    musicdb_id: s.musicdb_id as number,
    score: s.score as number,
    halo: s.halo as string,
    rank: s.rank as string,
    flare: s.flare as number | null,
    musicdb: Array.isArray(s.musicdb) && s.musicdb.length > 0
      ? s.musicdb[0] as { song_id: number; difficulty_level: number; difficulty_name: string; name: string }
      : s.musicdb as { song_id: number; difficulty_level: number; difficulty_name: string; name: string } | null,
  }));
}

async function fetchMusicDb(supabaseServiceRole: SupabaseClient): Promise<ChartAnalysis[]> {
  let allChartData: Record<string, unknown>[] = [];
  let from = 0;
  let hasMore = true;
  
  while (hasMore) {
    const { data: chartPage, error: chartPageError } = await supabaseServiceRole
      .from("chart_analysis")
      .select("*")
      .order("difficulty_level", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    
    if (chartPageError) {
      console.error("Error fetching chart analysis:", chartPageError);
      throw new Error("Failed to fetch chart analysis");
    }
    
    if (chartPage && chartPage.length > 0) {
      allChartData = [...allChartData, ...chartPage as Record<string, unknown>[]];
      from += PAGE_SIZE;
      hasMore = chartPage.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }
  
  console.log(`Fetched ${allChartData.length} total chart analysis records`);

  let allMusicDbData: Record<string, unknown>[] = [];
  from = 0;
  hasMore = true;
  
  while (hasMore) {
    const { data: musicDbPage, error: musicDbError } = await supabaseServiceRole
      .from("musicdb")
      .select("id, song_id, name, artist, difficulty_name, difficulty_level, sanbai_rating, era, eamuse_id, playstyle, deleted")
      .eq("playstyle", "SP")
      .eq("deleted", false)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    
    if (musicDbError) {
      console.error("Error fetching musicdb:", musicDbError);
      throw new Error("Failed to fetch musicdb catalog");
    }
    
    if (musicDbPage && musicDbPage.length > 0) {
      allMusicDbData = [...allMusicDbData, ...musicDbPage as Record<string, unknown>[]];
      from += PAGE_SIZE;
      hasMore = musicDbPage.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }
  
  console.log(`Fetched ${allMusicDbData.length} total musicdb records`);

  const chartAnalysisMap = new Map<string, Record<string, unknown>>();
  for (const c of allChartData) {
    if (c.difficulty_name) {
      const key = `${c.song_id}_${(c.difficulty_name as string).toUpperCase()}`;
      chartAnalysisMap.set(key, c);
    }
  }

  const chartAnalysis: ChartAnalysis[] = allMusicDbData
    .filter(row => row.difficulty_level != null && row.difficulty_name != null)
    .map((row: Record<string, unknown>) => {
      const lookupKey = `${row.song_id}_${(row.difficulty_name as string).toUpperCase()}`;
      const patternData = chartAnalysisMap.get(lookupKey);
      const hasPatternData = !!patternData;
      
      return {
        song_id: row.song_id as number,
        title: (row.name as string) || 'Unknown',
        artist: (row.artist as string) || 'Unknown',
        difficulty_name: row.difficulty_name as string,
        difficulty_level: row.difficulty_level as number,
        bpm: patternData ? (patternData.bpm as number) : null,
        crossovers: patternData ? (patternData.crossovers as number) : null,
        full_crossovers: patternData ? (patternData.full_crossovers as number) : null,
        footswitches: patternData ? (patternData.footswitches as number) : null,
        jacks: patternData ? (patternData.jacks as number) : null,
        notes: patternData ? (patternData.notes as number) : null,
        stream: patternData ? (patternData.stream as number) : null,
        peak_nps: patternData ? (patternData.peak_nps as number) : null,
        eamuse_id: row.eamuse_id as string | null,
        era: row.era as number | null,
        sanbai_rating: row.sanbai_rating as number | null,
        hasPatternData,
      };
    });
  
  console.log(`Built complete chart catalog with ${chartAnalysis.length} charts`);
  return chartAnalysis;
}

// ============================================================================
// PRE-COMPUTED DATA FETCHERS
// ============================================================================

async function fetchPlayerSummary(supabase: SupabaseClient, userId: string): Promise<PlayerSummaryRow | null> {
  const { data, error } = await supabase
    .from("player_summary")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return data as PlayerSummaryRow;
}

async function fetchPlayerLevelStats(supabase: SupabaseClient, userId: string): Promise<PlayerLevelStatsRow[]> {
  const { data, error } = await supabase
    .from("player_level_stats")
    .select("*")
    .eq("user_id", userId)
    .order("difficulty_level", { ascending: true });
  if (error || !data) return [];
  return data as PlayerLevelStatsRow[];
}

function profileFromPrecomputed(summary: PlayerSummaryRow, levelStats: PlayerLevelStatsRow[]): PlayerProfile {
  const levelMastery: LevelMastery[] = levelStats
    .filter(ls => ls.difficulty_level >= 12 && ls.played > 0)
    .map(ls => ({
      level: ls.difficulty_level,
      played: ls.played,
      avgScore: ls.avg_score,
      scoreVariance: ls.score_variance,
      clearRate: Number(ls.clear_rate),
      fcRate: Number(ls.fc_rate),
      pfcRate: Number(ls.pfc_rate),
      aaaRate: Number(ls.aaa_rate),
      pfcCount: ls.pfc_count,
      aaaCount: ls.aaa_count,
      fcCount: ls.fc_count,
      gfcCount: ls.gfc_count,
      mfcCount: ls.mfc_count,
      masteryTier: ls.mastery_tier as MasteryTier,
    }))
    .sort((a, b) => a.level - b.level);

  const prof = summary.proficiencies || {};
  const defaultProf = { score: 5, consistency: 5 };

  return {
    playerStage: summary.player_stage as PlayerStage,
    clearCeiling: summary.clear_ceiling,
    fcCeiling: summary.fc_ceiling,
    pfcCeiling: summary.pfc_ceiling,
    comfortCeiling: summary.comfort_zone_high,
    totalPlays: summary.total_plays,
    level12PlusPlays: summary.level_12_plus_plays,
    levelMastery,
    proficiencies: {
      crossovers: prof.crossovers || defaultProf,
      footswitches: prof.footswitches || defaultProf,
      stamina: prof.stamina || defaultProf,
      speed: prof.speed || defaultProf,
      jacks: prof.jacks || defaultProf,
    },
  };
}

function totalStatsFromPrecomputed(summary: PlayerSummaryRow): TotalStats {
  return {
    totalPlayed: summary.total_scores,
    totalMfcs: summary.mfc_count,
    totalPfcs: summary.pfc_count,
    totalGfcs: summary.gfc_count,
    totalFcs: summary.fc_count,
    totalLife4s: summary.life4_count,
    totalClears: summary.clear_count,
    totalAAAs: summary.aaa_count,
  };
}

function levelHaloStatsFromPrecomputed(levelStats: PlayerLevelStatsRow[]): LevelHaloStats[] {
  return levelStats
    .map(ls => ({
      level: ls.difficulty_level,
      catalogTotal: ls.total_charts_available,
      played: ls.played,
      mfc: ls.mfc_count,
      pfc: ls.pfc_count,
      gfc: ls.gfc_count,
      fc: ls.fc_count,
      life4: ls.life4_count,
      clear: ls.clear_count,
      fail: ls.fail_count,
    }))
    .sort((a, b) => a.level - b.level);
}

// ============================================================================
// PROFILE CALCULATION
// ============================================================================

function calculateStdDev(scores: number[]): number {
  if (scores.length < 2) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const squaredDiffs = scores.map(s => Math.pow(s - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / scores.length);
}

function getMasteryTier(lm: { pfcRate: number; aaaRate: number; fcRate: number; clearRate: number; scoreVariance: number }): MasteryTier {
  if (lm.pfcRate >= 0.20 && lm.aaaRate >= 0.60 && lm.scoreVariance < 150000) return 'crushing';
  if (lm.pfcRate >= 0.10 || lm.aaaRate >= 0.50) return 'solid';
  if (lm.fcRate >= 0.10 && lm.aaaRate >= 0.20) return 'pushing';
  if (lm.clearRate >= 0.3) return 'survival';
  return 'untouched';
}

function calculateLevelMastery(userScores: UserScore[]): LevelMastery[] {
  const levelMap = new Map<number, { scores: number[]; clears: number; fcs: number; gfcs: number; pfcs: number; mfcs: number; aaas: number }>();

  for (const score of userScores) {
    const level = score.musicdb?.difficulty_level;
    if (!level || level < 12) continue;

    const current = levelMap.get(level) || { scores: [], clears: 0, fcs: 0, gfcs: 0, pfcs: 0, mfcs: 0, aaas: 0 };
    if (score.score) current.scores.push(score.score);

    const halo = score.halo?.toLowerCase() || '';
    if (!['fail', 'none', ''].includes(halo)) current.clears++;
    if (halo === 'fc') current.fcs++;
    if (halo === 'gfc') current.gfcs++;
    if (halo === 'pfc') current.pfcs++;
    if (halo === 'mfc') current.mfcs++;

    const rank = score.rank?.toUpperCase() || '';
    if (rank === 'AAA') current.aaas++;

    levelMap.set(level, current);
  }

  const mastery: LevelMastery[] = [];
  for (const [level, data] of levelMap.entries()) {
    if (data.scores.length === 0) continue;

    const played = data.scores.length;
    const avgScore = data.scores.reduce((a, b) => a + b, 0) / played;
    const variance = calculateStdDev(data.scores);
    
    const clearRate = data.clears / played;
    const totalFcs = data.fcs + data.gfcs + data.pfcs + data.mfcs;
    const fcRate = totalFcs / played;
    const pfcOrBetter = data.pfcs + data.mfcs;
    const pfcRate = pfcOrBetter / played;
    const aaaRate = data.aaas / played;

    const lmData = {
      level,
      played,
      avgScore: Math.round(avgScore),
      scoreVariance: Math.round(variance),
      clearRate,
      fcRate,
      pfcRate,
      aaaRate,
      pfcCount: data.pfcs,
      aaaCount: data.aaas,
      fcCount: data.fcs,
      gfcCount: data.gfcs,
      mfcCount: data.mfcs,
      masteryTier: 'untouched' as MasteryTier,
    };
    
    lmData.masteryTier = getMasteryTier(lmData);
    mastery.push(lmData);
  }

  return mastery.sort((a, b) => a.level - b.level);
}

function calculateProficiency(
  userScores: UserScore[],
  chartAnalysis: ChartAnalysis[],
  pfcCeiling: number,
  metric: 'crossovers' | 'footswitches' | 'jacks' | 'notes'
): { score: number; consistency: number } {
  const relevantCharts = chartAnalysis.filter(c => c.difficulty_level >= pfcCeiling - 1 && c.difficulty_level <= pfcCeiling + 1);
  if (relevantCharts.length === 0) return { score: 5, consistency: 5 };

  const thresholds: Record<string, { high: number; low: number }> = {
    crossovers: { high: 15, low: 5 },
    footswitches: { high: 10, low: 3 },
    jacks: { high: 20, low: 5 },
    notes: { high: 400, low: 200 },
  };

  const threshold = thresholds[metric] || { high: 10, low: 3 };
  const highSkillCharts = relevantCharts.filter(c => (c[metric] as number) >= threshold.high);
  const lowSkillCharts = relevantCharts.filter(c => (c[metric] as number) < threshold.low);

  if (highSkillCharts.length === 0 || lowSkillCharts.length === 0) return { score: 5, consistency: 5 };

  const scoreMap = new Map<string, number[]>();
  for (const score of userScores) {
    if (score.score && score.musicdb) {
      const key = `${score.musicdb.song_id}_${score.musicdb.difficulty_name}`;
      const existing = scoreMap.get(key) || [];
      existing.push(score.score);
      scoreMap.set(key, existing);
    }
  }

  const getScores = (charts: ChartAnalysis[]): number[] => {
    const allScores: number[] = [];
    for (const chart of charts) {
      const key = `${chart.song_id}_${chart.difficulty_name}`;
      const scores = scoreMap.get(key);
      if (scores) allScores.push(Math.max(...scores));
    }
    return allScores;
  };

  const highScores = getScores(highSkillCharts);
  const lowScores = getScores(lowSkillCharts);

  if (highScores.length === 0 || lowScores.length === 0) return { score: 5, consistency: 5 };

  const avgHigh = highScores.reduce((a, b) => a + b, 0) / highScores.length;
  const avgLow = lowScores.reduce((a, b) => a + b, 0) / lowScores.length;

  const highVariance = calculateStdDev(highScores);
  const consistency = Math.min(10, Math.max(1, Math.round(10 - highVariance / 5000)));

  const diff = avgHigh - avgLow;
  const profScore = Math.min(10, Math.max(1, Math.round(5 + diff / 10000)));

  return { score: profScore, consistency };
}

function calculateSpeedProficiency(userScores: UserScore[], chartAnalysis: ChartAnalysis[], pfcCeiling: number): { score: number; consistency: number } {
  const relevantCharts = chartAnalysis.filter(c => c.difficulty_level >= pfcCeiling - 1 && c.difficulty_level <= pfcCeiling + 1);
  if (relevantCharts.length === 0) return { score: 5, consistency: 5 };

  const fastCharts = relevantCharts.filter(c => c.bpm != null && c.bpm >= 180);
  const slowCharts = relevantCharts.filter(c => c.bpm != null && c.bpm < 160);

  if (fastCharts.length === 0 || slowCharts.length === 0) return { score: 5, consistency: 5 };

  const scoreMap = new Map<string, number[]>();
  for (const score of userScores) {
    if (score.score && score.musicdb) {
      const key = `${score.musicdb.song_id}_${score.musicdb.difficulty_name}`;
      const existing = scoreMap.get(key) || [];
      existing.push(score.score);
      scoreMap.set(key, existing);
    }
  }

  const getScores = (charts: ChartAnalysis[]): number[] => {
    const allScores: number[] = [];
    for (const chart of charts) {
      const key = `${chart.song_id}_${chart.difficulty_name}`;
      const scores = scoreMap.get(key);
      if (scores) allScores.push(Math.max(...scores));
    }
    return allScores;
  };

  const fastScores = getScores(fastCharts);
  const slowScores = getScores(slowCharts);

  if (fastScores.length === 0 || slowScores.length === 0) return { score: 5, consistency: 5 };

  const avgFast = fastScores.reduce((a, b) => a + b, 0) / fastScores.length;
  const avgSlow = slowScores.reduce((a, b) => a + b, 0) / slowScores.length;

  const fastVariance = calculateStdDev(fastScores);
  const consistency = Math.min(10, Math.max(1, Math.round(10 - fastVariance / 5000)));

  const diff = avgFast - avgSlow;
  return { score: Math.min(10, Math.max(1, Math.round(5 + diff / 10000))), consistency };
}

function buildPlayerProfile(userScores: UserScore[], chartAnalysis: ChartAnalysis[]): PlayerProfile {
  const levelMastery = calculateLevelMastery(userScores);
  
  let clearCeiling = 12, fcCeiling = 12, pfcCeiling = 12;
  for (const lm of levelMastery) {
    if (lm.clearRate > 0.3 && lm.played >= 3) clearCeiling = lm.level;
    const totalFcs = lm.fcCount + lm.gfcCount + lm.pfcCount + lm.mfcCount;
    if (totalFcs >= 3) fcCeiling = lm.level;
    if ((lm.pfcCount + lm.mfcCount) >= 3) pfcCeiling = lm.level;
  }

  let playerStage: PlayerStage = 'developing';
  if (pfcCeiling >= 18) playerStage = 'elite';
  else {
    const lv17 = levelMastery.find(l => l.level === 17);
    if (lv17 && lv17.pfcRate > 0.3 && pfcCeiling >= 17) playerStage = 'elite';
    else if (pfcCeiling >= 16 || fcCeiling >= 17) playerStage = 'advanced';
    else if (pfcCeiling >= 14 || clearCeiling >= 16) playerStage = 'intermediate';
  }

  let comfortCeiling = 12;
  for (const lm of levelMastery) {
    if (lm.masteryTier === 'crushing' || lm.masteryTier === 'solid') comfortCeiling = lm.level;
  }

  const level12PlusScores = userScores.filter(s => s.musicdb?.difficulty_level && s.musicdb.difficulty_level >= 12);

  return {
    playerStage,
    clearCeiling,
    fcCeiling,
    pfcCeiling,
    comfortCeiling,
    totalPlays: userScores.length,
    level12PlusPlays: level12PlusScores.length,
    levelMastery,
    proficiencies: {
      crossovers: calculateProficiency(userScores, chartAnalysis, pfcCeiling, 'crossovers'),
      footswitches: calculateProficiency(userScores, chartAnalysis, pfcCeiling, 'footswitches'),
      stamina: calculateProficiency(userScores, chartAnalysis, pfcCeiling, 'notes'),
      speed: calculateSpeedProficiency(userScores, chartAnalysis, pfcCeiling),
      jacks: calculateProficiency(userScores, chartAnalysis, pfcCeiling, 'jacks'),
    },
  };
}

// ============================================================================
// STATS CALCULATION
// ============================================================================

function calculateTotalStats(userScores: UserScore[]): TotalStats {
  let totalMfcs = 0, totalPfcs = 0, totalGfcs = 0, totalFcs = 0, totalLife4s = 0, totalClears = 0, totalAAAs = 0;

  for (const score of userScores) {
    const halo = score.halo?.toLowerCase() || '';
    const rank = score.rank?.toUpperCase() || '';

    if (halo === 'mfc') totalMfcs++;
    if (halo === 'pfc') totalPfcs++;
    if (halo === 'gfc') totalGfcs++;
    if (halo === 'fc') totalFcs++;
    if (halo === 'life4') totalLife4s++;
    if (!['fail', 'none', ''].includes(halo)) totalClears++;
    if (rank === 'AAA') totalAAAs++;
  }

  return { totalPlayed: userScores.length, totalMfcs, totalPfcs, totalGfcs, totalFcs, totalLife4s, totalClears, totalAAAs };
}

interface LevelHaloStats {
  level: number;
  catalogTotal: number;
  played: number;
  mfc: number;
  pfc: number;
  gfc: number;
  fc: number;
  life4: number;
  clear: number;
  fail: number;
}

function calculateLevelHaloStats(userScores: UserScore[], chartAnalysis: ChartAnalysis[]): LevelHaloStats[] {
  const catalogCounts = new Map<number, number>();
  for (const chart of chartAnalysis) {
    catalogCounts.set(chart.difficulty_level, (catalogCounts.get(chart.difficulty_level) || 0) + 1);
  }

  const levelMap = new Map<number, { played: number; mfc: number; pfc: number; gfc: number; fc: number; life4: number; clear: number; fail: number }>();

  for (const score of userScores) {
    const level = score.musicdb?.difficulty_level;
    if (!level) continue;

    const current = levelMap.get(level) || { played: 0, mfc: 0, pfc: 0, gfc: 0, fc: 0, life4: 0, clear: 0, fail: 0 };
    current.played++;

    const halo = score.halo?.toLowerCase() || '';
    if (halo === 'mfc') current.mfc++;
    else if (halo === 'pfc') current.pfc++;
    else if (halo === 'gfc') current.gfc++;
    else if (halo === 'fc') current.fc++;
    else if (halo === 'life4') current.life4++;
    else if (halo === 'clear') current.clear++;
    else if (halo === 'fail') current.fail++;

    levelMap.set(level, current);
  }

  const allLevels = new Set([...catalogCounts.keys(), ...levelMap.keys()]);
  const results: LevelHaloStats[] = [];

  for (const level of allLevels) {
    const catalogTotal = catalogCounts.get(level) || 0;
    const userData = levelMap.get(level) || { played: 0, mfc: 0, pfc: 0, gfc: 0, fc: 0, life4: 0, clear: 0, fail: 0 };
    results.push({ level, catalogTotal, ...userData });
  }

  return results.sort((a, b) => a.level - b.level);
}

// ============================================================================
// SKILL PROMPTS
// ============================================================================

function masteryTierLabel(tier: MasteryTier): string {
  const labels: Record<MasteryTier, string> = { crushing: 'CRUSHING', solid: 'SOLID', pushing: 'PUSHING', survival: 'SURVIVAL', untouched: 'BARELY TOUCHED' };
  return labels[tier];
}

function stageDescription(stage: PlayerStage): string {
  const descriptions: Record<PlayerStage, string> = {
    developing: 'DEVELOPING (primary metric: clears and FCs)',
    intermediate: 'INTERMEDIATE (primary metric: FCs and early PFCs)',
    advanced: 'ADVANCED (primary metric: PFCs and AAA rate)',
    elite: 'ELITE (primary metric: MFCs and score optimization)',
  };
  return descriptions[stage];
}

function getStageRules(stage: PlayerStage): string {
  const stageRules: Record<PlayerStage, string> = {
    developing: `This is a DEVELOPING player. Celebrate clears! Getting through a song at a new level IS an achievement. Focus on pattern recognition and basic technique.`,
    intermediate: `This is an INTERMEDIATE player. Celebrate FCs and early PFCs. They're past survival mode but still building consistency.`,
    advanced: `This is an ADVANCED player. Clears don't impress them—PFCs and scores do. Be direct about weaknesses.`,
    elite: `This is an ELITE player. Focus on MFCs, EX scores, marvelous rates. They know the game deeply—be technical and specific.`,
  };
  return stageRules[stage];
}

function buildCorePrompt(): string {
  return `You are Edi, a DDR coach. Be CONCISE—2-3 sentences per point max. Talk like a knowledgeable friend at the arcade.

══════════════════════════════════════════════════════════════════════════════
⚠️ ANTI-HALLUCINATION RULES — VERIFY BEFORE EVERY RESPONSE
══════════════════════════════════════════════════════════════════════════════

These rules override everything else. Before EVERY response, check:

1. ONLY reference songs from the CURRENT tool results in THIS turn.
   Songs mentioned earlier in conversation history are STALE — do NOT re-recommend them.
2. If you need song data, CALL A TOOL. Never rely on memory of previous results.
3. NEVER invent song names, scores, halos, or achievements. If unsure, ask or look it up.
4. Every [[SONG:...]] marker must be COPIED from a tool result — never constructed.
5. If a user asks about a song from earlier in the conversation, call search_songs again.
6. NEVER recommend a song not returned by a tool call.
7. If a tool returns 4 songs, recommend AT MOST those 4 songs.
8. If a tool shows user_score as null, user has NOT played that song.

═══ RESPONSE RULES ═══
- Max 2-3 sentences per point
- When recommending songs, output 3-5 songs using [[SONG:...]] format
- COPY the [[SONG:...]] markers EXACTLY as shown from tool results
- ALWAYS end with 2-3 follow-ups: [[FOLLOWUP:suggestion text here]]
`;
}

function buildScoringTerminology(): string {
  return `
═══ SCORING TERMINOLOGY ═══
MONEY SCORE: 0-1,000,000. Max 1,000,000 = all Marvelous judgements.
GRADES: AAA (990,000+) | AA+ (950,000+) | AA (900,000+) | A+ (850,000+) | A (800,000+)
⚠️ Score of 1,000,000 is MFC, NOT PFC. PFC target is 999,910-999,990.
`;
}

function buildHaloTerminology(): string {
  return `
═══ HALO/LAMP TYPES ═══
- CLEAR: Completed song, has misses
- FC (Full Combo): No misses, all OKs. "Blue Combo"
- GFC (Great Full Combo): No Miss/Good. "Green Combo"
- PFC (Perfect Full Combo): No Miss/Good/Great. "Gold Combo"
- MFC (Marvelous Full Combo): ONLY Marvelouses. "White Combo" = 1,000,000 score
`;
}

function buildPatternTerminology(): string {
  return `
═══ PATTERN TERMINOLOGY ═══
- CROSSOVERS: Patterns requiring hip rotation (LDR, RDL)
- FOOTSWITCHES: Switching which foot hits a pattern
- JACKS: Same arrow multiple times with same foot
- DRILLS: Rapid alternating between two arrows
- STAMINA: High note density, physically demanding
Say "crossovers" not "crosses", "footswitches" not "foot switches", "jacks" not "jackhammer". NEVER say "ankle".
`;
}

function buildShockArrowTerminology(): string {
  return `
═══ SHOCK ARROWS ═══
Shock arrows are OBSTACLES TO AVOID, not arrows to hit. Stepping on them damages life and breaks combo.
⚠️ Database field is "mines" but ALWAYS say "shock arrows" to the player.
When player asks for "shock arrow charts" — they want charts WITH shocks as a challenge feature.
`;
}

function buildOffsetTerminology(): string {
  return `
═══ SONG OFFSET RULES ═══
Format offset as: +Nms or -Nms (e.g., "+3ms", "-6ms")
Do NOT show raw decimals or add descriptions like "(early)" or "(late)".
Example: "Set your offset to -6ms" NOT "The offset is -0.006 (Slightly early)"
`;
}

function buildGoalsTerminology(): string {
  return `
═══ GOALS AWARENESS ═══
Use get_user_goals tool when:
- User asks about their goals or progress
- You notice a score might relate to a goal
- User seems unsure what to work on (check for active goals first)
Do NOT call get_user_goals on every message — only when relevant.
`;
}

function buildPlayerProfilePrompt(profile: PlayerProfile): string {
  const masteryLines = profile.levelMastery
    .filter(lm => lm.level >= 14)
    .map(lm => {
      const pfcPct = Math.round(lm.pfcRate * 100);
      const aaaPct = Math.round(lm.aaaRate * 100);
      const varianceK = Math.round(lm.scoreVariance / 1000);
      return `Lv${lm.level}: ${masteryTierLabel(lm.masteryTier)} - ${lm.pfcCount} PFCs, ${lm.mfcCount} MFCs (${pfcPct}% PFC+MFC rate), ${lm.aaaCount} AAAs (${aaaPct}%), ${varianceK}k variance`;
    })
    .join('\n');

  const profLines = [
    `Crossovers: ${profile.proficiencies.crossovers.score}/10 skill, ${profile.proficiencies.crossovers.consistency}/10 consistency`,
    `Footswitches: ${profile.proficiencies.footswitches.score}/10 skill, ${profile.proficiencies.footswitches.consistency}/10 consistency`,
    `Stamina: ${profile.proficiencies.stamina.score}/10 skill, ${profile.proficiencies.stamina.consistency}/10 consistency`,
    `Speed: ${profile.proficiencies.speed.score}/10 skill, ${profile.proficiencies.speed.consistency}/10 consistency`,
    `Jacks: ${profile.proficiencies.jacks.score}/10 skill, ${profile.proficiencies.jacks.consistency}/10 consistency`,
  ].join('\n');

  return `
══════════════════════════════════════════════════════════════════════════════
PLAYER PROFILE
══════════════════════════════════════════════════════════════════════════════

COACHING APPROACH: ${getStageRules(profile.playerStage)}

PLAYER STAGE: ${stageDescription(profile.playerStage)}

CEILINGS:
- PFC Ceiling: Level ${profile.pfcCeiling} | FC Ceiling: Level ${profile.fcCeiling}
- Clear Ceiling: Level ${profile.clearCeiling} | Comfort Ceiling: Level ${profile.comfortCeiling}

SKILL PROFICIENCIES:
${profLines}

LEVEL MASTERY (Lv14+):
${masteryLines}
`;
}

function buildCountingStatsPrompt(totalStats: TotalStats): string {
  return `
══════════════════════════════════════════════════════════════════════════════
COUNTING STATS (ALL LEVELS 1-19)
══════════════════════════════════════════════════════════════════════════════

- Total Charts Played: ${totalStats.totalPlayed}
- MFCs: ${totalStats.totalMfcs} | PFCs: ${totalStats.totalPfcs} | GFCs: ${totalStats.totalGfcs} | FCs: ${totalStats.totalFcs}
- LIFE4s: ${totalStats.totalLife4s} | Clears: ${totalStats.totalClears} | AAAs: ${totalStats.totalAAAs}

⚠️ READ the number above — do NOT calculate or estimate.
`;
}

function buildLevelHaloStatsPrompt(levelHaloStats: LevelHaloStats[]): string {
  const lines = levelHaloStats
    .filter(s => s.played > 0 || s.catalogTotal > 0)
    .map(s => {
      const unplayed = s.catalogTotal - s.played;
      const pfcd = s.pfc + s.mfc;
      const fcd = pfcd + s.gfc + s.fc;
      const cleared = s.played - s.fail;
      const leftToPfc = s.catalogTotal - pfcd;
      const leftToFc = s.catalogTotal - fcd;
      const leftToClear = s.catalogTotal - cleared;
      return `Lv${s.level}: ${s.catalogTotal} catalog, ${s.played} played (${unplayed} unplayed) | MFC:${s.mfc} PFC:${s.pfc} GFC:${s.gfc} FC:${s.fc} LIFE4:${s.life4} CLEAR:${s.clear} FAIL:${s.fail} | PFC'd:${pfcd} left-to-PFC:${leftToPfc} FC'd:${fcd} left-to-FC:${leftToFc} cleared:${cleared} left-to-clear:${leftToClear}`;
    })
    .join('\n');

  return `
══════════════════════════════════════════════════════════════════════════════
PER-LEVEL HALO BREAKDOWN
══════════════════════════════════════════════════════════════════════════════

${lines}

⚠️ HALO COUNTING RULES:

Each song has EXACTLY ONE halo — its best achievement. Halos do NOT stack.
HALO HIERARCHY (best → worst): MFC > PFC > GFC > FC > LIFE4 > CLEAR > FAIL

PRE-COMPUTED ANSWERS — USE THESE DIRECTLY (do NOT recalculate):
- "How many Xs have I PFC'd?" → Read PFC'd value (includes MFCs since MFC > PFC)
- "How many Xs left to PFC?" → Read left-to-PFC value
- "How many Xs left to FC?" → Read left-to-FC value
- "How many Xs have I cleared?" → Read cleared value
- "How many Xs have I [exact halo]'d?" → Read that halo's count (e.g. GFC:5 means exactly 5 GFCs)
- "What songs have I [halo]'d?" → Use get_songs_by_criteria with halo_filter
`;
}

function buildSdpRulesPrompt(): string {
  return `
══════════════════════════════════════════════════════════════════════════════
SDP (SINGLE DIGIT PERFECTS) RULES
══════════════════════════════════════════════════════════════════════════════

⚠️ SDP IS A TYPE OF PFC — YOU CANNOT HAVE SDP WITHOUT PFC FIRST!

SCORE THRESHOLDS (PFC required for all):
* 1,000,000 = MFC (0 perfects) | * 999,910-999,990 = SDP (1-9 perfects)
* 999,800-999,900 = CLOSE to SDP (10-20 perfects) ← Best SDP targets

WHEN USER ASKS FOR "SDP TARGETS":
1. Filter to songs where halo = 'pfc' (NOT gfc, fc, or lower)
2. Filter to score 999,800-999,900
`;
}

function buildWarmupRulesPrompt(): string {
  return `
══════════════════════════════════════════════════════════════════════════════
WARMUP SET RULES
══════════════════════════════════════════════════════════════════════════════

WARMUP LEVEL FORMULA: Warmups should be 4-5 levels BELOW target:
| Target 17s → 12s, 13s, 14s | Target 16s → 11s, 12s, 13s | Target 15s → 10s, 11s, 12s |

⚠️ WRONG: Warming up for 17s with 15s and 16s (too close!)
`;
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

interface ToolDefinition {
  type: "function";
  function: { name: string; description: string; parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] } };
}

const toolDefinitions: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "search_songs",
      description: "Search for DDR songs by name, with optional filters. Returns song details and user's score if they have one.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Song name or partial name to search for" },
          difficulty_level: { type: "integer", description: "Filter to specific difficulty level (1-20)", minimum: 1, maximum: 20 },
          difficulty_name: { type: "string", description: "Filter to specific difficulty name", enum: ["Beginner", "Basic", "Difficult", "Expert", "Challenge"] },
          include_user_scores: { type: "boolean", description: "Include user's scores on matched songs (default: true)", default: true },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_songs_by_criteria",
      description: "Filter songs by gameplay criteria. Use for recommendations, practice suggestions, finding songs with specific patterns, or listing songs by halo type. Use is_* halo filters for exact halo matches (e.g., is_gfc for exactly GFC, is_life4 for exactly LIFE4).",
      parameters: {
        type: "object",
        properties: {
          difficulty_level: { type: "integer", description: "Filter to exact difficulty level (1-20)", minimum: 1, maximum: 20 },
          min_difficulty_level: { type: "integer", description: "Minimum difficulty level", minimum: 1, maximum: 20 },
          max_difficulty_level: { type: "integer", description: "Maximum difficulty level", minimum: 1, maximum: 20 },
          difficulty_name: { type: "string", enum: ["Beginner", "Basic", "Difficult", "Expert", "Challenge"] },
          halo_filter: {
            type: "string",
            description: "Filter by user's halo status. EXACT MATCH filters (is_X) return songs with exactly that halo: is_mfc, is_pfc, is_gfc, is_fc, is_life4, is_clear, is_fail. RANGE filters: no_score (unplayed), no_clear (no clear/fail/unplayed), clear_no_fc (cleared but no full combo — includes CLEAR and LIFE4), fc_no_pfc (has FC or GFC but not PFC/MFC), has_gfc (GFC or better — GFC+PFC+MFC), pfc_no_mfc (exactly PFC), has_pfc (PFC or MFC), has_mfc (exactly MFC).",
            enum: ["no_score", "no_clear", "clear_no_fc", "fc_no_pfc", "has_gfc", "pfc_no_mfc", "has_pfc", "has_mfc", "is_mfc", "is_pfc", "is_gfc", "is_fc", "is_life4", "is_clear", "is_fail"],
          },
          min_crossovers: { type: "integer", minimum: 0 },
          min_footswitches: { type: "integer", minimum: 0 },
          min_jacks: { type: "integer", minimum: 0 },
          min_mines: { type: "integer", minimum: 0, description: "Minimum shock arrow count. Shock arrows are obstacles to AVOID, not hit. Database field is 'mines' but ALWAYS call them 'shock arrows'." },
          min_stops: { type: "integer", minimum: 0 },
          min_notes: { type: "integer", minimum: 0 },
          min_bpm: { type: "integer", minimum: 0 },
          max_bpm: { type: "integer", minimum: 0 },
          min_score: { type: "integer", minimum: 0, maximum: 1000000 },
          max_score: { type: "integer", minimum: 0, maximum: 1000000 },
          era: { type: "integer", minimum: 0 },
          sort_by: { type: "string", enum: ["crossovers", "footswitches", "jacks", "shock_arrows", "notes", "bpm", "peak_nps", "score", "random"], description: "Field to sort results by. 'shock_arrows' sorts by shock arrow count." },
          limit: { type: "integer", minimum: 1, maximum: 25, default: 10 },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_song_offset",
      description: "Look up the recommended judgement offset for a specific song.",
      parameters: { type: "object", properties: { query: { type: "string", description: "Song name to look up offset for" } }, required: ["query"] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_catalog_stats",
      description: "Get counts of songs/charts available in the catalog, optionally filtered by difficulty level.",
      parameters: { type: "object", properties: { difficulty_level: { type: "integer", minimum: 1, maximum: 20 } }, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_goals",
      description: "Fetch the user's goals and their current progress. Use this when the user asks about their goals, asks how they're doing, or when you want to check if a recent score or achievement is relevant to one of their goals. Do NOT call this on every message — only when goals are specifically relevant to the conversation.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter goals by completion status (default: active)", enum: ["active", "completed", "all"] },
          include_progress: { type: "boolean", description: "Include current progress calculation (default: true)" },
        },
        required: [],
      },
    },
  },
];

const toolsSystemPrompt = `
══════════════════════════════════════════════════════════════════════════════
AVAILABLE DATA TOOLS
══════════════════════════════════════════════════════════════════════════════

You have access to tools that query the DDR database. USE THEM — do NOT guess.

- search_songs: Find songs by name
- get_songs_by_criteria: Filter songs by level, patterns, halo status, etc.
  Use is_* filters for exact halo matches: is_mfc, is_pfc, is_gfc, is_fc, is_life4, is_clear, is_fail
  Use range filters: no_score, clear_no_fc, fc_no_pfc, has_pfc, has_mfc, etc.
- get_song_offset: Look up timing offset for a song
- get_catalog_stats: Get counts of available charts by level
- get_user_goals: Fetch user's goals and progress. Only use when goals are relevant.
`;

// ============================================================================
// TOOL EXECUTOR
// ============================================================================

interface SongMarker { song_id: number; difficulty: string; eamuse_id: string | null }

function formatSongMarker(song: SongMarker): string {
  return `[[SONG:${JSON.stringify(song)}]]`;
}

async function searchSongs(
  args: { query: string; difficulty_level?: number; difficulty_name?: string; include_user_scores?: boolean },
  supabaseServiceRole: SupabaseClient,
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { query, difficulty_level, difficulty_name, include_user_scores = true } = args;

  let musicDbQuery = supabaseServiceRole
    .from("musicdb")
    .select("id, song_id, name, artist, difficulty_name, difficulty_level, eamuse_id, era, sanbai_rating")
    .eq("playstyle", "SP").eq("deleted", false).ilike("name", `%${query}%`).order("difficulty_level", { ascending: true }).limit(50);

  if (difficulty_level !== undefined) musicDbQuery = musicDbQuery.eq("difficulty_level", difficulty_level);
  if (difficulty_name !== undefined) musicDbQuery = musicDbQuery.eq("difficulty_name", difficulty_name);

  const { data: musicDbResults, error: musicDbError } = await musicDbQuery;
  if (musicDbError) return JSON.stringify({ error: "Failed to search songs", details: musicDbError.message });
  if (!musicDbResults || musicDbResults.length === 0) return JSON.stringify({ message: `No songs found matching "${query}"`, results: [] });

  const songIds = [...new Set(musicDbResults.map(m => m.song_id))];
  const musicdbIds = musicDbResults.map(m => m.id);

  const { data: chartData } = await supabaseServiceRole
    .from("chart_analysis")
    .select("song_id, difficulty_name, crossovers, full_crossovers, footswitches, up_footswitches, down_footswitches, sideswitches, jacks, notes, bpm, peak_nps, mines, stop_count, stream")
    .in("song_id", songIds);

  const chartMap = new Map<string, Record<string, unknown>>();
  if (chartData) for (const c of chartData) chartMap.set(`${c.song_id}_${(c.difficulty_name as string).toUpperCase()}`, c);

  const userScoreMap = new Map<number, { score: number; halo: string; rank: string; flare: number | null }>();
  if (include_user_scores) {
    const { data: userScores } = await supabase.from("user_scores").select("musicdb_id, score, halo, rank, flare").eq("user_id", userId).in("musicdb_id", musicdbIds);
    if (userScores) for (const us of userScores) userScoreMap.set(us.musicdb_id, { score: us.score, halo: us.halo, rank: us.rank, flare: us.flare });
  }

  const results = musicDbResults.map(m => {
    const chartKey = `${m.song_id}_${(m.difficulty_name as string).toUpperCase()}`;
    const patterns = chartMap.get(chartKey);
    const userScore = userScoreMap.get(m.id);
    return {
      display_marker: formatSongMarker({ song_id: m.song_id, difficulty: m.difficulty_name, eamuse_id: m.eamuse_id }),
      name: m.name, artist: m.artist, difficulty: m.difficulty_name, level: m.difficulty_level, era: m.era, sanbai_rating: m.sanbai_rating,
      patterns: patterns ? { crossovers: patterns.crossovers, footswitches: patterns.footswitches, jacks: patterns.jacks, shock_arrows: patterns.mines, notes: patterns.notes, bpm: patterns.bpm, peak_nps: patterns.peak_nps, stop_count: patterns.stop_count } : null,
      user_score: userScore ? { score: userScore.score, halo: userScore.halo, rank: userScore.rank, flare: userScore.flare } : null,
    };
  });

  return JSON.stringify({ message: `Found ${results.length} chart(s) matching "${query}"`, instruction: "ONLY recommend songs from THIS result. Do NOT reference songs from earlier in the conversation. Copy each song's display_marker EXACTLY as shown.", results });
}

async function getSongsByCriteria(
  args: Record<string, unknown>,
  supabaseServiceRole: SupabaseClient,
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { difficulty_level, min_difficulty_level, max_difficulty_level, difficulty_name, halo_filter, min_crossovers, min_footswitches, min_jacks, min_mines, min_stops, min_notes, min_bpm, max_bpm, min_score, max_score, era, sort_by, limit = 10 } = args as {
    difficulty_level?: number; min_difficulty_level?: number; max_difficulty_level?: number; difficulty_name?: string; halo_filter?: string;
    min_crossovers?: number; min_footswitches?: number; min_jacks?: number; min_mines?: number; min_stops?: number; min_notes?: number;
    min_bpm?: number; max_bpm?: number; min_score?: number; max_score?: number; era?: number; sort_by?: string; limit?: number;
  };

  const effectiveLimit = Math.min(limit, 25);

  // Paginate user score fetch to avoid Supabase's default 1000-row limit
  let allUserScores: Record<string, unknown>[] = [];
  let scoreFrom = 0;
  let hasMoreScores = true;
  while (hasMoreScores) {
    const { data: scorePage } = await supabase
      .from("user_scores")
      .select(`musicdb_id, score, halo, rank, flare, musicdb!inner(song_id, difficulty_level, difficulty_name, name, artist, eamuse_id, deleted)`)
      .eq("user_id", userId)
      .eq("musicdb.deleted", false)
      .range(scoreFrom, scoreFrom + PAGE_SIZE - 1);
    if (scorePage && scorePage.length > 0) {
      allUserScores = [...allUserScores, ...scorePage as Record<string, unknown>[]];
      scoreFrom += PAGE_SIZE;
      hasMoreScores = scorePage.length === PAGE_SIZE;
    } else {
      hasMoreScores = false;
    }
  }

  const userScoreByMusicdbId = new Map<number, { score: number; halo: string; rank: string; flare: number | null }>();
  for (const us of allUserScores) userScoreByMusicdbId.set(us.musicdb_id as number, { score: us.score as number, halo: us.halo as string, rank: us.rank as string, flare: us.flare as number | null });

  let musicDbQuery = supabaseServiceRole.from("musicdb").select("id, song_id, name, artist, difficulty_name, difficulty_level, eamuse_id, era, sanbai_rating").eq("playstyle", "SP").eq("deleted", false);

  if (difficulty_level !== undefined) musicDbQuery = musicDbQuery.eq("difficulty_level", difficulty_level);
  if (min_difficulty_level !== undefined) musicDbQuery = musicDbQuery.gte("difficulty_level", min_difficulty_level);
  if (max_difficulty_level !== undefined) musicDbQuery = musicDbQuery.lte("difficulty_level", max_difficulty_level);
  if (difficulty_name !== undefined) musicDbQuery = musicDbQuery.eq("difficulty_name", difficulty_name);

  musicDbQuery = musicDbQuery.limit(1000);

  const { data: musicDbResults, error: musicDbError } = await musicDbQuery;
  if (musicDbError) return JSON.stringify({ error: "Failed to fetch songs", details: musicDbError.message });
  if (!musicDbResults || musicDbResults.length === 0) return JSON.stringify({ message: "No songs found matching criteria", results: [] });

  const songIds = [...new Set(musicDbResults.map(m => m.song_id))];
  const { data: chartData } = await supabaseServiceRole.from("chart_analysis").select("song_id, difficulty_name, crossovers, full_crossovers, footswitches, up_footswitches, down_footswitches, sideswitches, jacks, notes, bpm, peak_nps, mines, stop_count, stream").in("song_id", songIds);

  const chartMap = new Map<string, Record<string, unknown>>();
  if (chartData) for (const c of chartData) chartMap.set(`${c.song_id}_${(c.difficulty_name as string).toUpperCase()}`, c);

  let results: Array<{ musicdb_id: number; song_id: number; name: string; artist: string; difficulty: string; level: number; eamuse_id: string | null; era: number | null; sanbai_rating: number | null; patterns: Record<string, unknown> | null; user_score: { score: number; halo: string; rank: string; flare: number | null } | null }> = [];

  for (const m of musicDbResults) {
    const chartKey = `${m.song_id}_${(m.difficulty_name as string).toUpperCase()}`;
    const patterns = chartMap.get(chartKey);
    const userScore = userScoreByMusicdbId.get(m.id) || null;

    if (halo_filter) {
      const halo = userScore?.halo?.toLowerCase() || "";
      const hasScore = userScore !== null;
      switch (halo_filter) {
        // Range filters
        case "no_score": if (hasScore) continue; break;
        case "no_clear": if (hasScore && !["fail", "none", ""].includes(halo)) continue; break;
        case "clear_no_fc": if (!hasScore || ["fc", "gfc", "pfc", "mfc", "fail", "none", ""].includes(halo)) continue; break;
        case "fc_no_pfc": if (!hasScore || !["fc", "gfc"].includes(halo)) continue; break;
        case "has_fc": if (!hasScore || !["fc", "gfc", "pfc", "mfc"].includes(halo)) continue; break;
        case "has_gfc": if (!hasScore || !["gfc", "pfc", "mfc"].includes(halo)) continue; break;
        case "pfc_no_mfc": if (!hasScore || halo !== "pfc") continue; break;
        case "has_pfc": if (!hasScore || !["pfc", "mfc"].includes(halo)) continue; break;
        case "has_mfc": if (!hasScore || halo !== "mfc") continue; break;
        // Exact match filters
        case "is_mfc": if (!hasScore || halo !== "mfc") continue; break;
        case "is_pfc": if (!hasScore || halo !== "pfc") continue; break;
        case "is_gfc": if (!hasScore || halo !== "gfc") continue; break;
        case "is_fc": if (!hasScore || halo !== "fc") continue; break;
        case "is_life4": if (!hasScore || halo !== "life4") continue; break;
        case "is_clear": if (!hasScore || halo !== "clear") continue; break;
        case "is_fail": if (!hasScore || halo !== "fail") continue; break;
      }
    }

    if (era !== undefined && m.era !== era) continue;

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
      if (min_crossovers !== undefined || min_footswitches !== undefined || min_jacks !== undefined || min_mines !== undefined || min_stops !== undefined || min_notes !== undefined || min_bpm !== undefined || max_bpm !== undefined) continue;
    }

    if (min_score !== undefined || max_score !== undefined) {
      if (!userScore) continue;
      if (min_score !== undefined && userScore.score < min_score) continue;
      if (max_score !== undefined && userScore.score > max_score) continue;
    }

    results.push({
      musicdb_id: m.id, song_id: m.song_id, name: m.name, artist: m.artist, difficulty: m.difficulty_name, level: m.difficulty_level,
      eamuse_id: m.eamuse_id, era: m.era, sanbai_rating: m.sanbai_rating,
      patterns: patterns ? { crossovers: patterns.crossovers, footswitches: patterns.footswitches, jacks: patterns.jacks, shock_arrows: patterns.mines, notes: patterns.notes, bpm: patterns.bpm, peak_nps: patterns.peak_nps, stop_count: patterns.stop_count } : null,
      user_score: userScore,
    });
  }

  if (sort_by) {
    switch (sort_by) {
      case "crossovers": results.sort((a, b) => ((b.patterns?.crossovers as number) || 0) - ((a.patterns?.crossovers as number) || 0)); break;
      case "footswitches": results.sort((a, b) => ((b.patterns?.footswitches as number) || 0) - ((a.patterns?.footswitches as number) || 0)); break;
      case "jacks": results.sort((a, b) => ((b.patterns?.jacks as number) || 0) - ((a.patterns?.jacks as number) || 0)); break;
      case "shock_arrows": case "mines": results.sort((a, b) => ((b.patterns?.mines as number) || 0) - ((a.patterns?.mines as number) || 0)); break;
      case "notes": results.sort((a, b) => ((b.patterns?.notes as number) || 0) - ((a.patterns?.notes as number) || 0)); break;
      case "bpm": results.sort((a, b) => ((b.patterns?.bpm as number) || 0) - ((a.patterns?.bpm as number) || 0)); break;
      case "peak_nps": results.sort((a, b) => ((b.patterns?.peak_nps as number) || 0) - ((a.patterns?.peak_nps as number) || 0)); break;
      case "score": results.sort((a, b) => (b.user_score?.score || 0) - (a.user_score?.score || 0)); break;
      case "random": for (let i = results.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [results[i], results[j]] = [results[j], results[i]]; } break;
    }
  }

  const totalBeforeLimit = results.length;
  results = results.slice(0, effectiveLimit);

  const formattedResults = results.map(r => ({
    display_marker: formatSongMarker({ song_id: r.song_id, difficulty: r.difficulty, eamuse_id: r.eamuse_id }),
    name: r.name, artist: r.artist, difficulty: r.difficulty, level: r.level, era: r.era, sanbai_rating: r.sanbai_rating, patterns: r.patterns, user_score: r.user_score,
  }));

  return JSON.stringify({ message: `Found ${totalBeforeLimit} chart(s) matching criteria (showing ${formattedResults.length})`, instruction: "ONLY recommend songs from THIS result. Do NOT reference songs from earlier in the conversation. Copy each song's display_marker EXACTLY as shown. Use total_matches for counting questions.", total_matches: totalBeforeLimit, showing: formattedResults.length, results: formattedResults });
}

async function getSongOffset(args: { query: string }, supabaseServiceRole: SupabaseClient): Promise<string> {
  const { query } = args;

  const { data: musicDbResults, error: musicDbError } = await supabaseServiceRole.from("musicdb").select("song_id, name").eq("playstyle", "SP").eq("deleted", false).ilike("name", `%${query}%`).limit(10);
  if (musicDbError) return JSON.stringify({ error: "Failed to search songs", details: musicDbError.message });
  if (!musicDbResults || musicDbResults.length === 0) return JSON.stringify({ message: `No song found matching "${query}". Cannot look up offset.`, offset: null });

  const songIds = [...new Set(musicDbResults.map(m => m.song_id))];
  const songNames = [...new Set(musicDbResults.map(m => m.name))];

  const { data: biasData, error: biasError } = await supabaseServiceRole.from("song_bias").select("song_id, bias_ms, confidence").in("song_id", songIds);
  if (biasError) return JSON.stringify({ error: "Failed to fetch offset data", details: biasError.message });
  if (!biasData || biasData.length === 0) return JSON.stringify({ message: `Found song "${songNames[0]}" but no offset data is available for it.`, song_name: songNames[0], offset: null });

  const biasMap = new Map<number, { bias_ms: number; confidence: number | null }>();
  for (const b of biasData) biasMap.set(b.song_id, { bias_ms: b.bias_ms, confidence: b.confidence });

  const results = songNames.map(name => {
    const matchedRecord = musicDbResults.find(m => m.name === name);
    const songId = matchedRecord?.song_id;
    const biasInfo = songId ? biasMap.get(songId) : null;

    if (biasInfo) {
      const userOffset = Math.round(-biasInfo.bias_ms);
      const sign = userOffset >= 0 ? '+' : '';
      const formatted_offset = `${sign}${userOffset}ms`;
      return {
        song_name: name, formatted_offset, confidence: biasInfo.confidence,
        instruction: `Tell the player to set their offset to ${formatted_offset}. Use this EXACT format — do NOT show raw decimals or add descriptions like "(early)" or "(late)".`,
      };
    }
    return { song_name: name, formatted_offset: null, instruction: "No offset data available for this song." };
  });

  return JSON.stringify({ message: `Offset data for "${query}"`, results });
}

async function getCatalogStats(args: { difficulty_level?: number }, supabaseServiceRole: SupabaseClient): Promise<string> {
  const { difficulty_level } = args;

  let query = supabaseServiceRole.from("musicdb").select("difficulty_level", { count: "exact", head: false }).eq("playstyle", "SP").eq("deleted", false);
  if (difficulty_level !== undefined) query = query.eq("difficulty_level", difficulty_level);

  const { data, error, count } = await query;
  if (error) return JSON.stringify({ error: "Failed to fetch catalog stats", details: error.message });

  if (difficulty_level !== undefined) return JSON.stringify({ message: `Level ${difficulty_level} catalog statistics`, level: difficulty_level, chart_count: count || 0 });

  const levelCounts = new Map<number, number>();
  if (data) for (const row of data) levelCounts.set(row.difficulty_level, (levelCounts.get(row.difficulty_level) || 0) + 1);

  const byLevel: Array<{ level: number; count: number }> = [];
  for (const [level, cnt] of levelCounts.entries()) byLevel.push({ level, count: cnt });
  byLevel.sort((a, b) => a.level - b.level);

  return JSON.stringify({ message: "Catalog statistics by difficulty level", total_charts: count || 0, by_level: byLevel });
}

// Map lamp target to halo_filter for finding remaining (not-yet-achieved) songs
function remainingHaloFilter(targetType: string, targetValue: string): string | null {
  if (targetType === "lamp") {
    const map: Record<string, string> = {
      "clear": "no_clear", "fc": "clear_no_fc", "gfc": "clear_no_fc",
      "pfc": "fc_no_pfc", "mfc": "pfc_no_mfc",
    };
    return map[targetValue.toLowerCase()] || null;
  }
  return null;
}

// Build get_songs_by_criteria params from goal criteria for follow-up tool calls
function buildSearchParams(
  rules: Array<{ field: string; operator: string; values: unknown[] }>,
  targetType: string,
  targetValue: string,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  for (const rule of rules) {
    if (rule.field === "level" && Array.isArray(rule.values) && rule.values.length > 0) {
      const nums = rule.values.map((v: unknown) => Number(v));
      if (rule.operator === "is_between" && nums.length >= 2) {
        params.min_difficulty_level = Math.min(...nums);
        params.max_difficulty_level = Math.max(...nums);
      } else if (rule.operator === "is") {
        if (nums.length === 1) {
          params.difficulty_level = nums[0];
        } else {
          params.min_difficulty_level = Math.min(...nums);
          params.max_difficulty_level = Math.max(...nums);
        }
      }
    } else if (rule.field === "difficulty" && Array.isArray(rule.values) && rule.values.length === 1) {
      // Capitalize properly: "EXPERT" → "Expert"
      const raw = String(rule.values[0]);
      params.difficulty_name = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    }
  }

  const haloFilter = remainingHaloFilter(targetType, targetValue);
  if (haloFilter) params.halo_filter = haloFilter;

  return params;
}

// Build human-readable criteria summary
function buildCriteriaSummary(
  rules: Array<{ field: string; operator: string; values: unknown[] }>,
  targetType: string,
  targetValue: string,
): string {
  const parts: string[] = [];

  for (const rule of rules) {
    if (rule.field === "level" && Array.isArray(rule.values) && rule.values.length > 0) {
      const nums = rule.values.map((v: unknown) => Number(v));
      if (rule.operator === "is_between" && nums.length >= 2) {
        parts.push(`Level ${Math.min(...nums)}-${Math.max(...nums)}`);
      } else if (rule.operator === "is") {
        parts.push(`Level ${nums.join(", ")}`);
      } else if (rule.operator === "is_not") {
        parts.push(`Not level ${nums.join(", ")}`);
      }
    } else if (rule.field === "difficulty" && Array.isArray(rule.values)) {
      parts.push(rule.values.map((v: unknown) => String(v)).join(", "));
    }
  }

  parts.push(`${targetType.toUpperCase()} ${targetValue}`);
  return parts.join(" | ");
}

async function getUserGoals(
  args: { status?: string; include_progress?: boolean },
  supabase: SupabaseClient,
  supabaseServiceRole: SupabaseClient,
  userId: string
): Promise<string> {
  const { status = "active", include_progress = true } = args;

  const { data: goals, error: goalsError } = await supabase
    .from("user_goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (goalsError) {
    console.error("Error fetching user goals:", goalsError);
    return JSON.stringify({ error: "Failed to fetch goals", details: goalsError.message });
  }

  if (!goals || goals.length === 0) {
    return JSON.stringify({ message: "No goals found. The user hasn't set any goals yet.", goals: [] });
  }

  const goalsWithProgress: Array<Record<string, unknown>> = [];

  for (const goal of goals) {
    const rules = (goal.criteria_rules as Array<{ field: string; operator: string; values: unknown[] }>) || [];

    const goalData: Record<string, unknown> = {
      id: goal.id, name: goal.name, target_type: goal.target_type, target_value: goal.target_value,
      goal_mode: goal.goal_mode, goal_count: goal.goal_count, score_mode: goal.score_mode,
      score_floor: goal.score_floor, created_at: goal.created_at,
      criteria_summary: buildCriteriaSummary(rules, goal.target_type, goal.target_value),
      search_params: buildSearchParams(rules, goal.target_type, goal.target_value),
    };

    if (include_progress) {
      let levelValues: number[] | null = null;
      let levelOperator = "is";
      let difficultyValues: string[] | null = null;
      let difficultyOperator = "is";

      for (const rule of rules) {
        if (rule.field === "level" && Array.isArray(rule.values)) {
          levelValues = rule.values.map((v: unknown) => Number(v));
          levelOperator = rule.operator || "is";
        } else if (rule.field === "difficulty" && Array.isArray(rule.values)) {
          difficultyValues = rule.values.map((v: unknown) => String(v).toUpperCase());
          difficultyOperator = rule.operator || "is";
        }
      }

      const { data: progressData, error: progressError } = await supabaseServiceRole
        .rpc("calculate_goal_progress", {
          p_user_id: userId, p_level_values: levelValues, p_level_operator: levelOperator,
          p_difficulty_values: difficultyValues, p_difficulty_operator: difficultyOperator,
          p_target_type: goal.target_type, p_target_value: goal.target_value,
        });

      if (progressError) {
        console.error(`Error calculating progress for goal ${goal.id}:`, progressError);
        goalData.progress = { error: "Failed to calculate progress" };
      } else if (progressData && progressData.length > 0) {
        const progress = progressData[0];
        const completedCount = Number(progress.completed_count);
        const totalCount = Number(progress.total_count);
        const averageScore = Number(progress.average_score);
        const effectiveTarget = goal.goal_mode === "count" && goal.goal_count
          ? Math.min(goal.goal_count, totalCount) : totalCount;
        const isCompleted = effectiveTarget > 0 && completedCount >= effectiveTarget;
        const percentage = effectiveTarget > 0 ? Math.min(100, Math.round((completedCount / effectiveTarget) * 100)) : 0;

        goalData.progress = { completed: completedCount, target: effectiveTarget, total_matching_charts: totalCount, percentage, is_completed: isCompleted };
        if (goal.target_type === "score") {
          (goalData.progress as Record<string, unknown>).average_score = averageScore;
        }
        goalData.computed_status = isCompleted ? "completed" : "active";
      }
    }

    goalsWithProgress.push(goalData);
  }

  let filteredGoals = goalsWithProgress;
  if (status !== "all" && include_progress) {
    filteredGoals = goalsWithProgress.filter(g => g.computed_status === status);
  }

  const statusLabel = status === "all" ? "All" : status === "completed" ? "Completed" : "Active";
  const lines: string[] = [`${statusLabel} Goals (${filteredGoals.length}):`];

  for (let i = 0; i < filteredGoals.length; i++) {
    const g = filteredGoals[i];
    const progress = g.progress as Record<string, unknown> | undefined;
    const targetLabel = `${(g.target_type as string).toUpperCase()} ${g.target_value}`;

    lines.push("");
    lines.push(`${i + 1}. Goal: ${g.name}`);
    lines.push(`   Criteria: ${g.criteria_summary}`);
    lines.push(`   Target: ${targetLabel}`);

    if (progress && !progress.error) {
      const pct = progress.percentage as number;
      const completed = progress.completed as number;
      const target = progress.target as number;

      if (g.target_type === "score" && g.score_mode === "average") {
        lines.push(`   Progress: Avg. ${(progress.average_score as number)?.toLocaleString()} / Target ${Number(g.target_value).toLocaleString()}`);
      } else {
        lines.push(`   Progress: ${completed}/${target} (${pct}%)`);
      }

      if (pct >= 100) lines.push(`   Status: COMPLETED`);
      else if (pct >= 90) lines.push(`   Status: Almost there!`);
      else lines.push(`   Status: Active`);
    }

    lines.push(`   Created: ${(g.created_at as string).split("T")[0]}`);
  }

  return JSON.stringify({
    message: lines.join("\n"),
    instruction: "To recommend songs for a goal, call get_songs_by_criteria using the search_params from that goal. Each goal includes search_params with the appropriate filters already mapped.",
    goal_count: filteredGoals.length,
    goals: filteredGoals,
  });
}

async function executeToolCall(toolCall: ToolCall, supabase: SupabaseClient, supabaseServiceRole: SupabaseClient, userId: string): Promise<string> {
  const { name, arguments: argsString } = toolCall.function;

  let args: Record<string, unknown>;
  try { args = JSON.parse(argsString); } catch (e) { return JSON.stringify({ error: "Invalid tool arguments", details: String(e) }); }

  console.log(`Executing tool: ${name} with args:`, args);

  switch (name) {
    case "search_songs": return await searchSongs(args as { query: string; difficulty_level?: number; difficulty_name?: string; include_user_scores?: boolean }, supabaseServiceRole, supabase, userId);
    case "get_songs_by_criteria": return await getSongsByCriteria(args, supabaseServiceRole, supabase, userId);
    case "get_song_offset": return await getSongOffset(args as { query: string }, supabaseServiceRole);
    case "get_catalog_stats": return await getCatalogStats(args as { difficulty_level?: number }, supabaseServiceRole);
    case "get_user_goals": return await getUserGoals(args as { status?: string; include_progress?: boolean }, supabase, supabaseServiceRole, userId);
    default: return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ============================================================================
// CONVERSATION HISTORY MANAGEMENT
// ============================================================================

/**
 * Limits conversation history to prevent hallucination in long conversations.
 * As conversations grow, the LLM may mix up data from earlier messages with
 * current tool results. This function:
 * 1. Caps the number of messages sent to the LLM
 * 2. Keeps the most recent messages for continuity
 */
function prepareMessages(incomingMessages: Message[]): Message[] {
  if (incomingMessages.length <= MAX_CONVERSATION_MESSAGES) {
    return incomingMessages;
  }

  console.log(`Trimming conversation from ${incomingMessages.length} to ${MAX_CONVERSATION_MESSAGES} messages`);
  return incomingMessages.slice(-MAX_CONVERSATION_MESSAGES);
}

// ============================================================================
// SSE STREAM HELPER
// ============================================================================

function textToSSEStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const CHUNK_SIZE = 80;

  return new ReadableStream({
    start(controller) {
      for (let i = 0; i < text.length; i += CHUNK_SIZE) {
        const chunk = text.slice(i, i + CHUNK_SIZE);
        const escapedChunk = JSON.stringify(chunk).slice(1, -1);
        const event = `data: {"choices":[{"index":0,"delta":{"content":"${escapedChunk}"},"finish_reason":null}]}\n\n`;
        controller.enqueue(encoder.encode(event));
      }
      controller.enqueue(encoder.encode(`data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

// ============================================================================
// SKILL DETECTION & DYNAMIC PROMPT
// ============================================================================

interface SkillFlags {
  needsScoring: boolean;
  needsHalos: boolean;
  needsPatterns: boolean;
  needsShockArrows: boolean;
  needsOffset: boolean;
  needsGoals: boolean;
  needsSdp: boolean;
  needsWarmup: boolean;
  needsFullLevelStats: boolean;
}

function detectNeededSkills(userMessage: string): SkillFlags {
  const msg = userMessage.toLowerCase();

  return {
    needsScoring: /score|aaa|grade|rank|\d{5,}|money|ex\s?score/.test(msg),
    needsHalos: /mfc|pfc|gfc|fc|halo|lamp|combo|full\s?combo|clear/.test(msg),
    needsPatterns: /crossover|jack|footswitch|drill|stamina|pattern|stream/.test(msg),
    needsShockArrows: /shock|mine/.test(msg),
    needsOffset: /offset|timing|bias|sync|late|early/.test(msg),
    needsGoals: /goal|target|working\s?on|progress/.test(msg),
    needsSdp: /sdp|single.?digit|999[89]/.test(msg),
    needsWarmup: /warm.?up|warmup/.test(msg),
    needsFullLevelStats: /weakness|strength|ceiling|floor|mastery|breakdown|level.?\d+\s*(mastery|stats)|how.?am.?i.?doing|analyze/.test(msg),
  };
}

function buildDynamicSystemPrompt(
  userMessage: string,
  profile: PlayerProfile,
  totalStats: TotalStats,
  levelHaloStats: LevelHaloStats[]
): string {
  const skills = detectNeededSkills(userMessage);

  // ALWAYS include: Core + Profile + Counting Stats + Tools
  let systemPrompt = buildCorePrompt();
  systemPrompt += buildPlayerProfilePrompt(profile);
  systemPrompt += buildCountingStatsPrompt(totalStats);
  systemPrompt += toolsSystemPrompt;

  // CONDITIONAL: Terminology modules
  if (skills.needsScoring) systemPrompt += buildScoringTerminology();
  if (skills.needsHalos) systemPrompt += buildHaloTerminology();
  if (skills.needsPatterns) systemPrompt += buildPatternTerminology();
  if (skills.needsShockArrows) systemPrompt += buildShockArrowTerminology();
  if (skills.needsOffset) systemPrompt += buildOffsetTerminology();
  if (skills.needsGoals) systemPrompt += buildGoalsTerminology();

  // CONDITIONAL: Specific skills
  if (skills.needsSdp) systemPrompt += buildSdpRulesPrompt();
  if (skills.needsWarmup) systemPrompt += buildWarmupRulesPrompt();

  // CONDITIONAL: Full level breakdown — only when analyzing player deeply
  if (skills.needsFullLevelStats) systemPrompt += buildLevelHaloStatsPrompt(levelHaloStats);

  const loadedSkills = Object.entries(skills)
    .filter(([_, v]) => v)
    .map(([k, _]) => k);
  console.log(`Loaded skills: ${loadedSkills.join(', ') || 'core only'}`);
  console.log(`System prompt length: ${systemPrompt.length} characters`);

  return systemPrompt;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages: incomingMessages } = await req.json() as { messages: Message[] };

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = userData.user.id;
    const supabaseServiceRole = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Try pre-computed tables first (populated by process-upload after score imports)
    const [summaryRow, levelStatsRows] = await Promise.all([
      fetchPlayerSummary(supabase, userId),
      fetchPlayerLevelStats(supabase, userId),
    ]);

    let profile: PlayerProfile;
    let totalStats: TotalStats;
    let levelHaloStats: LevelHaloStats[];

    if (summaryRow && levelStatsRows.length > 0) {
      console.log("Using pre-computed player data");
      profile = profileFromPrecomputed(summaryRow, levelStatsRows);
      totalStats = totalStatsFromPrecomputed(summaryRow);
      levelHaloStats = levelHaloStatsFromPrecomputed(levelStatsRows);
    } else {
      console.log("No pre-computed data found, computing at runtime");
      const [userScores, chartAnalysis] = await Promise.all([fetchUserScores(supabase, userId), fetchMusicDb(supabaseServiceRole)]);
      profile = buildPlayerProfile(userScores, chartAnalysis);
      totalStats = calculateTotalStats(userScores);
      levelHaloStats = calculateLevelHaloStats(userScores, chartAnalysis);
    }

    console.log("Player profile:", JSON.stringify(profile, null, 2));
    console.log("Total stats:", JSON.stringify(totalStats, null, 2));

    // Get the last user message to detect needed skills
    const lastUserMessage = incomingMessages
      .filter(m => m.role === 'user')
      .pop()?.content || '';

    const systemPrompt = buildDynamicSystemPrompt(
      typeof lastUserMessage === 'string' ? lastUserMessage : '',
      profile,
      totalStats,
      levelHaloStats
    );

    const preparedMessages = prepareMessages(incomingMessages);
    const allMessages: Message[] = [{ role: "system", content: systemPrompt }, ...preparedMessages];

    let resolvedWithoutTools = false;
    let directResponseText = "";

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      console.log(`Tool-calling round ${round + 1}/${MAX_TOOL_ROUNDS}`);

      const response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, messages: allMessages, tools: toolDefinitions, tool_choice: "auto", stream: false }),
      });

      if (!response.ok) {
        if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data: ChatCompletionResponse = await response.json();
      const choice = data.choices[0];

      if (!choice) {
        console.error("No choice in response:", data);
        return new Response(JSON.stringify({ error: "Invalid AI response" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const assistantMessage = choice.message;
      const toolCalls = assistantMessage.tool_calls;

      if (!toolCalls || toolCalls.length === 0) {
        console.log("No tool calls - returning direct response as SSE");
        directResponseText = assistantMessage.content || "";
        resolvedWithoutTools = true;
        break;
      }

      console.log(`Received ${toolCalls.length} tool call(s)`);

      allMessages.push({ role: "assistant", content: assistantMessage.content, tool_calls: toolCalls });

      for (const toolCall of toolCalls) {
        console.log(`Executing tool: ${toolCall.function.name}`);
        const result = await executeToolCall(toolCall as ToolCall, supabase, supabaseServiceRole, userId);
        console.log(`Tool result length: ${result.length} chars`);
        allMessages.push({ role: "tool", tool_call_id: toolCall.id, content: result });
      }
    }

    if (resolvedWithoutTools) {
      console.log(`Returning direct response (${directResponseText.length} chars) as SSE`);
      return new Response(textToSSEStream(directResponseText), { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    console.log("Making final streaming call after tool execution");

    const finalResponse = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, messages: allMessages, tools: toolDefinitions, stream: true }),
    });

    if (!finalResponse.ok) {
      const errorText = await finalResponse.text();
      console.error("Final AI gateway error:", finalResponse.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(finalResponse.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });

  } catch (e) {
    console.error("edi-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
