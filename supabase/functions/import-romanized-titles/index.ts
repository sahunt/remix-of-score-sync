import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TitleRow {
  eamuse_id: string;
  romanized_title: string;
}

interface ImportResult {
  total_in_csv: number;
  rows_updated: number;
  invalid_rows: number;
  error?: string;
}

function parseCSV(content: string): TitleRow[] {
  const lines = content.trim().split("\n");
  const titles: TitleRow[] = [];

  // Skip header row (eamuse_id,romanized_title)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV with possible quoted fields
    const match = line.match(/^([^,]+),(.*)$/);
    if (!match) {
      console.warn(`Skipping malformed line ${i + 1}: ${line}`);
      continue;
    }

    const eamuse_id = match[1].trim();
    // Remove surrounding quotes if present
    let romanized_title = match[2].trim();
    if (romanized_title.startsWith('"') && romanized_title.endsWith('"')) {
      romanized_title = romanized_title.slice(1, -1);
    }

    // Validate eamuse_id is 32 characters
    if (!eamuse_id || eamuse_id.length !== 32) {
      console.warn(`Invalid eamuse_id on line ${i + 1}: ${eamuse_id} (length: ${eamuse_id.length})`);
      continue;
    }

    if (!romanized_title) {
      console.warn(`Empty romanized_title on line ${i + 1}`);
      continue;
    }

    titles.push({ eamuse_id, romanized_title });
  }

  return titles;
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
    const titles = parseCSV(csvContent);
    console.log(`Parsed ${titles.length} valid title mappings from CSV`);

    const result: ImportResult = {
      total_in_csv: titles.length,
      rows_updated: 0,
      invalid_rows: 0,
    };

    if (titles.length === 0) {
      throw new Error("No valid title mappings found in CSV");
    }

    // Convert to JSONB array format for the RPC function
    const updates = titles.map((t) => ({
      eamuse_id: t.eamuse_id,
      romanized_title: t.romanized_title,
    }));

    console.log(`Calling bulk_update_romanized_titles with ${updates.length} mappings...`);

    // Call the RPC function - single transaction, no batching needed
    const { data, error } = await supabase.rpc("bulk_update_romanized_titles", {
      updates: updates,
    });

    if (error) {
      console.error("RPC error:", error);
      throw new Error(`RPC failed: ${error.message}`);
    }

    // The function returns a table with updated_count
    if (data && data.length > 0) {
      result.rows_updated = data[0].updated_count;
    }

    console.log(`Import complete:
      - Total in CSV: ${result.total_in_csv}
      - Rows updated: ${result.rows_updated}`);

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
