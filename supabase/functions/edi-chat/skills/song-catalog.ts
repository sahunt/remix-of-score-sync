 // Skill: Song Catalog
 // The full song catalog with user scores
 // This is the HEAVY skill - only load when needed for recommendations
 
 import { ChartAnalysis, UserScore, CatalogCounts } from "../utils/types.ts";
 import { shuffleArray } from "../utils/calculate-profile.ts";
 import { formatCatalogCounts } from "../utils/calculate-stats.ts";
 
 export function shouldActivate(message: string): boolean {
   const lower = message.toLowerCase();
   // Trigger on song recommendations, targets, practice requests
   return /recommend|suggest|practice|play|target|pfc|fc|mfc|gfc|songs?|chart|what.*should|give me|list|folder|\d+s\b/i.test(lower);
 }
 
 export function buildPrompt(
   chartAnalysis: ChartAnalysis[],
   userScores: UserScore[],
   catalogCounts: CatalogCounts
 ): string {
   // Build user score lookup map
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
 
   // Group songs and shuffle for variety
   const songMap = new Map<number, ChartAnalysis[]>();
   for (const chart of chartAnalysis) {
     const existing = songMap.get(chart.song_id) || [];
     existing.push(chart);
     songMap.set(chart.song_id, existing);
   }
 
   // Group songs by max difficulty level, then shuffle within each group
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
 
   // Build chart list
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
   const varietySeed = Math.floor(Math.random() * 1000) + 1;
 
   return `
 ══════════════════════════════════════════════════════════════════════════════
 SONG CATALOG (${totalCharts} SP charts)
 ══════════════════════════════════════════════════════════════════════════════
 
 ★ USE THIS SECTION FOR: Song recommendations, practice suggestions, targets
 
 CATALOG COUNTS BY LEVEL:
 ${formatCatalogCounts(catalogCounts)}
 
 Total: ${catalogCounts.total} charts
 
 ⚠️ RULES: When user asks "how many 14s are there?" → READ the count above. NEVER estimate.
 
 BEFORE RECOMMENDING ANY SONG, RUN THIS CHECKLIST:
 
 □ Step 1: VERIFY EXISTENCE
   - Is this song in the catalog below?
   - If not, DO NOT recommend it
 
 □ Step 2: VERIFY LEVEL MATCH
   - Does the chart match the user's requested level?
   - If user said "14s" → ONLY recommend level 14 charts
 
 □ Step 3: VERIFY GOAL STATUS
   | User wants...    | Song must have...                              |
   |------------------|------------------------------------------------|
   | PFC targets      | NO existing PFC (halo ≠ pfc/mfc)               |
   | FC targets       | NO existing FC (halo ≠ fc/gfc/pfc/mfc)         |
   | SDP targets      | HAS PFC + score 999,800-999,900                |
   | MFC targets      | HAS PFC + score 999,900+                       |
   | Unplayed songs   | NO score data at all                           |
   | "Close to X"     | Check actual score is close (not just exists)  |
 
 □ Step 4: VERIFY DATA BEFORE CLAIMING
   - "Has crossovers" → Check crossovers > 0 in pattern data
   - "Has footswitches" → Check footswitches > 0
   - "High BPM" → BPM must be 180+
   - If you can't verify, say "I don't have pattern data for this"
 
 ERA PRIORITIZATION:
 - STRONGLY prefer era 0 (Classic), era 1 (White), era 2 (Gold) charts
 - Only suggest era 3+ if user asks for newer content or no era 0-2 charts fit
 
 VARIETY REQUIREMENT:
 SESSION VARIETY SEED: ${varietySeed}
 - NEVER repeat the same songs across multiple responses in a conversation
 - Start from different parts of the catalog each time
 - The chart list is shuffled — explore different songs!
 
 CHARTS:
 ${chartList}
 `;
 }