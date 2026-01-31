import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RatingRow {
  eamuse_id: string;
  difficulty: string;
  rating: number;
}

interface UpdateResult {
  total_in_csv: number;
  charts_updated: number;
  not_found: string[];
  errors: string[];
}

function parseCSV(content: string): RatingRow[] {
  const lines = content.trim().split("\n");
  const ratings: RatingRow[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(",");
    if (parts.length < 3) {
      console.warn(`Skipping malformed line ${i + 1}: ${line}`);
      continue;
    }

    // Strip .jpg from eamuse_id if present
    let eamuse_id = parts[0].trim();
    if (eamuse_id.endsWith(".jpg")) {
      eamuse_id = eamuse_id.slice(0, -4);
    }

    // Convert difficulty to uppercase
    const difficulty = parts[1].trim().toUpperCase();

    // Parse rating as float
    const rating = parseFloat(parts[2].trim());
    if (isNaN(rating)) {
      console.warn(`Invalid rating on line ${i + 1}: ${parts[2]}`);
      continue;
    }

    ratings.push({ eamuse_id, difficulty, rating });
  }

  return ratings;
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
    const ratings = parseCSV(csvContent);
    console.log(`Parsed ${ratings.length} ratings from CSV`);

    const result: UpdateResult = {
      total_in_csv: ratings.length,
      charts_updated: 0,
      not_found: [],
      errors: [],
    };

    // First, get all existing SP charts with their eamuse_id + difficulty_name
    console.log("Fetching existing SP charts...");
    const { data: existingCharts, error: fetchError } = await supabase
      .from("musicdb")
      .select("id, eamuse_id, difficulty_name")
      .eq("playstyle", "SP")
      .not("eamuse_id", "is", null);

    if (fetchError) {
      throw new Error(`Failed to fetch charts: ${fetchError.message}`);
    }

    console.log(`Found ${existingCharts?.length || 0} SP charts with eamuse_id`);

    // Build a lookup map: "eamuse_id|difficulty_name" -> chart id
    const chartMap = new Map<string, number>();
    for (const chart of existingCharts || []) {
      if (chart.eamuse_id && chart.difficulty_name) {
        const key = `${chart.eamuse_id}|${chart.difficulty_name}`;
        chartMap.set(key, chart.id);
      }
    }

    console.log(`Built lookup map with ${chartMap.size} entries`);

    // Match ratings to chart IDs
    const updates: { id: number; rating: number }[] = [];
    for (const rating of ratings) {
      const key = `${rating.eamuse_id}|${rating.difficulty}`;
      const chartId = chartMap.get(key);
      
      if (chartId) {
        updates.push({ id: chartId, rating: rating.rating });
      } else {
        result.not_found.push(`${rating.eamuse_id}/${rating.difficulty}`);
      }
    }

    console.log(`Matched ${updates.length} ratings to charts`);

    // Process updates in larger batches using upsert
    const BATCH_SIZE = 500;
    const batches: { id: number; rating: number }[][] = [];
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      batches.push(updates.slice(i, i + BATCH_SIZE));
    }

    console.log(`Processing ${batches.length} batches of up to ${BATCH_SIZE} updates each`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} updates)`);

      // Update each record in the batch
      for (const update of batch) {
        const { error } = await supabase
          .from("musicdb")
          .update({ sanbai_rating: update.rating })
          .eq("id", update.id);

        if (error) {
          result.errors.push(`Error updating id ${update.id}: ${error.message}`);
        } else {
          result.charts_updated++;
        }
      }

      console.log(`Batch ${batchIndex + 1} complete, total updated: ${result.charts_updated}`);
    }

    console.log(`Import complete:
      - Total in CSV: ${result.total_in_csv}
      - Charts updated: ${result.charts_updated}
      - Not found: ${result.not_found.length}
      - Errors: ${result.errors.length}`);

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Import failed:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
