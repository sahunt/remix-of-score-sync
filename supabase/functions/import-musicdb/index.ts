import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ChartRecord {
  song_id: number;
  chart_id: number;
  name: string;
  title_yomi: string | null;
  artist: string | null;
  bpm_max: number | null;
  series: number | null;
  eventno: number | null;
  basename: string | null;
  playstyle: string;
  difficulty_name: string;
  difficulty_level: number;
}

const DIFFICULTY_NAMES = ['BEGINNER', 'BASIC', 'DIFFICULT', 'EXPERT', 'CHALLENGE'];

function getTagContent(musicXml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i');
  const match = musicXml.match(regex);
  return match ? match[1].trim() : null;
}

function parseIntSafe(value: string | null): number | null {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('import-musicdb: Starting import process');

  try {
    // Parse request body - accept either content directly, a URL, or a storage path
    const body = await req.json().catch(() => ({}));
    let content = body.content;
    
    // If a URL is provided, fetch the content from there
    if (body.url && !content) {
      console.log(`import-musicdb: Fetching XML from URL: ${body.url}`);
      const response = await fetch(body.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch XML from URL: ${response.status}`);
      }
      content = await response.text();
    }
    
    // If a storage_path is provided, fetch from Supabase storage
    if (body.storage_path && !content) {
      console.log(`import-musicdb: Fetching XML from storage: ${body.storage_path}`);
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
      console.error('import-musicdb: No XML content provided');
      return new Response(
        JSON.stringify({ error: 'XML content is required. Provide "content", "url", or "storage_path" in the request body.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`import-musicdb: Received XML content of length ${content.length}`);
    console.log(`import-musicdb: First 500 chars: ${content.substring(0, 500)}`);

    // Create Supabase client with service role for bulk operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse XML using regex (DOMParser not available in Deno Deploy)
    const musicRegex = /<music>([\s\S]*?)<\/music>/g;
    const musicMatches = [...content.matchAll(musicRegex)];
    
    console.log(`import-musicdb: Found ${musicMatches.length} music elements`);
    
    if (musicMatches.length === 0) {
      console.error('import-musicdb: No <music> elements found in XML');
      return new Response(
        JSON.stringify({ error: 'No music elements found in XML. Content may not be valid XML.', content_preview: content.substring(0, 200) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const charts: ChartRecord[] = [];
    let songsProcessed = 0;
    let chartsSkipped = 0;

    // Process each music element
    for (let i = 0; i < musicMatches.length; i++) {
      const musicXml = musicMatches[i][1];
      
      const mcodeStr = getTagContent(musicXml, 'mcode');
      if (!mcodeStr) {
        console.warn(`import-musicdb: Skipping music element ${i} - no mcode`);
        continue;
      }
      
      const song_id = parseInt(mcodeStr, 10);
      if (isNaN(song_id)) {
        console.warn(`import-musicdb: Skipping music element ${i} - invalid mcode: ${mcodeStr}`);
        continue;
      }

      const name = getTagContent(musicXml, 'title') || '';
      const title_yomi = getTagContent(musicXml, 'title_yomi');
      const artist = getTagContent(musicXml, 'artist');
      const bpmmax = getTagContent(musicXml, 'bpmmax');
      const seriesStr = getTagContent(musicXml, 'series');
      const eventnoStr = getTagContent(musicXml, 'eventno');
      const basename = getTagContent(musicXml, 'basename');
      const diffLvStr = getTagContent(musicXml, 'diffLv');

      const bpm_max = parseIntSafe(bpmmax);
      const series = parseIntSafe(seriesStr);
      const eventno = parseIntSafe(eventnoStr);

      // Parse difficulty levels (10 space-separated values)
      const diffLevels = diffLvStr 
        ? diffLvStr.trim().split(/\s+/).map((v: string) => parseInt(v, 10))
        : [];

      // Create chart records for each position with level > 0
      for (let pos = 0; pos < 10; pos++) {
        const level = diffLevels[pos];
        
        if (!level || level <= 0) {
          chartsSkipped++;
          continue;
        }

        const playstyle = pos < 5 ? 'SP' : 'DP';
        const diffIndex = pos % 5;
        const difficulty_name = DIFFICULTY_NAMES[diffIndex];
        const chart_id = (song_id * 100) + pos;

        charts.push({
          song_id,
          chart_id,
          name,
          title_yomi,
          artist,
          bpm_max,
          series,
          eventno,
          basename,
          playstyle,
          difficulty_name,
          difficulty_level: level,
        });
      }

      songsProcessed++;
    }

    console.log(`import-musicdb: Processed ${songsProcessed} songs, generated ${charts.length} charts (${chartsSkipped} skipped)`);

    // Batch insert charts (500 at a time)
    const BATCH_SIZE = 500;
    let chartsInserted = 0;
    let insertErrors = 0;

    for (let i = 0; i < charts.length; i += BATCH_SIZE) {
      const batch = charts.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('musicdb')
        .upsert(batch, { 
          onConflict: 'song_id,playstyle,difficulty_name',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`import-musicdb: Batch insert error at ${i}: ${error.message}`);
        insertErrors++;
      } else {
        chartsInserted += batch.length;
        console.log(`import-musicdb: Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}, total: ${chartsInserted}`);
      }
    }

    const result = {
      songs_processed: songsProcessed,
      charts_generated: charts.length,
      charts_inserted: chartsInserted,
      charts_skipped: chartsSkipped,
      insert_errors: insertErrors,
    };

    console.log('import-musicdb: Import complete', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('import-musicdb: Unexpected error', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
