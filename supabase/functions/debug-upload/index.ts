import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the file path from query params
    const url = new URL(req.url);
    const filePath = url.searchParams.get('path') || 'b655ea2e-8354-4866-871e-8aafa56bd7d5/1769605410105_phaseii_export_games_ddr_scores_598_1769602541.json';

    // Download the file from storage
    const { data, error } = await supabase.storage
      .from('score-uploads')
      .download(filePath);

    if (error) {
      console.error('Download error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read as text
    const content = await data.text();
    console.log('File size:', content.length, 'bytes');
    
    // Log first 2000 chars to see the structure
    console.log('=== FILE START (first 2000 chars) ===');
    console.log(content.substring(0, 2000));
    console.log('=== END FILE START ===');
    
    // Find the problem area around position 83844
    const problemStart = Math.max(0, 83800);
    const problemEnd = Math.min(content.length, 83900);
    console.log('=== PROBLEM AREA (chars 83800-83900) ===');
    console.log(content.substring(problemStart, problemEnd));
    
    // Log char codes around the problem
    console.log('=== CHAR CODES around position 83844 ===');
    for (let i = 83840; i < 83850 && i < content.length; i++) {
      console.log(`Position ${i}: char '${content[i]}' code ${content.charCodeAt(i)}`);
    }
    console.log('=== END CHAR CODES ===');

    // Try to find all control characters
    const controlChars: { pos: number; code: number; char: string }[] = [];
    for (let i = 0; i < content.length; i++) {
      const code = content.charCodeAt(i);
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
        controlChars.push({ pos: i, code, char: content[i] });
      }
    }
    console.log('Found', controlChars.length, 'control characters');
    console.log('First 20 control chars:', controlChars.slice(0, 20));

    // Try parsing after aggressive sanitization
    let sanitized = content;
    // Replace ALL control characters with empty string
    for (let i = 0; i < 32; i++) {
      if (i !== 9 && i !== 10 && i !== 13) {
        sanitized = sanitized.split(String.fromCharCode(i)).join('');
      }
    }
    
    let parsed;
    let parseError = null;
    try {
      parsed = JSON.parse(sanitized);
      console.log('JSON parsed successfully after sanitization!');
      console.log('Type:', Array.isArray(parsed) ? 'array' : typeof parsed);
      console.log('Length/Keys:', Array.isArray(parsed) ? parsed.length : Object.keys(parsed));
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log('First item:', JSON.stringify(parsed[0], null, 2));
      } else if (typeof parsed === 'object' && parsed !== null) {
        const keys = Object.keys(parsed);
        console.log('Top-level keys:', keys);
        for (const key of keys.slice(0, 3)) {
          const val = parsed[key];
          console.log(`Key "${key}":`, typeof val, Array.isArray(val) ? `array[${val.length}]` : '');
          if (Array.isArray(val) && val.length > 0) {
            console.log(`First item of "${key}":`, JSON.stringify(val[0], null, 2));
          }
        }
      }
    } catch (e) {
      parseError = e instanceof Error ? e.message : String(e);
      console.error('Parse still failed:', parseError);
    }

    return new Response(JSON.stringify({
      fileSize: content.length,
      controlCharCount: controlChars.length,
      controlCharsFirst20: controlChars.slice(0, 20),
      parseSuccess: parsed !== undefined,
      parseError,
      firstChars: content.substring(0, 500),
      structure: parsed ? (Array.isArray(parsed) ? { type: 'array', length: parsed.length, firstItem: parsed[0] } : { type: 'object', keys: Object.keys(parsed) }) : null,
    }, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
