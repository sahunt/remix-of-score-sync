import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SongFix {
  song_id: number;
  eamuse_id: string;
}

interface FixResult {
  song_id: number;
  rows_updated: number;
  success: boolean;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('fix-musicdb-rows: Starting batch fix process');

  try {
    const body = await req.json();
    const fixes: SongFix[] = body.fixes;

    if (!fixes || !Array.isArray(fixes) || fixes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'fixes array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`fix-musicdb-rows: Processing ${fixes.length} song fixes`);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: FixResult[] = [];
    let totalRowsUpdated = 0;

    for (const fix of fixes) {
      const { song_id, eamuse_id } = fix;

      if (!song_id || !eamuse_id) {
        results.push({
          song_id: song_id || 0,
          rows_updated: 0,
          success: false,
          error: 'Missing song_id or eamuse_id',
        });
        continue;
      }

      // Validate eamuse_id is 32 characters
      if (eamuse_id.length !== 32) {
        results.push({
          song_id,
          rows_updated: 0,
          success: false,
          error: `Invalid eamuse_id length: ${eamuse_id.length} (expected 32)`,
        });
        continue;
      }

      console.log(`fix-musicdb-rows: Updating song_id ${song_id} with eamuse_id ${eamuse_id}`);

      const { data, error } = await supabase
        .from('musicdb')
        .update({ eamuse_id })
        .eq('song_id', song_id)
        .select('id');

      if (error) {
        console.error(`fix-musicdb-rows: Error updating song_id ${song_id}:`, error.message);
        results.push({
          song_id,
          rows_updated: 0,
          success: false,
          error: error.message,
        });
      } else {
        const rowCount = data?.length || 0;
        totalRowsUpdated += rowCount;
        console.log(`fix-musicdb-rows: Updated ${rowCount} rows for song_id ${song_id}`);
        results.push({
          song_id,
          rows_updated: rowCount,
          success: true,
        });
      }
    }

    const summary = {
      total_songs_processed: fixes.length,
      total_rows_updated: totalRowsUpdated,
      successful_fixes: results.filter(r => r.success).length,
      failed_fixes: results.filter(r => !r.success).length,
      details: results,
    };

    console.log('fix-musicdb-rows: Complete', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('fix-musicdb-rows: Unexpected error', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
