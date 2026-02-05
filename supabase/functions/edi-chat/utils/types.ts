 // Shared types for EDI
 
 export interface Message {
   role: "user" | "assistant" | "system";
   content: string;
 }
 
 export type PlayerStage = 'developing' | 'intermediate' | 'advanced' | 'elite';
 export type MasteryTier = 'crushing' | 'solid' | 'pushing' | 'survival' | 'untouched';
 
 export interface LevelMastery {
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
 
 export interface PlayerProfile {
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
 
 export interface ChartAnalysis {
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
 
 export interface SongBias {
   song_id: number;
   bias_ms: number;
   eamuse_id: string | null;
 }
 
 export interface UserScore {
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
 
 export interface TotalStats {
   totalPlayed: number;
   totalMfcs: number;
   totalPfcs: number;
   totalGfcs: number;
   totalFcs: number;
   totalLife4s: number;
   totalClears: number;
   totalAAAs: number;
 }
 
 // Catalog counts by level
 export interface CatalogCounts {
   byLevel: Map<number, number>;
   total: number;
 }