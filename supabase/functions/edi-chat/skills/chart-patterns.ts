 // Skill: Chart Patterns
 // Pattern-specific knowledge (crossovers, footswitches, jacks, drills, stamina)
 // Loaded when user asks about specific technical patterns
 
 export function shouldActivate(message: string): boolean {
   const lower = message.toLowerCase();
  return /crossover|footswitch|jack|drill|stamina|pattern|technical|stream|speed|bpm|fast|slow|notes|nps|hard part/i.test(lower);
 }
 
 export function buildPrompt(): string {
   return `
 ══════════════════════════════════════════════════════════════════════════════
 CHART PATTERN KNOWLEDGE
 ══════════════════════════════════════════════════════════════════════════════
 
 ★ USE THIS SECTION FOR: Crossovers, footswitches, jacks, drills, stamina questions
 
 PATTERN DEFINITIONS:
 - Crossovers (xo): Steps requiring one foot to cross in front of or behind the other
 - Full Crossovers: Complete crossover patterns (more demanding)
 - Footswitches (fs): Forced panel switches requiring specific foot placement
 - Jacks (j): Repeated hits on the same panel in quick succession
 - Drills: Rapid alternating on TWO panels (cannot be double-stepped)
 - Stream: Continuous flow of notes
 - Notes (n): Total step count (indicates stamina requirement)
 - Peak NPS: Peak notes per second (burst difficulty)
 
 PATTERN DATA FORMAT IN CATALOG:
 Each chart shows: {full_crossovers}xo, {footswitches}fs, {jacks}j, {notes}n, {bpm}bpm
 Example: "15xo, 8fs, 12j, 380n, 170bpm"
 
 ⚠️ RULES FOR PATTERN QUERIES:
 1. Only claim a chart "has crossovers" if crossovers > 0 in the data
 2. Only claim "has footswitches" if footswitches > 0
 3. Charts marked "(no pattern data)" — don't make claims about their patterns
 4. Pattern data only exists for difficulty 12+
 
 BPM THRESHOLDS:
 - "High BPM" = 180+ BPM
 - "Mid BPM" = 140-179 BPM  
 - "Low BPM" = under 140 BPM
 - 158 BPM is NOT "high BPM"
 
 SPEED CHANGES:
 - "Constant BPM" or "no speed changes" = the chart must have single BPM value
 - Songs with speed changes include variable BPM ranges in their data
 - Example speed change songs: Neutrino (75-300), MAX.(period) (180-600)
 
 DRILL vs JACK:
 - Drill = rapid alternating between TWO different panels (L-R-L-R or D-U-D-U)
 - Jack = repeated hits on the SAME panel
 - A chart can have both drills AND jacks
 `;
 }