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

    // Process in batches of 100
    const BATCH_SIZE = 100;
    const batches: RatingRow[][] = [];
    for (let i = 0; i < ratings.length; i += BATCH_SIZE) {
      batches.push(ratings.slice(i, i + BATCH_SIZE));
    }

    console.log(`Processing ${batches.length} batches of up to ${BATCH_SIZE} ratings each`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} ratings)`);

      // Process each rating in the batch
      for (const rating of batch) {
        try {
          // Update the matching row in musicdb
          const { data, error } = await supabase
            .from("musicdb")
            .update({ sanbai_rating: rating.rating })
            .eq("eamuse_id", rating.eamuse_id)
            .eq("difficulty_name", rating.difficulty)
            .eq("playstyle", "SP")
            .select("id");

          if (error) {
            result.errors.push(
              `Error updating ${rating.eamuse_id}/${rating.difficulty}: ${error.message}`
            );
            continue;
          }

          if (!data || data.length === 0) {
            result.not_found.push(`${rating.eamuse_id}/${rating.difficulty}`);
          } else {
            result.charts_updated += data.length;
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          result.errors.push(
            `Exception for ${rating.eamuse_id}/${rating.difficulty}: ${errorMessage}`
          );
        }
      }

      // Log progress every 10 batches
      if ((batchIndex + 1) % 10 === 0) {
        console.log(
          `Progress: ${batchIndex + 1}/${batches.length} batches, ${result.charts_updated} updated, ${result.not_found.length} not found`
        );
      }
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
