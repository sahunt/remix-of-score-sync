import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Try to get csvContent from request body
    let csvContent: string;
    
    try {
      const body = await req.json();
      csvContent = body.csvContent;
    } catch {
      csvContent = "";
    }

    if (!csvContent) {
      throw new Error("No CSV content provided");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse CSV
    const lines = csvContent.trim().split("\n");
    const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase().replace(/"/g, ""));

    console.log("CSV Headers:", headers);
    console.log("Total lines:", lines.length);

    const records: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Handle CSV parsing with potential commas in quoted fields
      const line = lines[i];
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/"/g, ""));
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/"/g, ""));

      const record: Record<string, unknown> = {};

      headers.forEach((header: string, index: number) => {
        const value = values[index];

        // Map CSV columns to database columns
        const columnMap: Record<string, string> = {
          song_id: "song_id",
          eamuse_id: "eamuse_id",
          title: "title",
          artist: "artist",
          bpm: "bpm",
          music_length: "music_length",
          chart_length: "chart_length",
          stop_count: "stop_count",
          difficulty_name: "difficulty_name",
          difficulty_level: "difficulty_level",
          crossovers: "crossovers",
          half_crossovers: "half_crossovers",
          full_crossovers: "full_crossovers",
          footswitches: "footswitches",
          up_footswitches: "up_footswitches",
          down_footswitches: "down_footswitches",
          jacks: "jacks",
          brackets: "brackets",
          doublesteps: "doublesteps",
          sideswitches: "sideswitches",
          notes: "notes",
          taps_and_holds: "taps_and_holds",
          jumps: "jumps",
          holds: "holds",
          rolls: "rolls",
          stream: "stream",
          voltage: "voltage",
          air: "air",
          freeze: "freeze_count",
          chaos: "chaos",
          peak_nps: "peak_nps",
          mean_nps: "mean_nps",
          median_nps: "median_nps",
          min_nps: "min_nps",
          stdev_nps: "stdev_nps",
        };

        const dbColumn = columnMap[header];
        if (dbColumn && value !== undefined && value !== "") {
          // Parse numeric fields
          const numericFields = [
            "song_id", "bpm", "music_length", "chart_length", "stop_count",
            "difficulty_level", "crossovers", "half_crossovers", "full_crossovers",
            "footswitches", "up_footswitches", "down_footswitches", "jacks",
            "brackets", "doublesteps", "sideswitches", "notes", "taps_and_holds",
            "jumps", "holds", "rolls", "stream", "voltage", "air", "freeze_count",
            "chaos", "peak_nps", "mean_nps", "median_nps", "min_nps", "stdev_nps"
          ];

          if (numericFields.includes(dbColumn)) {
            const parsed = parseFloat(value);
            record[dbColumn] = isNaN(parsed) ? null : parsed;
          } else {
            record[dbColumn] = value;
          }
        }
      });

      // Only add records with required fields
      if (record.song_id && record.difficulty_name) {
        records.push(record);
      }
    }

    console.log(`Parsed ${records.length} records from CSV`);

    // Batch upsert records
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      const { error } = await supabase
        .from("chart_analysis")
        .upsert(batch, { onConflict: "song_id,difficulty_name" });

      if (error) {
        console.error(`Error inserting batch ${i}:`, error);
        throw error;
      }

      insertedCount += batch.length;
      console.log(`Inserted ${insertedCount}/${records.length} records`);
    }

    return new Response(
      JSON.stringify({ success: true, recordsImported: insertedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("Import error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
