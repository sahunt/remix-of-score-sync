 // Skill: Player Profile
 // Information about the current player's skill level, strengths, weaknesses
 // ALWAYS loaded for every query (except pure general knowledge questions)
 
 import { PlayerProfile, MasteryTier } from "../utils/types.ts";
 import { masteryTierLabel, stageDescription, getStageRules } from "../utils/calculate-profile.ts";
 
 export function shouldActivate(_message: string): boolean {
   // Almost always active - EDI needs to know who she's coaching
   return true;
 }
 
 export function buildPrompt(profile: PlayerProfile): string {
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
 PLAYER PROFILE (WHO YOU'RE COACHING)
 ══════════════════════════════════════════════════════════════════════════════
 
 ★ USE THIS SECTION FOR: Understanding this player's skill level, adapting your coaching style
 
 COACHING APPROACH:
 ${getStageRules(profile.playerStage)}
 
 PLAYER STAGE: ${stageDescription(profile.playerStage)}
 
 CEILINGS:
 - PFC Ceiling: Level ${profile.pfcCeiling} (highest level with 3+ PFCs)
 - FC Ceiling: Level ${profile.fcCeiling} (highest level with 3+ FCs)
 - Clear Ceiling: Level ${profile.clearCeiling} (highest level with 30%+ clear rate)
 - Comfort Ceiling: Level ${profile.comfortCeiling} (highest level where player is SOLID or CRUSHING)
 
 SKILL PROFICIENCIES:
 ${profLines}
 
 LEVEL MASTERY (Lv14+ breakdown):
 ${masteryLines}
 
 ⚠️ NOTE: Level Mastery only tracks Lv12+ scores. For TOTAL counts across ALL levels, see the COUNTING STATS section.
 `;
 }