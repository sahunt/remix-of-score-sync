 // Fetch user scores from Supabase
 
 import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
 import { UserScore } from "../utils/types.ts";
 
 const PAGE_SIZE = 1000;
 
 export async function fetchUserScores(
   supabase: SupabaseClient,
   userId: string
 ): Promise<UserScore[]> {
   let allRawScores: Record<string, unknown>[] = [];
   let from = 0;
   let hasMore = true;
   
   while (hasMore) {
     const { data: pageData, error: pageError } = await supabase
       .from("user_scores")
       .select(`
         musicdb_id,
         score,
         halo,
         rank,
         flare,
         musicdb!inner(song_id, difficulty_level, difficulty_name, name)
       `)
       .eq("user_id", userId)
       .range(from, from + PAGE_SIZE - 1);
     
     if (pageError) {
       console.error("Error fetching user scores:", pageError);
       throw new Error("Failed to fetch user scores");
     }
     
     if (pageData && pageData.length > 0) {
       allRawScores = [...allRawScores, ...pageData as Record<string, unknown>[]];
       from += PAGE_SIZE;
       hasMore = pageData.length === PAGE_SIZE;
     } else {
       hasMore = false;
     }
   }
   
   console.log(`Fetched ${allRawScores.length} total user scores`);
 
   const userScores: UserScore[] = allRawScores.map((s: Record<string, unknown>) => ({
     musicdb_id: s.musicdb_id as number,
     score: s.score as number,
     halo: s.halo as string,
     rank: s.rank as string,
     flare: s.flare as number | null,
     musicdb: Array.isArray(s.musicdb) && s.musicdb.length > 0
       ? s.musicdb[0] as { song_id: number; difficulty_level: number; difficulty_name: string; name: string }
       : s.musicdb as { song_id: number; difficulty_level: number; difficulty_name: string; name: string } | null,
   }));
 
   return userScores;
 }