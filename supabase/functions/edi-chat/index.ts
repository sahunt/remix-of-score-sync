 // EDI Chat - Main Entry Point
 // This file routes queries to the appropriate skills and assembles the prompt
 
 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 // Types
 import { Message } from "./utils/types.ts";
 
 // Data fetchers
 import { fetchUserScores } from "./data/fetch-user-scores.ts";
 import { fetchMusicDb } from "./data/fetch-musicdb.ts";
 import { fetchSongBias } from "./data/fetch-song-bias.ts";
 
 // Utilities
 import { buildPlayerProfile } from "./utils/calculate-profile.ts";
 import { calculateTotalStats, calculateCatalogCounts } from "./utils/calculate-stats.ts";
 
 // Router
 import { determineActiveSkills, logActiveSkills } from "./router.ts";
 
 // Skills
 import * as whoIAm from "./skills/who-i-am.ts";
 import * as playerProfile from "./skills/player-profile.ts";
 import * as countingStats from "./skills/counting-stats.ts";
 import * as songCatalog from "./skills/song-catalog.ts";
 import * as chartPatterns from "./skills/chart-patterns.ts";
 import * as sdpRules from "./skills/sdp-rules.ts";
 import * as warmupRules from "./skills/warmup-rules.ts";
 import * as offsetData from "./skills/offset-data.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const { messages } = await req.json() as { messages: Message[] };
 
     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
     if (!LOVABLE_API_KEY) {
       throw new Error("LOVABLE_API_KEY is not configured");
     }
 
     const authHeader = req.headers.get("Authorization");
     if (!authHeader?.startsWith("Bearer ")) {
       return new Response(JSON.stringify({ error: "Unauthorized" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
 
     const supabase = createClient(supabaseUrl, supabaseAnonKey, {
       global: { headers: { Authorization: authHeader } },
     });
 
     const token = authHeader.replace("Bearer ", "");
     const { data: userData, error: userError } = await supabase.auth.getUser(token);
     if (userError || !userData?.user) {
       return new Response(JSON.stringify({ error: "Unauthorized" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const userId = userData.user.id;
 
     // Get the latest user message to determine which skills to activate
     const latestUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
     const activeSkills = determineActiveSkills(latestUserMessage);
     logActiveSkills(activeSkills);
 
     // Create service role client for fetching global data
     const supabaseServiceRole = createClient(
       supabaseUrl,
       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
     );
 
     // Fetch data based on active skills
     // Always fetch user scores (needed for profile and most skills)
     const userScores = await fetchUserScores(supabase, userId);
     
     // Conditionally fetch heavier data
     const chartAnalysis = activeSkills.songCatalog || activeSkills.chartPatterns
       ? await fetchMusicDb(supabaseServiceRole)
       : [];
     
     const songBiasMap = activeSkills.offsetData
       ? await fetchSongBias(supabaseServiceRole)
       : new Map<number, number>();
 
     // Calculate derived data
     const profile = buildPlayerProfile(userScores, chartAnalysis);
     const totalStats = calculateTotalStats(userScores);
     const catalogCounts = calculateCatalogCounts(chartAnalysis);
 
     console.log("Player profile:", JSON.stringify(profile, null, 2));
     console.log("Total stats:", JSON.stringify(totalStats, null, 2));
 
     // Assemble the system prompt from active skills
     let systemPrompt = '';
 
     // Always include core identity
     if (activeSkills.whoIAm) {
       systemPrompt += whoIAm.buildPrompt();
     }
 
     // Almost always include player profile
     if (activeSkills.playerProfile) {
       systemPrompt += playerProfile.buildPrompt(profile);
     }
 
     // Conditionally include other skills
     if (activeSkills.countingStats) {
       systemPrompt += countingStats.buildPrompt(totalStats);
     }
 
     if (activeSkills.sdpRules) {
       systemPrompt += sdpRules.buildPrompt();
     }
 
     if (activeSkills.warmupRules) {
       systemPrompt += warmupRules.buildPrompt();
     }
 
     if (activeSkills.chartPatterns) {
       systemPrompt += chartPatterns.buildPrompt();
     }
 
     if (activeSkills.offsetData) {
       systemPrompt += offsetData.buildPrompt(songBiasMap);
     }
 
     // Song catalog is the heaviest - include last
     if (activeSkills.songCatalog) {
       systemPrompt += songCatalog.buildPrompt(chartAnalysis, userScores, catalogCounts);
     }
 
     console.log(`System prompt length: ${systemPrompt.length} characters`);
 
     const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: "google/gemini-3-flash-preview",
         messages: [
           { role: "system", content: systemPrompt },
           ...messages,
         ],
         stream: true,
       }),
     });
 
     if (!response.ok) {
       if (response.status === 429) {
         return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
           status: 429,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }
       if (response.status === 402) {
         return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
           status: 402,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }
       const errorText = await response.text();
       console.error("AI gateway error:", response.status, errorText);
       return new Response(JSON.stringify({ error: "AI gateway error" }), {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     return new Response(response.body, {
       headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
     });
 
   } catch (e) {
     console.error("edi-chat error:", e);
     return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });