import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MappingRow {
  song_id: number;
  eamuse_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('import-eamuse-ids: Starting import process');

  try {
    // Parse request body - accept CSV content or a URL
    const body = await req.json().catch(() => ({}));
    let content = body.content;
    
    // If a URL is provided, fetch the content from there
    if (body.url && !content) {
      console.log(`import-eamuse-ids: Fetching CSV from URL: ${body.url}`);
      const response = await fetch(body.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV from URL: ${response.status}`);
      }
      content = await response.text();
    }
    
    if (!content || typeof content !== 'string') {
      console.error('import-eamuse-ids: No CSV content provided');
      return new Response(
        JSON.stringify({ error: 'CSV content is required. Provide "content" or "url" in the request body.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`import-eamuse-ids: Received CSV content of length ${content.length}`);
    console.log(`import-eamuse-ids: First 200 chars: ${content.substring(0, 200)}`);

    // Create Supabase client with service role for bulk operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse CSV - handle both Windows and Unix line endings
    const lines = content.trim().replace(/\r\n/g, '\n').split('\n');
    console.log(`import-eamuse-ids: Found ${lines.length} lines`);
    
    const mappings: MappingRow[] = [];
    
    // Skip header line (song_id,EncodedID)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',');
      if (parts.length < 2) {
        console.warn(`import-eamuse-ids: Skipping malformed line ${i}: ${line}`);
        continue;
      }
      
      const songIdStr = parts[0].trim();
      const eamuseId = parts[1].trim();
      const songId = parseInt(songIdStr, 10);
      
      if (isNaN(songId) || !eamuseId) {
        console.warn(`import-eamuse-ids: Skipping invalid line ${i}: ${line}`);
        continue;
      }
      
      mappings.push({ song_id: songId, eamuse_id: eamuseId });
    }

    console.log(`import-eamuse-ids: Parsed ${mappings.length} mappings`);

    // Batch update musicdb records
    const BATCH_SIZE = 50;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < mappings.length; i += BATCH_SIZE) {
      const batch = mappings.slice(i, i + BATCH_SIZE);
      
      // Execute updates in parallel within each batch
      const results = await Promise.all(
        batch.map(async ({ song_id, eamuse_id }) => {
          const { error, count } = await supabase
            .from('musicdb')
            .update({ eamuse_id })
            .eq('song_id', song_id);
          
          if (error) {
            console.error(`import-eamuse-ids: Error updating song_id ${song_id}:`, error);
            return { success: false };
          }
          
          return { success: true, count };
        })
      );
      
      for (const result of results) {
        if (result.success) {
          updated++;
        } else {
          errors++;
        }
      }
      
      console.log(`import-eamuse-ids: Processed batch ${Math.floor(i / BATCH_SIZE) + 1}, updated: ${updated}, errors: ${errors}`);
    }

    const result = {
      mappings_parsed: mappings.length,
      songs_updated: updated,
      errors,
    };

    console.log('import-eamuse-ids: Import complete', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('import-eamuse-ids: Unexpected error', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
