 // Calculate player profile from scores and chart data
 
 import { 
   UserScore, 
   ChartAnalysis, 
   PlayerProfile, 
   PlayerStage, 
   MasteryTier,
   LevelMastery 
 } from "./types.ts";
 
 // Fisher-Yates shuffle for randomizing chart order
 export function shuffleArray<T>(array: T[]): T[] {
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
 
 export function calculateLevelMastery(userScores: UserScore[]): LevelMastery[] {
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
 
 export function buildPlayerProfile(userScores: UserScore[], chartAnalysis: ChartAnalysis[]): PlayerProfile {
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
 
 // Helper functions for formatting
 export function masteryTierLabel(tier: MasteryTier): string {
   const labels: Record<MasteryTier, string> = {
     crushing: 'CRUSHING',
     solid: 'SOLID',
     pushing: 'PUSHING',
     survival: 'SURVIVAL',
     untouched: 'BARELY TOUCHED',
   };
   return labels[tier];
 }
 
 export function stageDescription(stage: PlayerStage): string {
   const descriptions: Record<PlayerStage, string> = {
     developing: 'DEVELOPING (primary metric: clears and FCs)',
     intermediate: 'INTERMEDIATE (primary metric: FCs and early PFCs)',
     advanced: 'ADVANCED (primary metric: PFCs and AAA rate)',
     elite: 'ELITE (primary metric: MFCs and score optimization)',
   };
   return descriptions[stage];
 }
 
 export function getStageRules(stage: PlayerStage): string {
   const stageRules: Record<PlayerStage, string> = {
     developing: `This is a DEVELOPING player. Celebrate clears! Getting through a song at a new level IS an achievement. Focus on pattern recognition and basic technique.`,
     intermediate: `This is an INTERMEDIATE player. Celebrate FCs and early PFCs. They're past survival mode but still building consistency.`,
     advanced: `This is an ADVANCED player. Clears don't impress them—PFCs and scores do. Be direct about weaknesses.`,
     elite: `This is an ELITE player. Focus on MFCs, EX scores, marvelous rates. They know the game deeply—be technical and specific.`,
   };
   return stageRules[stage];
 }