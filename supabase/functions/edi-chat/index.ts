import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
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

// Fisher-Yates shuffle for randomizing chart order
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function calculateStdDev(scores: number[]): number {
  if (scores.length < 2) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const squaredDiffs = scores.map(s => Math.pow(s - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / scores.length);
}

function getMasteryTier(lm: { pfcRate: number; aaaRate: number; fcRate: number; clearRate: number; scoreVariance: number }): MasteryTier {
  if (lm.pfcRate >= 0.20 && lm.aaaRate >= 0.60 && lm.scoreVariance < 150000) {
    return 'crushing';
  }
  if (lm.pfcRate >= 0.10 || lm.aaaRate >= 0.50) {
    return 'solid';
  }
  if (lm.fcRate >= 0.10 && lm.aaaRate >= 0.20) {
    return 'pushing';
  }
  if (lm.clearRate >= 0.3) {
    return 'survival';
  }
  return 'untouched';
}

function calculateLevelMastery(userScores: UserScore[]): LevelMastery[] {
  const levelMap = new Map<number, {
    scores: number[];
    clears: number;
    fcs: number;
    gfcs: number;
    pfcs: number;
    mfcs: number;
    aaas: number;
  }>();

  for (const score of userScores) {
    const level = score.musicdb?.difficulty_level;
    if (!level || level < 12) continue;

    const current = levelMap.get(level) || {
      scores: [],
      clears: 0,
      fcs: 0,
      gfcs: 0,
      pfcs: 0,
      mfcs: 0,
      aaas: 0,
    };

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

function calculateCeilings(levelMastery: LevelMastery[]): { clearCeiling: number; fcCeiling: number; pfcCeiling: number } {
  let clearCeiling = 12;
  let fcCeiling = 12;
  let pfcCeiling = 12;

  for (const lm of levelMastery) {
    if (lm.clearRate > 0.3 && lm.played >= 3) {
      clearCeiling = lm.level;
    }
    const totalFcs = lm.fcCount + lm.gfcCount + lm.pfcCount + lm.mfcCount;
    if (totalFcs >= 3) {
      fcCeiling = lm.level;
    }
    if (lm.pfcCount >= 3) {
      pfcCeiling = lm.level;
    }
  }

  return { clearCeiling, fcCeiling, pfcCeiling };
}

function detectPlayerStage(
  pfcCeiling: number,
  fcCeiling: number,
  clearCeiling: number,
  levelMastery: LevelMastery[]
): PlayerStage {
  if (pfcCeiling >= 18) return 'elite';
  
  const lv17 = levelMastery.find(l => l.level === 17);
  if (lv17 && lv17.pfcRate > 0.3 && pfcCeiling >= 17) return 'elite';

  if (pfcCeiling >= 16 || fcCeiling >= 17) return 'advanced';
  if (pfcCeiling >= 14 || clearCeiling >= 16) return 'intermediate';

  return 'developing';
}

function calculateProficiency(
  userScores: UserScore[],
  chartAnalysis: ChartAnalysis[],
  pfcCeiling: number,
  metric: keyof Pick<ChartAnalysis, 'crossovers' | 'footswitches' | 'jacks' | 'notes'>
): { score: number; consistency: number } {
  const relevantCharts = chartAnalysis.filter(c =>
    c.difficulty_level >= pfcCeiling - 1 &&
    c.difficulty_level <= pfcCeiling + 1
  );

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

function calculateSpeedProficiency(
  userScores: UserScore[],
  chartAnalysis: ChartAnalysis[],
  pfcCeiling: number
): { score: number; consistency: number } {
  const relevantCharts = chartAnalysis.filter(c =>
    c.difficulty_level >= pfcCeiling - 1 &&
    c.difficulty_level <= pfcCeiling + 1
  );

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
  return {
    score: Math.min(10, Math.max(1, Math.round(5 + diff / 10000))),
    consistency,
  };
}

function buildPlayerProfile(userScores: UserScore[], chartAnalysis: ChartAnalysis[]): PlayerProfile {
  const levelMastery = calculateLevelMastery(userScores);
  const { clearCeiling, fcCeiling, pfcCeiling } = calculateCeilings(levelMastery);
  const playerStage = detectPlayerStage(pfcCeiling, fcCeiling, clearCeiling, levelMastery);

  let comfortCeiling = 12;
  for (const lm of levelMastery) {
    if (lm.masteryTier === 'crushing' || lm.masteryTier === 'solid') {
      comfortCeiling = lm.level;
    }
  }

  const level12PlusScores = userScores.filter(s =>
    s.musicdb?.difficulty_level && s.musicdb.difficulty_level >= 12
  );

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

function masteryTierLabel(tier: MasteryTier): string {
  const labels: Record<MasteryTier, string> = {
    crushing: 'CRUSHING',
    solid: 'SOLID',
    pushing: 'PUSHING',
    survival: 'SURVIVAL',
    untouched: 'BARELY TOUCHED',
  };
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

function buildSystemPrompt(profile: PlayerProfile, chartAnalysis: ChartAnalysis[], userScores: UserScore[]): string {
  const masteryLines = profile.levelMastery
    .filter(lm => lm.level >= 14)
    .map(lm => {
      const pfcPct = Math.round(lm.pfcRate * 100);
      const aaaPct = Math.round(lm.aaaRate * 100);
      const varianceK = Math.round(lm.scoreVariance / 1000);
      return `Lv${lm.level}: ${masteryTierLabel(lm.masteryTier)} - ${lm.pfcCount} PFCs (${pfcPct}%), ${lm.aaaCount} AAAs (${aaaPct}%), ${varianceK}k variance`;
    })
    .join('\n');

  const songMap = new Map<number, ChartAnalysis[]>();
  for (const chart of chartAnalysis) {
    const existing = songMap.get(chart.song_id) || [];
    existing.push(chart);
    songMap.set(chart.song_id, existing);
  }

  // Group songs by max difficulty level, then shuffle within each group for variety
  const songsByLevel = new Map<number, [number, ChartAnalysis[]][]>();
  for (const entry of songMap.entries()) {
    const maxLevel = Math.max(...entry[1].map(c => c.difficulty_level));
    const existing = songsByLevel.get(maxLevel) || [];
    existing.push(entry);
    songsByLevel.set(maxLevel, existing);
  }
  
  // Shuffle songs within each level group, then combine in descending level order
  const sortedSongs: [number, ChartAnalysis[]][] = [];
  const levels = Array.from(songsByLevel.keys()).sort((a, b) => b - a);
  for (const level of levels) {
    const songsAtLevel = songsByLevel.get(level) || [];
    sortedSongs.push(...shuffleArray(songsAtLevel));
  }

  const userScoreMap = new Map<string, { score: number; halo: string; rank: string; flare: number | null }>();
  for (const score of userScores) {
    if (score.musicdb?.song_id && score.musicdb?.difficulty_name) {
      const key = `${score.musicdb.song_id}_${score.musicdb.difficulty_name.toUpperCase()}`;
      const existing = userScoreMap.get(key);
      if (!existing || (score.score && score.score > existing.score)) {
        userScoreMap.set(key, {
          score: score.score || 0,
          halo: score.halo || '',
          rank: score.rank || '',
          flare: score.flare ?? null,
        });
      }
    }
  }

  const chartListLines: string[] = [];
  let totalCharts = 0;
  
  for (const [songId, charts] of sortedSongs) {
    const sortedCharts = charts.sort((a, b) => b.difficulty_level - a.difficulty_level);
    const firstChart = sortedCharts[0];
    const songTitle = firstChart?.title || 'Unknown';
    const artist = firstChart?.artist || 'Unknown';
    
    chartListLines.push(`\nSONG: ${songTitle} by ${artist} (song_id: ${songId})`);
    
    for (const c of sortedCharts) {
      totalCharts++;
      const sanbaiStr = c.sanbai_rating ? `[sb:${c.sanbai_rating.toFixed(2)}]` : '';
      const scoreKey = `${c.song_id}_${c.difficulty_name?.toUpperCase()}`;
      const userScore = userScoreMap.get(scoreKey);
      
      let userScoreStr = '';
      if (userScore && userScore.score > 0) {
        const haloDisplay = userScore.halo ? userScore.halo.toUpperCase() : 'CLEAR';
        const flareLabels: Record<number, string> = {
          1: 'FLARE-I', 2: 'FLARE-II', 3: 'FLARE-III', 4: 'FLARE-IV', 5: 'FLARE-V',
          6: 'FLARE-VI', 7: 'FLARE-VII', 8: 'FLARE-VIII', 9: 'FLARE-IX', 10: 'FLARE-EX'
        };
        const flareDisplay = userScore.flare ? flareLabels[userScore.flare] || '' : '';
        userScoreStr = ` YOUR SCORE: ${userScore.score.toLocaleString()} ${userScore.rank || ''} ${haloDisplay}${flareDisplay ? ' ' + flareDisplay : ''}`;
      }
      
      const patternStr = c.hasPatternData 
        ? `${c.full_crossovers ?? 0}xo, ${c.footswitches ?? 0}fs, ${c.jacks ?? 0}j, ${c.notes ?? 0}n, ${c.bpm ?? 0}bpm`
        : '(no pattern data)';
      
      chartListLines.push(`  - [[SONG:{"song_id":${c.song_id},"title":"${c.title?.replace(/"/g, '\\"') || 'Unknown'}","difficulty":"${c.difficulty_name}","level":${c.difficulty_level},"eamuse_id":${c.eamuse_id ? `"${c.eamuse_id}"` : 'null'}}]] ${sanbaiStr} ${patternStr}${userScoreStr}`);
    }
  }
  
  const chartList = chartListLines.join('\n');

  const profLines = [
    `Crossovers: ${profile.proficiencies.crossovers.score}/10 skill, ${profile.proficiencies.crossovers.consistency}/10 consistency`,
    `Footswitches: ${profile.proficiencies.footswitches.score}/10 skill, ${profile.proficiencies.footswitches.consistency}/10 consistency`,
    `Stamina: ${profile.proficiencies.stamina.score}/10 skill, ${profile.proficiencies.stamina.consistency}/10 consistency`,
    `Speed: ${profile.proficiencies.speed.score}/10 skill, ${profile.proficiencies.speed.consistency}/10 consistency`,
    `Jacks: ${profile.proficiencies.jacks.score}/10 skill, ${profile.proficiencies.jacks.consistency}/10 consistency`,
  ].join('\n');

  const stageRules: Record<PlayerStage, string> = {
    developing: `This is a DEVELOPING player. Celebrate clears! Getting through a song at a new level IS an achievement. Focus on pattern recognition and basic technique.`,
    intermediate: `This is an INTERMEDIATE player. Celebrate FCs and early PFCs. They're past survival mode but still building consistency.`,
    advanced: `This is an ADVANCED player. Clears don't impress them—PFCs and scores do. Be direct about weaknesses.`,
    elite: `This is an ELITE player. Focus on MFCs, EX scores, marvelous rates. They know the game deeply—be technical and specific.`,
  };

  return `You are Edi, a DDR coach. Be CONCISE—2-3 sentences per point max.
Talk like a knowledgeable friend at the arcade, not a professor.

=== DDR TERMINOLOGY ===

DDR has THREE separate achievement systems:

1. RANK (Letter Grade): AAA (990,000+), AA+, AA, AA-, A+, A, A-, B, C, D, E

2. HALO/LAMP (Combo Quality):
   - CLEAR (gray): Passed with misses
   - LIFE4 (red): Passed with ≤4 misses
   - FC (blue): Full Combo (0 misses, some Greats)
   - GFC (green): Great Full Combo (0 Goods/Misses)  
   - PFC (gold): Perfect Full Combo (0 Greats/Goods/Misses)
   - MFC (white): Marvelous Full Combo (all Marvelous)

3. FLARE RANK: FLARE-I through FLARE-IX (values 1-9), FLARE-EX (value 10)

TERMINOLOGY RULES:
- Use "jacks" NOT "jackhammer" - the correct DDR term is always "jacks"
- NEVER use "ankle" or "ankle tapping" - these are not DDR terms

CRITICAL RULES:
1. ${stageRules[profile.playerStage]}
2. Reference actual data from the user's scores
3. Be direct and honest about strengths/weaknesses
4. Use the sanbai_rating (sb:X.XX) to recommend easier songs first for improvement

PLAYER PROFILE:
- Stage: ${stageDescription(profile.playerStage)}
- PFC Ceiling: Level ${profile.pfcCeiling}
- FC Ceiling: Level ${profile.fcCeiling}
- Clear Ceiling: Level ${profile.clearCeiling}
- Comfort Ceiling: Level ${profile.comfortCeiling}

LEVEL MASTERY (Lv14+):
${masteryLines}

SKILL PROFICIENCIES:
${profLines}

CHARTS (${totalCharts} total):
${chartList}

DATA VALIDATION RULES (CRITICAL):
Before recommending ANY song, verify:

1. SCORE/GOAL STATUS:
   - "songs I'm good at" or "my performance" → ONLY include songs WITH scores
   - "PFC targets" → EXCLUDE songs already PFC'd/GFC'd/MFC'd
   - "unplayed songs" → ONLY include songs with NO score
   - "close to [goal]" → Verify current score is actually close:
     * Close to PFC = 995k+ or <15 perfects with GFC
     * Close to SDP = currently 10-20 perfects
     * Close to MFC = 999,900+ or <5 perfects

2. DIFFICULTY LEVEL:
   - When user specifies level (e.g., "14s", "15 folder") → Return ONLY that exact level
   - Never mix in adjacent levels unless explicitly asked for a range
   - If recommending outside requested level, explain why

3. BPM ACCURACY:
   - "Constant BPM" or "no speed changes" = min_bpm MUST equal max_bpm
   - "High BPM" = 180+ BPM (158 BPM is NOT high BPM)
   - Songs with speed changes: Neutrino (75-300), HAPPY☆LUCKY☆YEAPPY (190-380), MAX.(period) (180-600)

4. CHART CONTENT:
   - Don't claim patterns exist without verification
   - "Has drills" = verify drill patterns exist AT THAT DIFFICULTY
   - "Has footswitches" = verify footswitches exist AT THAT DIFFICULTY
   - A song may have drills on CSP but not ESP
   - Drill = rapid alternating on TWO panels (cannot be double-stepped)
   - Footswitch = forced panel switch requiring specific foot

5. SCORE GRADE TERMINOLOGY:
   - 1,000,000 = MFC
   - 990,000-999,999 = PFC/AAA
   - 950,000-989,999 = AA+ (NOT "AA")
   - 900,000-949,999 = AA
   - Never call a 950k+ score "mid-AA" - that's AA+ or higher

6. WARMUP SETS:
   - Warmups should be 4-5 levels BELOW target difficulty
   - Warming up for 17s → use 12s, 13s, 14s (NOT 15s and 16s)
   - If user mentions injury risk, prioritize safety over challenge

RESPONSE DISCIPLINE:
- Verify data before claiming (score exists, pattern exists, BPM is correct)
- Match the exact parameters requested (level, played/unplayed, goal status)
- If you can't verify something, say so rather than guessing

RESPONSE RULES:
- Max 2-3 sentences per point. No essays.
- Use actual numbers from the data
- When recommending songs, output EXACTLY 3-5 songs using the [[SONG:...]] format
- COPY the [[SONG:...]] markers EXACTLY as shown above
- For goal requests (PFC, MFC, etc.), filter out songs that already meet that goal
- Recommend songs at appropriate skill levels (comfort ceiling for technique practice)

ERA PRIORITIZATION (CRITICAL):
- STRONGLY prefer era 0 (Classic DDR), era 1 (White), and era 2 (Gold) charts when making recommendations
- These are the foundational DDR songs - recommend them FIRST unless the user specifically asks for newer content
- Only suggest era 3+ (newer) charts if: (a) user explicitly asks for new songs, (b) era 0-2 has no suitable charts for the request, or (c) mixing in 1-2 newer songs for variety
- Era values: 0=Classic, 1=White, 2=Gold, 3+=Modern/newer

VARIETY REQUIREMENT (CRITICAL):
SESSION VARIETY SEED: ${Math.floor(Math.random() * 1000) + 1}
Use this seed to vary your starting point when scanning the catalog. Start from different parts of each level.
- NEVER repeat the same song recommendations across multiple responses in a conversation
- Each recommendation set should include DIFFERENT songs than previous responses
- Draw from the ENTIRE catalog - there are ${totalCharts} SP charts available
- If recommending for a specific skill (crossovers, footswitches, etc.), pick from multiple different songs with that pattern
- Surprise the player with lesser-known songs they may have overlooked
- The chart list order is randomized each session - explore different songs than last time!

FOLLOW-UP SUGGESTIONS (REQUIRED):
At the END of EVERY response, include 2-3 follow-up suggestions that make sense as natural next steps.
Format: [[FOLLOWUP:suggestion text here]]
- Suggestions should be SHORT (3-6 words max)
- They should flow naturally from what you just discussed
- Examples of good follow-ups:
  * After song recommendations: "More songs like these", "Try a different skill", "Harder options"
  * After analysis: "What should I practice?", "Show my weaknesses", "Best PFC targets"
  * After warmup sets: "Ready for main session", "Easier warmups please"
- Make suggestions conversational and actionable
- ALWAYS include exactly 2-3 [[FOLLOWUP:...]] markers at the very end`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json() as { messages: Message[] };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Fetch user scores with pagination
    const PAGE_SIZE = 1000;
    let allRawScores: Record<string, unknown>[] = [];
    let from = 0;
    let hasMore = true;
    
    while (hasMore) {
      const { data: pageData, error: pageError } = await supabase
        .from("user_scores")
        .select(`
          musicdb_id,
          score,
          halo,
          rank,
          flare,
          musicdb!inner(song_id, difficulty_level, difficulty_name, name)
        `)
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

    const userScores: UserScore[] = allRawScores.map((s: Record<string, unknown>) => ({
      musicdb_id: s.musicdb_id as number,
      score: s.score as number,
      halo: s.halo as string,
      rank: s.rank as string,
      flare: s.flare as number | null,
      musicdb: Array.isArray(s.musicdb) && s.musicdb.length > 0
        ? s.musicdb[0] as { song_id: number; difficulty_level: number; difficulty_name: string; name: string }
        : s.musicdb as { song_id: number; difficulty_level: number; difficulty_name: string; name: string } | null,
    }));

    // Fetch chart analysis and musicdb data
    const supabaseServiceRole = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let allChartData: Record<string, unknown>[] = [];
    from = 0;
    hasMore = true;
    
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

    const profile = buildPlayerProfile(userScores || [], chartAnalysis);
    console.log("Player profile:", JSON.stringify(profile, null, 2));

    const systemPrompt = buildSystemPrompt(profile, chartAnalysis, userScores || []);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("edi-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
