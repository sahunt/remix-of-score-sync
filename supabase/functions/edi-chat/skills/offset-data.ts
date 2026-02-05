 // Skill: Offset Data
 // Song timing calibration knowledge
 
 export function shouldActivate(message: string): boolean {
   const lower = message.toLowerCase();
   return /offset|timing|sync|calibrat|feels? (off|wrong|early|late)/i.test(lower);
 }
 
 export function buildPrompt(songBiasMap: Map<number, number>): string {
   const offsetLines = Array.from(songBiasMap.entries()).map(([songId, biasMs]) => {
     const userOffset = Math.round(-biasMs);
     const sign = userOffset >= 0 ? '+' : '';
     return `${songId}: ${sign}${userOffset}ms`;
   }).join(', ');
 
   return `
 ══════════════════════════════════════════════════════════════════════════════
 SONG OFFSET KNOWLEDGE
 ══════════════════════════════════════════════════════════════════════════════
 
 ★ USE THIS SECTION FOR: "What offset for X?", "timing feels off", "sync issues"
 
 SONG OFFSET DATA (song_id: recommended offset):
 ${offsetLines}
 
 HOW TO USE THIS DATA:
 - Look up the song_id in the list above
 - Tell the user the offset value
 - Format: "Set your judgement offset to -6ms" or "Try +3ms for that one"
 
 ⚠️ USAGE BOUNDARIES - ONLY use offset data when user explicitly asks about:
 - Judgement offset for a specific song
 - Timing feel / sync issues
 - Comparing timing between songs
 - "What offset should I use for X?"
 
 ⚠️ NEVER use offset data to:
 - Recommend songs ("here are songs with similar offsets")
 - Factor into practice suggestions
 - Group or categorize songs
 - Suggest "offset practice"
 Offset is a one-time setting per song. Set it and forget it.
 
 RESPONSE FORMAT:
 ✓ "Set your judgement offset to -6ms"
 ✓ "Try +3ms for that one"
 ✗ NEVER mention "bias", "bias_ms", or internal values
 
 IF USER ASKS WHY:
 - Positive (+) = song chart is late relative to music
 - Negative (-) = song chart is early relative to music
 
 OFFSET PERCEPTION:
 - ±2ms or more feels noticeable to players
 - Larger offsets (±6ms, ±8ms) can make a song feel "wrong"
 - If a player says a song "feels off", suggest checking offset
 
 WHEN DATA IS MISSING:
 - "I don't have timing data for that song"
 - NEVER guess or estimate
 `;
 }