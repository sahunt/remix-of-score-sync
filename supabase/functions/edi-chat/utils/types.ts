 // Shared types for EDI

 // Tool call structure (from assistant response)
 export interface ToolCall {
   id: string;
   type: "function";
   function: {
     name: string;
     arguments: string;
   };
 }

 // Message types for the conversation
 export interface BaseMessage {
   role: "user" | "assistant" | "system" | "tool";
   content: string | null;
 }

 export interface UserMessage extends BaseMessage {
   role: "user";
   content: string;
 }

 export interface SystemMessage extends BaseMessage {
   role: "system";
   content: string;
 }

 export interface AssistantMessage extends BaseMessage {
   role: "assistant";
   content: string | null;
   tool_calls?: ToolCall[];
 }

 export interface ToolMessage extends BaseMessage {
   role: "tool";
   content: string;
   tool_call_id: string;
 }

 export type Message = UserMessage | SystemMessage | AssistantMessage | ToolMessage;

 // API response types
 export interface ChatCompletionChoice {
   index: number;
   message: {
     role: "assistant";
     content: string | null;
     tool_calls?: ToolCall[];
   };
   finish_reason: string;
 }

 export interface ChatCompletionResponse {
   id: string;
   object: string;
   created: number;
   model: string;
   choices: ChatCompletionChoice[];
   usage?: {
     prompt_tokens: number;
     completion_tokens: number;
     total_tokens: number;
   };
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