 // Fetch song bias (offset timing) data from Supabase
 
 import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 export async function fetchSongBias(
   supabaseServiceRole: SupabaseClient
 ): Promise<Map<number, number>> {
   const { data: songBiasData, error: songBiasError } = await supabaseServiceRole
     .from("song_bias")
     .select("song_id, bias_ms, eamuse_id");
   
   if (songBiasError) {
     console.error("Error fetching song_bias:", songBiasError);
     return new Map();
   }
   
   const songBiasMap = new Map<number, number>();
   if (songBiasData) {
     for (const bias of songBiasData) {
       songBiasMap.set(bias.song_id as number, bias.bias_ms as number);
     }
   }
   
   console.log(`Loaded ${songBiasMap.size} song bias entries`);
   return songBiasMap;
 }