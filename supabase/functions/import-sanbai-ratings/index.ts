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

    // Fetch ALL existing SP charts with their eamuse_id + difficulty_name
    // Use pagination to get past the 1000 row default limit
    console.log("Fetching existing SP charts...");
    
    const allCharts: { id: number; eamuse_id: string | null; difficulty_name: string | null }[] = [];
    let page = 0;
    const PAGE_SIZE = 1000;
    
    while (true) {
      const { data: pageData, error: fetchError } = await supabase
        .from("musicdb")
        .select("id, eamuse_id, difficulty_name")
        .eq("playstyle", "SP")
        .not("eamuse_id", "is", null)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (fetchError) {
        throw new Error(`Failed to fetch charts page ${page}: ${fetchError.message}`);
      }

      if (!pageData || pageData.length === 0) {
        break;
      }

      allCharts.push(...pageData);
      console.log(`Fetched page ${page + 1}: ${pageData.length} charts (total: ${allCharts.length})`);
      
      if (pageData.length < PAGE_SIZE) {
        break; // Last page
      }
      
      page++;
    }

    console.log(`Found ${allCharts.length} SP charts with eamuse_id`);

    // Build a lookup map: "eamuse_id|difficulty_name" -> chart id
    const chartMap = new Map<string, number>();
    for (const chart of allCharts) {
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

    console.log(`Matched ${updates.length} ratings to charts, ${result.not_found.length} not found`);

    // Process updates in smaller batches with delays to avoid rate limiting
    const BATCH_SIZE = 25;
    const batches: { id: number; rating: number }[][] = [];
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      batches.push(updates.slice(i, i + BATCH_SIZE));
    }

    console.log(`Processing ${batches.length} batches of up to ${BATCH_SIZE} updates each`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // Update each record in the batch sequentially to avoid overwhelming the API
      for (const update of batch) {
        try {
          const { error } = await supabase
            .from("musicdb")
            .update({ sanbai_rating: update.rating })
            .eq("id", update.id);

          if (error) {
            // Check if error message looks like HTML (rate limit/500 error)
            if (error.message.includes("<!DOCTYPE") || error.message.includes("<html")) {
              result.errors.push(`Rate limit hit at id ${update.id}, waiting...`);
              // Wait longer and retry once
              await new Promise(resolve => setTimeout(resolve, 2000));
              const { error: retryError } = await supabase
                .from("musicdb")
                .update({ sanbai_rating: update.rating })
                .eq("id", update.id);
              if (!retryError) {
                result.charts_updated++;
              } else {
                result.errors.push(`Retry failed for id ${update.id}`);
              }
            } else {
              result.errors.push(`Error updating id ${update.id}: ${error.message}`);
            }
          } else {
            result.charts_updated++;
          }
        } catch (e) {
          result.errors.push(`Exception updating id ${update.id}: ${e}`);
        }
      }

      // Add delay between batches to avoid rate limiting
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if ((batchIndex + 1) % 50 === 0 || batchIndex === batches.length - 1) {
        console.log(`Processed batch ${batchIndex + 1}/${batches.length}, total updated: ${result.charts_updated}`);
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
