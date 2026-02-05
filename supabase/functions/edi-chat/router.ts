 // Router: Decides which skills to activate based on user message
 
 import * as whoIAm from "./skills/who-i-am.ts";
 import * as playerProfile from "./skills/player-profile.ts";
 import * as countingStats from "./skills/counting-stats.ts";
 import * as songCatalog from "./skills/song-catalog.ts";
 import * as chartPatterns from "./skills/chart-patterns.ts";
 import * as sdpRules from "./skills/sdp-rules.ts";
 import * as warmupRules from "./skills/warmup-rules.ts";
 import * as offsetData from "./skills/offset-data.ts";
 
 export interface ActiveSkills {
   whoIAm: boolean;
   playerProfile: boolean;
   countingStats: boolean;
   songCatalog: boolean;
   chartPatterns: boolean;
   sdpRules: boolean;
   warmupRules: boolean;
   offsetData: boolean;
 }
 
 export function determineActiveSkills(message: string): ActiveSkills {
   return {
     // Always active
     whoIAm: whoIAm.shouldActivate(message),
     playerProfile: playerProfile.shouldActivate(message),
     
     // Conditionally active
     countingStats: countingStats.shouldActivate(message),
     songCatalog: songCatalog.shouldActivate(message),
     chartPatterns: chartPatterns.shouldActivate(message),
     sdpRules: sdpRules.shouldActivate(message),
     warmupRules: warmupRules.shouldActivate(message),
     offsetData: offsetData.shouldActivate(message),
   };
 }
 
 export function logActiveSkills(skills: ActiveSkills): void {
   const active = Object.entries(skills)
     .filter(([_, isActive]) => isActive)
     .map(([name, _]) => name);
   
   console.log(`Active skills for this query: ${active.join(', ')}`);
 }