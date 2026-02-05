 // Fetch music database (song catalog) from Supabase
 
 import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
 import { ChartAnalysis } from "../utils/types.ts";
 
 const PAGE_SIZE = 1000;
 
 export async function fetchMusicDb(
   supabaseServiceRole: SupabaseClient
 ): Promise<ChartAnalysis[]> {
   // First fetch chart_analysis data
   let allChartData: Record<string, unknown>[] = [];
   let from = 0;
   let hasMore = true;
   
   while (hasMore) {
     const { data: chartPage, error: chartPageError } = await supabaseServiceRole
       .from("chart_analysis")
       .select("*")
       .order("difficulty_level", { ascending: true })
       .range(from, from + PAGE_SIZE - 1);
     
     if (chartPageError) {
       console.error("Error fetching chart analysis:", chartPageError);
       throw new Error("Failed to fetch chart analysis");
     }
     
     if (chartPage && chartPage.length > 0) {
       allChartData = [...allChartData, ...chartPage as Record<string, unknown>[]];
       from += PAGE_SIZE;
       hasMore = chartPage.length === PAGE_SIZE;
     } else {
       hasMore = false;
     }
   }
   
   console.log(`Fetched ${allChartData.length} total chart analysis records`);
 
   // Then fetch musicdb data
   let allMusicDbData: Record<string, unknown>[] = [];
   from = 0;
   hasMore = true;
   
   while (hasMore) {
     const { data: musicDbPage, error: musicDbError } = await supabaseServiceRole
       .from("musicdb")
       .select("id, song_id, name, artist, difficulty_name, difficulty_level, sanbai_rating, era, eamuse_id, playstyle, deleted")
       .eq("playstyle", "SP")
       .eq("deleted", false)
       .order("id", { ascending: true })
       .range(from, from + PAGE_SIZE - 1);
     
     if (musicDbError) {
       console.error("Error fetching musicdb:", musicDbError);
       throw new Error("Failed to fetch musicdb catalog");
     }
     
     if (musicDbPage && musicDbPage.length > 0) {
       allMusicDbData = [...allMusicDbData, ...musicDbPage as Record<string, unknown>[]];
       from += PAGE_SIZE;
       hasMore = musicDbPage.length === PAGE_SIZE;
     } else {
       hasMore = false;
     }
   }
   
   console.log(`Fetched ${allMusicDbData.length} total musicdb records`);
 
   // Build lookup map for chart_analysis
   const chartAnalysisMap = new Map<string, Record<string, unknown>>();
   for (const c of allChartData) {
     if (c.difficulty_name) {
       const key = `${c.song_id}_${(c.difficulty_name as string).toUpperCase()}`;
       chartAnalysisMap.set(key, c);
     }
   }
 
   // Merge musicdb with chart_analysis
   const chartAnalysis: ChartAnalysis[] = allMusicDbData
     .filter(row => row.difficulty_level != null && row.difficulty_name != null)
     .map((row: Record<string, unknown>) => {
       const lookupKey = `${row.song_id}_${(row.difficulty_name as string).toUpperCase()}`;
       const patternData = chartAnalysisMap.get(lookupKey);
       const hasPatternData = !!patternData;
       
       return {
         song_id: row.song_id as number,
         title: (row.name as string) || 'Unknown',
         artist: (row.artist as string) || 'Unknown',
         difficulty_name: row.difficulty_name as string,
         difficulty_level: row.difficulty_level as number,
         bpm: patternData ? (patternData.bpm as number) : null,
         crossovers: patternData ? (patternData.crossovers as number) : null,
         full_crossovers: patternData ? (patternData.full_crossovers as number) : null,
         footswitches: patternData ? (patternData.footswitches as number) : null,
         jacks: patternData ? (patternData.jacks as number) : null,
         notes: patternData ? (patternData.notes as number) : null,
         mines: patternData ? (patternData.mines as number) : null,
         stream: patternData ? (patternData.stream as number) : null,
         peak_nps: patternData ? (patternData.peak_nps as number) : null,
         eamuse_id: row.eamuse_id as string | null,
         era: row.era as number | null,
         sanbai_rating: row.sanbai_rating as number | null,
         hasPatternData,
       };
     });
   
   console.log(`Built complete chart catalog with ${chartAnalysis.length} charts`);
 
   return chartAnalysis;
 }