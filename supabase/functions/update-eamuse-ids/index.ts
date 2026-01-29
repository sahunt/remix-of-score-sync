import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateResult {
  songs_updated: number;
  songs_not_found: string[];
  duplicate_eamuse_ids: { eamuse_id: string; song_ids: number[] }[];
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('update-eamuse-ids: Starting update process');

  try {
    const body = await req.json().catch(() => ({}));
    let content = body.content;

    // If a URL is provided, fetch the content
    if (body.url && !content) {
      console.log(`update-eamuse-ids: Fetching CSV from URL: ${body.url}`);
      const response = await fetch(body.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV from URL: ${response.status}`);
      }
      content = await response.text();
    }

    // If a storage_path is provided, fetch from Supabase storage
    if (body.storage_path && !content) {
      console.log(`update-eamuse-ids: Fetching CSV from storage: ${body.storage_path}`);
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const storageClient = createClient(supabaseUrl, supabaseServiceKey);

      const { data, error } = await storageClient.storage
        .from('score-uploads')
        .download(body.storage_path);

      if (error) {
        throw new Error(`Failed to download from storage: ${error.message}`);
      }

      content = await data.text();
    }

    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ error: 'CSV content is required. Provide "content", "url", or "storage_path".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`update-eamuse-ids: Received CSV content of length ${content.length}`);

    // Parse CSV - format: song_id,EncodedID
    const lines = content.trim().split('\n');
    const header = lines[0].toLowerCase();
    
    if (!header.includes('song_id') || !header.includes('encodedid')) {
      return new Response(
        JSON.stringify({ error: 'Invalid CSV format. Expected headers: song_id,EncodedID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse mappings
    const mappings: { song_id: number; eamuse_id: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',');
      if (parts.length < 2) continue;

      const song_id = parseInt(parts[0].trim(), 10);
      const eamuse_id = parts[1].trim();

      if (isNaN(song_id) || !eamuse_id) {
        console.warn(`update-eamuse-ids: Skipping invalid line ${i + 1}: ${line}`);
        continue;
      }

      mappings.push({ song_id, eamuse_id });
    }

    console.log(`update-eamuse-ids: Parsed ${mappings.length} mappings from CSV`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const result: UpdateResult = {
      songs_updated: 0,
      songs_not_found: [],
      duplicate_eamuse_ids: [],
      errors: [],
    };

    // Batch update - process 50 at a time
    const BATCH_SIZE = 50;
    for (let i = 0; i < mappings.length; i += BATCH_SIZE) {
      const batch = mappings.slice(i, i + BATCH_SIZE);
      
      // Update each mapping in the batch
      const updatePromises = batch.map(async ({ song_id, eamuse_id }) => {
        const { data, error } = await supabase
          .from('musicdb')
          .update({ eamuse_id })
          .eq('song_id', song_id)
          .select('id');

        if (error) {
          result.errors.push(`Error updating song_id ${song_id}: ${error.message}`);
          return 0;
        }

        if (!data || data.length === 0) {
          result.songs_not_found.push(song_id.toString());
          return 0;
        }

        return data.length; // Number of charts updated for this song
      });

      const counts = await Promise.all(updatePromises);
      result.songs_updated += counts.filter(c => c > 0).length;

      console.log(`update-eamuse-ids: Processed batch ${Math.floor(i / BATCH_SIZE) + 1}, songs updated so far: ${result.songs_updated}`);
    }

    // Check for duplicate eamuse_ids after update
    console.log('update-eamuse-ids: Checking for duplicate eamuse_ids...');
    
    const { data: duplicates, error: dupError } = await supabase
      .from('musicdb')
      .select('eamuse_id, song_id')
      .not('eamuse_id', 'is', null);

    if (dupError) {
      result.errors.push(`Error checking duplicates: ${dupError.message}`);
    } else if (duplicates) {
      // Group by eamuse_id and find duplicates
      const eamuseIdMap = new Map<string, Set<number>>();
      
      for (const row of duplicates) {
        if (!row.eamuse_id) continue;
        
        if (!eamuseIdMap.has(row.eamuse_id)) {
          eamuseIdMap.set(row.eamuse_id, new Set());
        }
        eamuseIdMap.get(row.eamuse_id)!.add(row.song_id);
      }

      // Find eamuse_ids with multiple song_ids
      for (const [eamuse_id, songIds] of eamuseIdMap) {
        if (songIds.size > 1) {
          result.duplicate_eamuse_ids.push({
            eamuse_id,
            song_ids: Array.from(songIds),
          });
        }
      }
    }

    console.log('update-eamuse-ids: Update complete', {
      songs_updated: result.songs_updated,
      songs_not_found: result.songs_not_found.length,
      duplicates_found: result.duplicate_eamuse_ids.length,
      errors: result.errors.length,
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('update-eamuse-ids: Unexpected error', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
