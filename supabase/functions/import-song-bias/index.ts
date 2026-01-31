import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BiasRow {
  eamuse_id: string;
  bias_ms: number;
}

interface ImportResult {
  total_in_csv: number;
  songs_imported: number;
  not_found: string[];
  errors: string[];
}

function parseCSV(content: string): BiasRow[] {
  const lines = content.trim().split("\n");
  const biases: BiasRow[] = [];

  // Skip header row (song_id,bias)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(",");
    if (parts.length < 2) {
      console.warn(`Skipping malformed line ${i + 1}: ${line}`);
      continue;
    }

    // CSV format: song_id (eamuse_id), bias
    const eamuse_id = parts[0].trim();
    const bias_ms = parseFloat(parts[1].trim());

    if (!eamuse_id || eamuse_id.length !== 32) {
      console.warn(`Invalid eamuse_id on line ${i + 1}: ${eamuse_id}`);
      continue;
    }

    if (isNaN(bias_ms)) {
      console.warn(`Invalid bias on line ${i + 1}: ${parts[1]}`);
      continue;
    }

    biases.push({ eamuse_id, bias_ms });
  }

  return biases;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get CSV content from request body
    const { csvContent } = await req.json();

    if (!csvContent || typeof csvContent !== "string") {
      throw new Error("Missing csvContent in request body");
    }

    console.log(`CSV content length: ${csvContent.length} characters`);

    // Parse all CSV lines
    const biases = parseCSV(csvContent);
    console.log(`Parsed ${biases.length} bias values from CSV`);

    const result: ImportResult = {
      total_in_csv: biases.length,
      songs_imported: 0,
      not_found: [],
      errors: [],
    };

    // Get unique eamuse_ids from the CSV
    const eamuseIds = biases.map((b) => b.eamuse_id);

    // Fetch song_id for each eamuse_id from musicdb (one row per song)
    // We only need to get DISTINCT song_id per eamuse_id
    console.log("Fetching song_ids from musicdb...");

    const allMappings: { song_id: number; eamuse_id: string }[] = [];
    const BATCH_SIZE = 100;

    for (let i = 0; i < eamuseIds.length; i += BATCH_SIZE) {
      const batch = eamuseIds.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from("musicdb")
        .select("song_id, eamuse_id")
        .in("eamuse_id", batch)
        .not("eamuse_id", "is", null);

      if (error) {
        throw new Error(`Failed to fetch mappings: ${error.message}`);
      }

      if (data) {
        // Dedupe by song_id (same song appears multiple times for different charts)
        const seen = new Set<number>();
        for (const row of data) {
          if (!seen.has(row.song_id)) {
            seen.add(row.song_id);
            allMappings.push(row);
          }
        }
      }

      console.log(
        `Fetched batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(eamuseIds.length / BATCH_SIZE)}`
      );
    }

    console.log(`Found ${allMappings.length} unique songs in musicdb`);

    // Build lookup map: eamuse_id -> song_id
    const songIdMap = new Map<string, number>();
    for (const mapping of allMappings) {
      if (mapping.eamuse_id) {
        songIdMap.set(mapping.eamuse_id, mapping.song_id);
      }
    }

    // Build upsert data, deduping by song_id (keep last occurrence)
    const upsertMap = new Map<
      number,
      { song_id: number; eamuse_id: string; bias_ms: number }
    >();

    for (const bias of biases) {
      const song_id = songIdMap.get(bias.eamuse_id);
      if (song_id) {
        // Overwrites duplicates, keeping the last value
        upsertMap.set(song_id, {
          song_id,
          eamuse_id: bias.eamuse_id,
          bias_ms: bias.bias_ms,
        });
      } else {
        result.not_found.push(bias.eamuse_id);
      }
    }

    const upsertData = Array.from(upsertMap.values());

    console.log(
      `Matched ${upsertData.length} songs, ${result.not_found.length} not found`
    );

    // Upsert in batches
    const UPSERT_BATCH_SIZE = 100;
    for (let i = 0; i < upsertData.length; i += UPSERT_BATCH_SIZE) {
      const batch = upsertData.slice(i, i + UPSERT_BATCH_SIZE);

      const { error } = await supabase
        .from("song_bias")
        .upsert(batch, { onConflict: "song_id" });

      if (error) {
        result.errors.push(
          `Batch ${Math.floor(i / UPSERT_BATCH_SIZE) + 1} error: ${error.message}`
        );
        console.error(`Upsert error:`, error);
      } else {
        result.songs_imported += batch.length;
      }

      console.log(
        `Upserted batch ${Math.floor(i / UPSERT_BATCH_SIZE) + 1}/${Math.ceil(upsertData.length / UPSERT_BATCH_SIZE)}`
      );
    }

    console.log(`Import complete:
      - Total in CSV: ${result.total_in_csv}
      - Songs imported: ${result.songs_imported}
      - Not found: ${result.not_found.length}
      - Errors: ${result.errors.length}`);

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Import failed:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
