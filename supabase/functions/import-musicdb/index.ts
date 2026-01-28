import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

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

function getTextContent(element: Element, tagName: string): string | null {
  const child = element.getElementsByTagName(tagName)[0];
  return child ? child.textContent : null;
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
    // Parse request body
    const { content } = await req.json();
    
    if (!content || typeof content !== 'string') {
      console.error('import-musicdb: No XML content provided');
      return new Response(
        JSON.stringify({ error: 'XML content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`import-musicdb: Received XML content of length ${content.length}`);

    // Create Supabase client with service role for bulk operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse XML using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');
    
    if (!doc) {
      console.error('import-musicdb: Failed to parse XML');
      return new Response(
        JSON.stringify({ error: 'Failed to parse XML' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const musicElements = doc.getElementsByTagName('music');
    console.log(`import-musicdb: Found ${musicElements.length} music elements`);

    const charts: ChartRecord[] = [];
    let songsProcessed = 0;
    let chartsSkipped = 0;

    // Process each music element
    for (let i = 0; i < musicElements.length; i++) {
      const music = musicElements[i] as Element;
      
      const mcodeStr = getTextContent(music, 'mcode');
      if (!mcodeStr) {
        console.warn(`import-musicdb: Skipping music element ${i} - no mcode`);
        continue;
      }
      
      const song_id = parseInt(mcodeStr, 10);
      if (isNaN(song_id)) {
        console.warn(`import-musicdb: Skipping music element ${i} - invalid mcode: ${mcodeStr}`);
        continue;
      }

      const name = getTextContent(music, 'title') || '';
      const title_yomi = getTextContent(music, 'title_yomi');
      const artist = getTextContent(music, 'artist');
      const bpmmax = getTextContent(music, 'bpmmax');
      const seriesStr = getTextContent(music, 'series');
      const eventnoStr = getTextContent(music, 'eventno');
      const basename = getTextContent(music, 'basename');
      const diffLvStr = getTextContent(music, 'diffLv');

      const bpm_max = parseIntSafe(bpmmax);
      const series = parseIntSafe(seriesStr);
      const eventno = parseIntSafe(eventnoStr);

      // Parse difficulty levels (10 space-separated values)
      const diffLevels = diffLvStr 
        ? diffLvStr.trim().split(/\s+/).map(v => parseInt(v, 10))
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
