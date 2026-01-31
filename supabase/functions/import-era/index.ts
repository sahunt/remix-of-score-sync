import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EraRow {
  eamuse_id: string;
  era: number;
}

interface ImportResult {
  total_in_csv: number;
  rows_updated: number;
  invalid_rows: number;
  error?: string;
}

function parseCSV(content: string): EraRow[] {
  const lines = content.trim().split("\n");
  const eraRows: EraRow[] = [];

  // Skip header row (song_name,eamuse_id,era)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV with possible quoted song_name field (first column may contain commas)
    // Format: "Song Name, With Comma",eamuse_id,era OR Song Name,eamuse_id,era
    let eamuse_id: string;
    let era: string;

    if (line.startsWith('"')) {
      // Quoted song name - find the closing quote
      const closingQuoteIndex = line.indexOf('",', 1);
      if (closingQuoteIndex === -1) {
        console.warn(`Skipping malformed quoted line ${i + 1}: ${line}`);
        continue;
      }
      // Rest after the quoted field and comma
      const rest = line.substring(closingQuoteIndex + 2);
      const parts = rest.split(",");
      if (parts.length < 2) {
        console.warn(`Skipping line ${i + 1} with missing fields: ${line}`);
        continue;
      }
      eamuse_id = parts[0].trim();
      era = parts[1].trim();
    } else {
      // No quoted song name - simple split, take last two fields
      const parts = line.split(",");
      if (parts.length < 3) {
        console.warn(`Skipping line ${i + 1} with insufficient fields: ${line}`);
        continue;
      }
      // eamuse_id is second-to-last, era is last
      eamuse_id = parts[parts.length - 2].trim();
      era = parts[parts.length - 1].trim();
    }

    // Strip -d7 suffix if present, then validate eamuse_id is 32 characters
    let cleanId = eamuse_id;
    if (cleanId.endsWith('-d7')) {
      cleanId = cleanId.slice(0, -3);
    }
    
    if (!cleanId || cleanId.length !== 32) {
      console.warn(`Invalid eamuse_id on line ${i + 1}: ${cleanId} (length: ${cleanId.length})`);
      continue;
    }
    eamuse_id = cleanId;

    // Parse era as integer
    const eraNum = parseInt(era, 10);
    if (isNaN(eraNum) || eraNum < 0 || eraNum > 2) {
      console.warn(`Invalid era value on line ${i + 1}: ${era}`);
      continue;
    }

    eraRows.push({ eamuse_id, era: eraNum });
  }

  return eraRows;
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
    const eraRows = parseCSV(csvContent);
    console.log(`Parsed ${eraRows.length} valid era mappings from CSV`);

    const result: ImportResult = {
      total_in_csv: eraRows.length,
      rows_updated: 0,
      invalid_rows: 0,
    };

    if (eraRows.length === 0) {
      throw new Error("No valid era mappings found in CSV");
    }

    // Convert to JSONB array format for the RPC function
    const updates = eraRows.map((r) => ({
      eamuse_id: r.eamuse_id,
      era: r.era,
    }));

    console.log(`Calling bulk_update_era with ${updates.length} mappings...`);

    // Call the RPC function - single transaction, no batching needed
    const { data, error } = await supabase.rpc("bulk_update_era", {
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
