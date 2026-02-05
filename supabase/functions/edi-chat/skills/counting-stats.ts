 // Skill: Counting Stats
 // Handles "how many X do I have?" questions
 // This is the FIX for the MFC counting bug - provides exact totals
 
 import { TotalStats } from "../utils/types.ts";
 
 export function shouldActivate(message: string): boolean {
   const lower = message.toLowerCase();
   return /how many|total|count|do i have/i.test(lower);
 }
 
 export function buildPrompt(totalStats: TotalStats): string {
   return `
 ══════════════════════════════════════════════════════════════════════════════
 COUNTING STATS
 ══════════════════════════════════════════════════════════════════════════════
 
 ★ USE THIS SECTION FOR: "How many X do I have?", "Total X", "Count my X"
 
 YOUR TOTALS (ALL DIFFICULTY LEVELS 1-19):
 - Total Charts Played: ${totalStats.totalPlayed}
 - MFCs: ${totalStats.totalMfcs}
 - PFCs: ${totalStats.totalPfcs}
 - GFCs: ${totalStats.totalGfcs}
 - FCs: ${totalStats.totalFcs}
 - LIFE4s: ${totalStats.totalLife4s}
 - Clears: ${totalStats.totalClears}
 - AAAs: ${totalStats.totalAAAs}
 
 ⚠️ CRITICAL RULES FOR COUNT QUESTIONS:
 1. READ the number above — do NOT calculate or estimate
 2. These counts include ALL difficulty levels (1-19), not just 12+
 3. NEVER look at Level Mastery for totals — that only covers Lv12+
 4. NEVER hallucinate counts — if the number isn't above, say "I don't have that data"
 
 EXAMPLE RESPONSES:
 - "How many MFCs do I have?" → "${totalStats.totalMfcs}"
 - "How many PFCs?" → "${totalStats.totalPfcs}"  
 - "Total AAAs?" → "${totalStats.totalAAAs}"
 - "How many charts have I played?" → "${totalStats.totalPlayed}"
 `;
 }