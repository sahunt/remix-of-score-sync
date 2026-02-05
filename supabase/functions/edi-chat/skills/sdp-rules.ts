 // Skill: SDP Rules
 // Single Digit Perfects targeting logic
 // This is the FIX for the SDP bug - enforces PFC prerequisite
 
 export function shouldActivate(message: string): boolean {
   const lower = message.toLowerCase();
   return /sdp|single digit|close to mfc|near mfc/i.test(lower);
 }
 
 export function buildPrompt(): string {
   return `
 ══════════════════════════════════════════════════════════════════════════════
 SDP (SINGLE DIGIT PERFECTS) RULES
 ══════════════════════════════════════════════════════════════════════════════
 
 ★ USE THIS SECTION FOR: "SDP targets", "single digit perfects", "close to MFC"
 
 ⚠️ CRITICAL: SDP IS A TYPE OF PFC — YOU CANNOT HAVE SDP WITHOUT PFC FIRST!
 
 BEFORE RECOMMENDING ANY SDP TARGET, RUN THIS CHECKLIST:
 
 □ Step 1: Does the song have a PFC?
   - Check: halo = 'pfc' OR halo = 'mfc'
   - If NO (halo is 'gfc', 'fc', 'life4', 'clear', or empty) → STOP
     → This is NOT an SDP target
     → Tell the user: "You need a PFC first before working toward SDP"
   - If YES → Continue to Step 2
 
 □ Step 2: What is the current score?
   - 1,000,000 = Already MFC → NOT a target (already achieved!)
   - 999,910+ = Already SDP → NOT a target (already achieved!)  
   - 999,800-999,900 = GOOD SDP TARGET ✓ (10-20 perfects to improve)
   - Below 999,800 with PFC = Far from SDP, possible long-term target
 
 SCORE THRESHOLDS (PFC required for all):
 * 1,000,000 = MFC (0 perfects)
 * 999,910-999,990 = SDP (1-9 perfects)  
 * 999,800-999,900 = CLOSE to SDP (10-20 perfects) ← Best SDP targets
 * 999,700 or below with PFC = far from SDP
 
 WHEN USER ASKS FOR "SDP TARGETS":
 1. Filter to songs where halo = 'pfc' (NOT gfc, fc, or lower)
 2. Filter to score 999,800-999,900
 3. These are the realistic SDP targets
 
 WRONG RESPONSES:
 ❌ Recommending a GFC as an SDP target (no PFC yet!)
 ❌ Recommending a song with no score data as an SDP target
 ❌ Recommending a song that's already MFC as an SDP target
 
 RIGHT RESPONSES:
 ✓ "Here are songs where you have a PFC with scores in the 999,800-999,900 range"
 ✓ "You need a PFC on that song first before working toward SDP"
 ✓ "That song is already MFC - you've achieved SDP and beyond!"
 `;
 }