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

// ============================================================================
// CONSTANTS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";
const MAX_TOOL_ROUNDS = 3;
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
      .select(`musicdb_id, score, halo, rank, flare, musicdb!inner(song_id, difficulty_level, difficulty_name, name)`)
      .eq("user_id", userId)
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
    const totalPfcs = data.pfcs + data.mfcs;
    const pfcRate = totalPfcs / played;
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
      pfcCount: totalPfcs,
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
    if (lm.pfcCount >= 3) pfcCeiling = lm.level;
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

function buildWhoIAmPrompt(): string {
  return `You are Edi, a DDR coach. Be CONCISE—2-3 sentences per point max.
Talk like a knowledgeable friend at the arcade, not a professor.

=== DDR TERMINOLOGY ===

--- SCORING ---
SCORE: A number based on the number of judgements a player gets in a song. There are two types: Money Score and EX Score.
MONEY SCORE: A number between 0 through 1,000,000. A max score of 1,000,000 means all steps had a Marvelous judgement.
EX SCORE: Points based on judgements (Marvelous=3, Perfect=2, OK=2, Great=1, others=0). NOT captured in database.

GRADING (Letter Grades) - Score thresholds:
- AAA: 990,000+ | AA+: 950,000-989,999 | AA: 900,000-949,999 | AA-: 890,000-899,999
- A+: 850,000-889,999 | A: 800,000-849,999 | A-: 790,000-799,999
- B+: 750,000-789,999 | B: 700,000-749,999 | B-: 690,000-699,999
- C+: 650,000-689,999 | C: 600,000-649,999 | C-: 590,000-599,999
- D+: 550,000-589,999 | D: below 550,000

--- HALO/LAMP TYPES ---
- CLEAR: Complete song without depleting life bar, has misses/NG judgements
- FC (Full Combo): No Miss judgements, all OKs. "Blue Combo"
- GFC (Great Full Combo): No Miss or Good judgements. "Green Combo"
- PFC (Perfect Full Combo): No Miss, Good, or Great judgements. "Gold/Yellow Combo"
- MFC (Marvelous Full Combo): ONLY Marvelouses. "White Combo"

⚠️ A score of 1,000,000 is an MFC, NOT a PFC. If trying to PFC, target is 999,910-999,990.

--- PATTERN TERMINOLOGY ---
- CROSSOVERS: Patterns that have you turning hips (LDR, RDL)
- DRILLS: Alternating between two arrows in rapid 16th notes
- FOOTSWITCHES: Switching feet on patterns, uses BOTH feet
- JACKS: Hitting single arrow multiple times with SAME foot
- STAMINA: Arrow-dense, exhausting charts

--- SHOCK ARROWS ---
SHOCK ARROWS: Special arrows that DAMAGE the player if stepped on. They are OBSTACLES TO AVOID, not arrows to hit.
- Appear as flashing/electric arrows
- Stepping on them damages your life gauge and breaks combo
- Charts with shock arrows test discipline, body control, and spatial awareness
⚠️ DB REFERENCE: The database field is called "mines" but ALWAYS say "shock arrows" to the player.
⚠️ NEVER say "mines" — ALWAYS say "shock arrows" when talking to the player.

When a player asks for "shock arrow charts" or "charts with shocks":
- They want charts that HAVE shock arrows as a CHART CHARACTERISTIC
- They enjoy the challenge of avoiding shocks while playing
- This is NOT a scoring goal or PFC target request
- DO describe the shock arrow challenge: how many shocks, the movement/avoidance required

--- SONG OFFSET DISPLAY RULES ---
When displaying song offset/bias information:
- Format offset as: +Nms or -Nms (e.g., "+3ms", "-6ms", "+0ms")
- This is how the app displays offsets — use the SAME format
- Do NOT show raw decimal bias values like "0.015" or "-5.81ms"
- Do NOT add qualitative descriptions like "(Slightly early)" or "(Late)"
- ONLY show the rounded integer with sign and "ms" suffix
- Example: "Set your offset to -6ms" NOT "The offset is -0.006 (Slightly early)"

--- RESPONSE RULES ---
- Max 2-3 sentences per point
- When recommending songs, output 3-5 songs using [[SONG:...]] format
- COPY the [[SONG:...]] markers EXACTLY as shown

--- TERMINOLOGY RULES ---
- ALWAYS say "shock arrows", NEVER say "mines" when talking to the player
- Use "jacks" NOT "jackhammer"
- NEVER use "ankle" or "ankle tapping"
- Say "crossovers" not "crosses"
- Say "footswitches" not "foot switches"

--- FOLLOW-UPS (REQUIRED) ---
At END of EVERY response, include 2-3 follow-up suggestions: [[FOLLOWUP:suggestion text here]]
`;
}

function buildPlayerProfilePrompt(profile: PlayerProfile): string {
  const masteryLines = profile.levelMastery
    .filter(lm => lm.level >= 14)
    .map(lm => {
      const pfcPct = Math.round(lm.pfcRate * 100);
      const aaaPct = Math.round(lm.aaaRate * 100);
      const varianceK = Math.round(lm.scoreVariance / 1000);
      return `Lv${lm.level}: ${masteryTierLabel(lm.masteryTier)} - ${lm.pfcCount} PFCs (${pfcPct}%), ${lm.aaaCount} AAAs (${aaaPct}%), ${varianceK}k variance`;
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
      description: "Filter songs by gameplay criteria. Use for recommendations, practice suggestions, finding songs with specific patterns.",
      parameters: {
        type: "object",
        properties: {
          difficulty_level: { type: "integer", description: "Filter to exact difficulty level (1-20)", minimum: 1, maximum: 20 },
          min_difficulty_level: { type: "integer", description: "Minimum difficulty level", minimum: 1, maximum: 20 },
          max_difficulty_level: { type: "integer", description: "Maximum difficulty level", minimum: 1, maximum: 20 },
          difficulty_name: { type: "string", enum: ["Beginner", "Basic", "Difficult", "Expert", "Challenge"] },
          halo_filter: { type: "string", enum: ["no_score", "no_clear", "clear_no_fc", "fc_no_pfc", "has_gfc", "pfc_no_mfc", "has_pfc", "has_mfc"] },
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
];

const toolsSystemPrompt = `
══════════════════════════════════════════════════════════════════════════════
AVAILABLE DATA TOOLS
══════════════════════════════════════════════════════════════════════════════

You have access to tools that query the DDR database. USE THEM — do NOT guess.

- search_songs: Find songs by name
- get_songs_by_criteria: Filter songs by level, patterns, score status, etc.
- get_song_offset: Look up timing offset for a song
- get_catalog_stats: Get counts of available charts by level

⚠️ CRITICAL RULES:
1. NEVER recommend a song not returned by a tool call
2. NEVER construct [[SONG:...]] markers yourself - ONLY copy from tool results
3. If tool returns 4 songs, recommend AT MOST those 4 songs
4. If tool shows user_score as null, user has NOT played that song

══════════════════════════════════════════════════════════════════════════════
⚠️ ANTI-HALLUCINATION RULES — VERIFY BEFORE EVERY RESPONSE
══════════════════════════════════════════════════════════════════════════════

These rules override everything else. Before EVERY response, check:

1. ONLY reference songs from the CURRENT tool results in THIS turn.
   Songs mentioned earlier in conversation history are STALE — do NOT re-recommend them.
2. If you need song data, CALL A TOOL. Never rely on memory of previous results.
3. NEVER invent song names, scores, halos, or achievements. If unsure, ask or look it up.
4. Every [[SONG:...]] marker must be COPIED from a tool result — never constructed.
5. If a user asks about a song from earlier in the conversation, call search_songs
   again to get fresh data — do NOT recite what you said before.
`;

// ============================================================================
// TOOL EXECUTOR
// ============================================================================

interface SongMarker { song_id: number; title: string; difficulty: string; level: number; eamuse_id: string | null }

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
      display_marker: formatSongMarker({ song_id: m.song_id, title: m.name, difficulty: m.difficulty_name, level: m.difficulty_level, eamuse_id: m.eamuse_id }),
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

  // Paginate user scores to ensure we fetch ALL rows (Supabase default limit is ~1000)
  let allUserScores: Record<string, unknown>[] = [];
  let userScoreFrom = 0;
  let userScoreHasMore = true;
  while (userScoreHasMore) {
    const { data: userScorePage } = await supabase.from("user_scores").select(`musicdb_id, score, halo, rank, flare, musicdb!inner(song_id, difficulty_level, difficulty_name, name, artist, eamuse_id)`).eq("user_id", userId).range(userScoreFrom, userScoreFrom + PAGE_SIZE - 1);
    if (userScorePage && userScorePage.length > 0) {
      allUserScores = [...allUserScores, ...userScorePage as Record<string, unknown>[]];
      userScoreFrom += PAGE_SIZE;
      userScoreHasMore = userScorePage.length === PAGE_SIZE;
    } else {
      userScoreHasMore = false;
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
        case "no_score": if (hasScore) continue; break;
        case "no_clear": if (hasScore && !["fail", "none", ""].includes(halo)) continue; break;
        case "clear_no_fc": if (!hasScore || ["fc", "gfc", "pfc", "mfc", "fail", "none", ""].includes(halo)) continue; break;
        case "fc_no_pfc": if (!hasScore || !["fc", "gfc"].includes(halo)) continue; break;
        case "has_gfc": if (!hasScore || !["gfc", "pfc", "mfc"].includes(halo)) continue; break;
        case "pfc_no_mfc": if (!hasScore || halo !== "pfc") continue; break;
        case "has_pfc": if (!hasScore || !["pfc", "mfc"].includes(halo)) continue; break;
        case "has_mfc": if (!hasScore || halo !== "mfc") continue; break;
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

  results = results.slice(0, effectiveLimit);

  const formattedResults = results.map(r => ({
    display_marker: formatSongMarker({ song_id: r.song_id, title: r.name, difficulty: r.difficulty, level: r.level, eamuse_id: r.eamuse_id }),
    name: r.name, artist: r.artist, difficulty: r.difficulty, level: r.level, era: r.era, sanbai_rating: r.sanbai_rating, patterns: r.patterns, user_score: r.user_score,
  }));

  return JSON.stringify({ message: `Found ${formattedResults.length} chart(s) matching criteria`, instruction: "ONLY recommend songs from THIS result. Do NOT reference songs from earlier in the conversation. Copy each song's display_marker EXACTLY as shown.", total_matches: results.length, results: formattedResults });
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
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages: incomingMessages } = await req.json() as { messages: Message[] };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    const [userScores, chartAnalysis] = await Promise.all([fetchUserScores(supabase, userId), fetchMusicDb(supabaseServiceRole)]);

    const profile = buildPlayerProfile(userScores, chartAnalysis);
    const totalStats = calculateTotalStats(userScores);

    console.log("Player profile:", JSON.stringify(profile, null, 2));
    console.log("Total stats:", JSON.stringify(totalStats, null, 2));

    let systemPrompt = buildWhoIAmPrompt();
    systemPrompt += buildPlayerProfilePrompt(profile);
    systemPrompt += buildCountingStatsPrompt(totalStats);
    systemPrompt += buildSdpRulesPrompt();
    systemPrompt += buildWarmupRulesPrompt();
    systemPrompt += toolsSystemPrompt;

    console.log(`System prompt length: ${systemPrompt.length} characters`);

    const preparedMessages = prepareMessages(incomingMessages);
    const allMessages: Message[] = [{ role: "system", content: systemPrompt }, ...preparedMessages];

    let resolvedWithoutTools = false;
    let directResponseText = "";

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      console.log(`Tool-calling round ${round + 1}/${MAX_TOOL_ROUNDS}`);

      const response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
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
      break;
    }

    if (resolvedWithoutTools) {
      console.log(`Returning direct response (${directResponseText.length} chars) as SSE`);
      return new Response(textToSSEStream(directResponseText), { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    console.log("Making final streaming call after tool execution");

    const finalResponse = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
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
