// EDI Chat - Main Entry Point with Function Calling
// This file handles the tool-calling loop for Edi's database queries

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types
import { Message, ChatCompletionResponse, ToolCall } from "./utils/types.ts";

// Data fetchers (still needed for profile/stats calculation)
import { fetchUserScores } from "./data/fetch-user-scores.ts";
import { fetchMusicDb } from "./data/fetch-musicdb.ts";

// Utilities
import { buildPlayerProfile } from "./utils/calculate-profile.ts";
import { calculateTotalStats } from "./utils/calculate-stats.ts";

// Skills that STAY in the prompt (small, always-needed context)
import * as whoIAm from "./skills/who-i-am.ts";
import * as playerProfile from "./skills/player-profile.ts";
import * as countingStats from "./skills/counting-stats.ts";
import * as sdpRules from "./skills/sdp-rules.ts";
import * as warmupRules from "./skills/warmup-rules.ts";

// Tool definitions and executor
import { toolDefinitions, toolsSystemPrompt } from "./tools/definitions.ts";
import { executeToolCall } from "./tools/executor.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";
const MAX_TOOL_ROUNDS = 3;

// Helper to create SSE response from non-streaming content
function createSSEResponse(text: string): Response {
  const encoder = new TextEncoder();
  const chunks = [
    `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`,
    `data: [DONE]\n\n`,
  ];
  const body = encoder.encode(chunks.join(""));
  return new Response(body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages: incomingMessages } = await req.json() as { messages: Message[] };

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

    // User-scoped client (for user_scores queries - respects RLS)
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

    // Service role client (for global data - musicdb, chart_analysis, song_bias)
    const supabaseServiceRole = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch data needed for player profile and stats
    // These are still loaded at startup because they're needed for the system prompt
    const userScores = await fetchUserScores(supabase, userId);
    const chartAnalysis = await fetchMusicDb(supabaseServiceRole);

    // Calculate player profile and total stats
    const profile = buildPlayerProfile(userScores, chartAnalysis);
    const totalStats = calculateTotalStats(userScores);

    console.log("Player profile:", JSON.stringify(profile, null, 2));
    console.log("Total stats:", JSON.stringify(totalStats, null, 2));

    // Build system prompt from skills that STAY (small, always-needed context)
    let systemPrompt = '';

    // Core identity (always)
    systemPrompt += whoIAm.buildPrompt();

    // Player profile (always)
    systemPrompt += playerProfile.buildPrompt(profile);

    // Counting stats (always - needed for "how many" questions)
    systemPrompt += countingStats.buildPrompt(totalStats);

    // SDP rules (always - to avoid bad SDP recommendations)
    systemPrompt += sdpRules.buildPrompt();

    // Warmup rules (always - to avoid bad warmup recommendations)
    systemPrompt += warmupRules.buildPrompt();

    // Add tool awareness section
    systemPrompt += toolsSystemPrompt;

    console.log(`System prompt length: ${systemPrompt.length} characters`);

    // Build the message array for the API
    const allMessages: Message[] = [
      { role: "system", content: systemPrompt },
      ...incomingMessages,
    ];

    // Tool-calling loop
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      console.log(`Tool-calling round ${round + 1}/${MAX_TOOL_ROUNDS}`);

      // Non-streaming call to check for tool use
      const response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: allMessages,
          tools: toolDefinitions,
          tool_choice: "auto",
          stream: false,
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

      const data: ChatCompletionResponse = await response.json();
      const choice = data.choices[0];

      if (!choice) {
        console.error("No choice in response:", data);
        return new Response(JSON.stringify({ error: "Invalid AI response" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const assistantMessage = choice.message;
      const toolCalls = assistantMessage.tool_calls;

      // If no tool calls, we have our final answer
      if (!toolCalls || toolCalls.length === 0) {
        console.log("No tool calls - returning final response");
        const finalText = assistantMessage.content || "";
        return createSSEResponse(finalText);
      }

      console.log(`Received ${toolCalls.length} tool call(s)`);

      // Append assistant's tool-call message to history
      allMessages.push({
        role: "assistant",
        content: assistantMessage.content,
        tool_calls: toolCalls,
      });

      // Execute each tool call
      for (const toolCall of toolCalls) {
        console.log(`Executing tool: ${toolCall.function.name}`);
        const result = await executeToolCall(
          toolCall as ToolCall,
          supabase,
          supabaseServiceRole,
          userId
        );
        console.log(`Tool result length: ${result.length} chars`);

        // Append tool result to history
        allMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }
      // Loop back for another round
    }

    // If we exhausted all tool rounds, make one final streaming call WITHOUT tools
    console.log("Exhausted tool rounds - making final streaming call");

    const finalResponse = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: allMessages,
        stream: true,
      }),
    });

    if (!finalResponse.ok) {
      const errorText = await finalResponse.text();
      console.error("Final AI gateway error:", finalResponse.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(finalResponse.body, {
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
