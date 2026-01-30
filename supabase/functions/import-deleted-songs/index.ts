import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CsvRow {
  eamuse_id: string;
  title: string;
  difficulty_level: number;
  difficulty_name: string;
  playstyle: string;
}

// Difficulty position mapping for chart_id generation
const DIFFICULTY_POSITION: Record<string, number> = {
  BEGINNER: 0,
  BASIC: 1,
  DIFFICULT: 2,
  EXPERT: 3,
  CHALLENGE: 4,
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse CSV from request body
    const { csvContent } = await req.json();
    
    if (!csvContent) {
      return new Response(
        JSON.stringify({ error: 'Missing csvContent in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse CSV rows
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
    
    const rows: CsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < 5) continue;
      
      rows.push({
        eamuse_id: values[0]?.trim() || '',
        title: values[1]?.trim() || '',
        difficulty_level: parseInt(values[2]?.trim() || '0', 10),
        difficulty_name: values[3]?.trim().toUpperCase() || '',
        playstyle: values[4]?.trim().toUpperCase() || 'SP',
      });
    }

    console.log(`Parsed ${rows.length} chart rows from CSV`);

    // Group rows by eamuse_id to identify unique songs
    const songsByEamuseId = new Map<string, CsvRow[]>();
    for (const row of rows) {
      if (!row.eamuse_id) continue;
      const existing = songsByEamuseId.get(row.eamuse_id) || [];
      existing.push(row);
      songsByEamuseId.set(row.eamuse_id, existing);
    }

    console.log(`Found ${songsByEamuseId.size} unique songs`);

    // Check which eamuse_ids already exist in musicdb
    const eamuseIds = Array.from(songsByEamuseId.keys());
    const { data: existingRows, error: checkError } = await supabase
      .from('musicdb')
      .select('eamuse_id, song_id')
      .in('eamuse_id', eamuseIds);

    if (checkError) {
      console.error('Error checking existing songs:', checkError);
      throw checkError;
    }

    // Build set of existing eamuse_ids and their song_ids
    const existingEamuseIds = new Set<string>();
    const existingSongIds = new Map<string, number>();
    for (const row of existingRows || []) {
      if (row.eamuse_id) {
        existingEamuseIds.add(row.eamuse_id);
        existingSongIds.set(row.eamuse_id, row.song_id);
      }
    }

    console.log(`Found ${existingEamuseIds.size} existing eamuse_ids in musicdb`);

    // Get max song_id for generating new IDs
    const { data: maxSongIdData, error: maxError } = await supabase
      .from('musicdb')
      .select('song_id')
      .order('song_id', { ascending: false })
      .limit(1)
      .single();

    if (maxError && maxError.code !== 'PGRST116') {
      console.error('Error getting max song_id:', maxError);
      throw maxError;
    }

    let nextSongId = (maxSongIdData?.song_id ?? 38886) + 1;
    console.log(`Next available song_id: ${nextSongId}`);

    // Prepare insert and update operations
    const rowsToInsert: Array<{
      song_id: number;
      chart_id: number;
      eamuse_id: string;
      name: string;
      difficulty_level: number;
      difficulty_name: string;
      playstyle: string;
      deleted: boolean;
    }> = [];

    const eamuseIdsToUpdate: string[] = [];

    for (const [eamuseId, charts] of songsByEamuseId) {
      if (existingEamuseIds.has(eamuseId)) {
        // Song exists - mark for update
        eamuseIdsToUpdate.push(eamuseId);
        console.log(`Will update existing song: ${eamuseId}`);
      } else {
        // New song - generate song_id and chart_ids
        const songId = nextSongId++;
        const title = charts[0]?.title || 'Unknown';

        for (const chart of charts) {
          const diffPos = DIFFICULTY_POSITION[chart.difficulty_name] ?? 0;
          const chartId = songId * 100 + diffPos;

          rowsToInsert.push({
            song_id: songId,
            chart_id: chartId,
            eamuse_id: eamuseId,
            name: title,
            difficulty_level: chart.difficulty_level,
            difficulty_name: chart.difficulty_name,
            playstyle: chart.playstyle,
            deleted: true, // Mark as deleted song
          });
        }

        console.log(`Will insert new song: ${eamuseId} (${title}) with song_id ${songId}, ${charts.length} charts`);
      }
    }

    // Update existing songs to set deleted = true
    let updatedCount = 0;
    if (eamuseIdsToUpdate.length > 0) {
      const { error: updateError, count } = await supabase
        .from('musicdb')
        .update({ deleted: true })
        .in('eamuse_id', eamuseIdsToUpdate);

      if (updateError) {
        console.error('Error updating existing songs:', updateError);
        throw updateError;
      }
      updatedCount = count || eamuseIdsToUpdate.length;
      console.log(`Updated ${updatedCount} existing rows to deleted = true`);
    }

    // Insert new songs
    let insertedCount = 0;
    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('musicdb')
        .insert(rowsToInsert);

      if (insertError) {
        console.error('Error inserting new songs:', insertError);
        throw insertError;
      }
      insertedCount = rowsToInsert.length;
      console.log(`Inserted ${insertedCount} new chart rows`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          csvRowsProcessed: rows.length,
          uniqueSongsFound: songsByEamuseId.size,
          existingSongsUpdated: eamuseIdsToUpdate.length,
          newChartsInserted: insertedCount,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in import-deleted-songs:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
