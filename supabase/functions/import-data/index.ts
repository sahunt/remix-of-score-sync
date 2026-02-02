import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Table configurations with their conflict keys
const TABLE_CONFIG: Record<string, { conflictKey: string; orderBy: string }> = {
  musicdb: { conflictKey: 'id', orderBy: 'id' },
  song_bias: { conflictKey: 'song_id', orderBy: 'song_id' },
  user_profiles: { conflictKey: 'id', orderBy: 'id' },
  user_goals: { conflictKey: 'id', orderBy: 'id' },
  user_filters: { conflictKey: 'id', orderBy: 'id' },
  user_song_offsets: { conflictKey: 'id', orderBy: 'id' },
  uploads: { conflictKey: 'id', orderBy: 'id' },
  user_scores: { conflictKey: 'id', orderBy: 'id' },
};

interface ImportResult {
  table: string;
  requested: number;
  inserted: number;
  errors: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role for unrestricted writes
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { table, data, conflict_key } = body;

    if (!table || !data) {
      return new Response(
        JSON.stringify({ error: 'Both "table" and "data" are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(data)) {
      return new Response(
        JSON.stringify({ error: '"data" must be an array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = TABLE_CONFIG[table];
    if (!config) {
      return new Response(
        JSON.stringify({ error: `Unknown table: ${table}. Valid tables: ${Object.keys(TABLE_CONFIG).join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting import for ${table}: ${data.length} records`);

    const result: ImportResult = {
      table,
      requested: data.length,
      inserted: 0,
      errors: [],
    };

    // Batch insert (500 records at a time)
    const BATCH_SIZE = 500;
    const conflictColumn = conflict_key || config.conflictKey;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from(table)
        .upsert(batch, { 
          onConflict: conflictColumn,
          ignoreDuplicates: false 
        });

      if (error) {
        const errorMsg = `Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      } else {
        result.inserted += batch.length;
        console.log(`${table}: Imported batch ${Math.floor(i / BATCH_SIZE) + 1}, total: ${result.inserted}/${data.length}`);
      }
    }

    console.log(`Import complete for ${table}: ${result.inserted}/${result.requested} records`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
