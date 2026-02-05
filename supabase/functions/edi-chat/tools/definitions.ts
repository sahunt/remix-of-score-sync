// Tool definitions for Edi function calling
// These are in OpenAI function-calling format

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export const toolDefinitions: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "search_songs",
      description:
        "Search for DDR songs by name, with optional filters. Use this when the user mentions a specific song or wants to find songs by name. Returns song details including difficulty, level, pattern data, and the user's score if they have one.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Song name or partial name to search for (case-insensitive)",
          },
          difficulty_level: {
            type: "integer",
            description: "Filter to specific difficulty level (1-20)",
            minimum: 1,
            maximum: 20,
          },
          difficulty_name: {
            type: "string",
            description: "Filter to specific difficulty name",
            enum: ["Beginner", "Basic", "Difficult", "Expert", "Challenge"],
          },
          include_user_scores: {
            type: "boolean",
            description: "Include the user's scores on matched songs (default: true)",
            default: true,
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_songs_by_criteria",
      description:
        "Filter songs by gameplay criteria. Use for recommendations, practice suggestions, finding songs with specific patterns, or checking achievement status. Examples: 'songs with crossovers', '17s without a PFC', 'stamina charts at level 16', 'songs with shock arrows', 'gimmicky charts'.",
      parameters: {
        type: "object",
        properties: {
          difficulty_level: {
            type: "integer",
            description: "Filter to exact difficulty level (1-20)",
            minimum: 1,
            maximum: 20,
          },
          min_difficulty_level: {
            type: "integer",
            description: "Minimum difficulty level (1-20)",
            minimum: 1,
            maximum: 20,
          },
          max_difficulty_level: {
            type: "integer",
            description: "Maximum difficulty level (1-20)",
            minimum: 1,
            maximum: 20,
          },
          difficulty_name: {
            type: "string",
            description: "Filter to specific difficulty name",
            enum: ["Beginner", "Basic", "Difficult", "Expert", "Challenge"],
          },
          halo_filter: {
            type: "string",
            description:
              "Filter by user's achievement status on the song",
            enum: [
              "no_score",
              "no_clear",
              "clear_no_fc",
              "fc_no_pfc",
              "pfc_no_mfc",
              "has_pfc",
              "has_mfc",
            ],
          },
          min_crossovers: {
            type: "integer",
            description: "Minimum crossover count (patterns where feet cross)",
            minimum: 0,
          },
          min_footswitches: {
            type: "integer",
            description: "Minimum footswitch count",
            minimum: 0,
          },
          min_jacks: {
            type: "integer",
            description: "Minimum jack count (repeated notes on same arrow)",
            minimum: 0,
          },
          min_mines: {
            type: "integer",
            description: "Minimum shock arrow (mines) count. Shock arrows are obstacles to AVOID, not hit.",
            minimum: 0,
          },
          min_stops: {
            type: "integer",
            description: "Minimum stop/freeze count (indicates gimmicky charts with speed changes or stops)",
            minimum: 0,
          },
          min_notes: {
            type: "integer",
            description: "Minimum total note count (for stamina filtering)",
            minimum: 0,
          },
          min_bpm: {
            type: "integer",
            description: "Minimum BPM",
            minimum: 0,
          },
          max_bpm: {
            type: "integer",
            description: "Maximum BPM",
            minimum: 0,
          },
          min_score: {
            type: "integer",
            description: "Minimum user score (0-1000000)",
            minimum: 0,
            maximum: 1000000,
          },
          max_score: {
            type: "integer",
            description: "Maximum user score (0-1000000)",
            minimum: 0,
            maximum: 1000000,
          },
          era: {
            type: "integer",
            description: "Filter by song era (0=Classic, 1=White, 2=Gold, 3+=newer). Lower era = older songs.",
            minimum: 0,
          },
          sort_by: {
            type: "string",
            description: "Sort results by this field",
            enum: [
              "crossovers",
              "footswitches",
              "jacks",
              "mines",
              "notes",
              "bpm",
              "peak_nps",
              "score",
              "random",
            ],
          },
          limit: {
            type: "integer",
            description: "Number of results to return (default: 10, max: 25)",
            minimum: 1,
            maximum: 25,
            default: 10,
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_song_offset",
      description:
        "Look up the recommended judgement offset for a specific song. Use when the user asks about timing/sync issues for a particular song.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Song name to look up offset for",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_catalog_stats",
      description:
        "Get counts of songs/charts available in the catalog, optionally filtered by difficulty level. Use when the user asks how many songs are at a certain level or general catalog statistics.",
      parameters: {
        type: "object",
        properties: {
          difficulty_level: {
            type: "integer",
            description: "Filter to specific difficulty level to get count for that level only",
            minimum: 1,
            maximum: 20,
          },
        },
        required: [],
      },
    },
  },
];

// System prompt section explaining available tools
export const toolsSystemPrompt = `
══════════════════════════════════════════════════════════════════════════════
AVAILABLE DATA TOOLS
══════════════════════════════════════════════════════════════════════════════

You have access to tools that query the DDR database. USE THEM — do NOT guess or make up song data.

- search_songs: Find songs by name. Always use this before recommending a specific song.
- get_songs_by_criteria: Filter songs by level, patterns, score status, etc. Use for "give me 16s with crossovers" or "what songs don't I have a PFC on".
- get_song_offset: Look up timing offset for a song.
- get_catalog_stats: Get counts of available charts by level.

⚠️ CRITICAL: NEVER recommend a song without first using a tool to verify it exists and check the user's score on it. If you can't find it with a tool, say "I couldn't find that song in the database."
`;
