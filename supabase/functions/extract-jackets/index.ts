import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import JSZip from 'https://esm.sh/jszip@3.10.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractResult {
  status: 'processing' | 'complete' | 'failed';
  total: number;
  uploaded: number;
  failed: number;
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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the zip path from request body
    const { zip_path } = await req.json();
    
    if (!zip_path) {
      return new Response(
        JSON.stringify({ error: 'zip_path is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting jacket extraction from: ${zip_path}`);

    // Download ZIP from score-uploads bucket
    const { data: zipData, error: downloadError } = await supabase.storage
      .from('score-uploads')
      .download(zip_path);

    if (downloadError || !zipData) {
      console.error('Failed to download ZIP:', downloadError);
      return new Response(
        JSON.stringify({ error: `Failed to download ZIP: ${downloadError?.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`ZIP downloaded, size: ${zipData.size} bytes`);

    // Parse the ZIP file
    const zip = await JSZip.loadAsync(await zipData.arrayBuffer());
    const fileNames = Object.keys(zip.files).filter(name => !zip.files[name].dir);
    
    console.log(`Found ${fileNames.length} files in ZIP`);

    const result: ExtractResult = {
      status: 'processing',
      total: fileNames.length,
      uploaded: 0,
      failed: 0,
      errors: [],
    };

    // Process files in batches of 50
    const BATCH_SIZE = 50;
    
    for (let i = 0; i < fileNames.length; i += BATCH_SIZE) {
      const batch = fileNames.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (fileName) => {
        try {
          const file = zip.files[fileName];
          const content = await file.async('uint8array');
          
          // Extract just the filename (remove any directory path)
          const baseName = fileName.split('/').pop() || fileName;
          
          // Upload to song-jackets bucket
          const { error: uploadError } = await supabase.storage
            .from('song-jackets')
            .upload(baseName, content, {
              contentType: 'image/png',
              upsert: true,
            });

          if (uploadError) {
            result.failed++;
            result.errors.push(`${baseName}: ${uploadError.message}`);
            console.error(`Failed to upload ${baseName}:`, uploadError.message);
          } else {
            result.uploaded++;
          }
        } catch (err) {
          result.failed++;
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          result.errors.push(`${fileName}: ${errMsg}`);
          console.error(`Error processing ${fileName}:`, errMsg);
        }
      }));

      console.log(`Progress: ${Math.min(i + BATCH_SIZE, fileNames.length)}/${fileNames.length} files processed`);
    }

    result.status = 'complete';
    
    // Only keep first 20 errors in response to avoid huge payloads
    if (result.errors.length > 20) {
      result.errors = [...result.errors.slice(0, 20), `... and ${result.errors.length - 20} more errors`];
    }

    console.log(`Extraction complete: ${result.uploaded} uploaded, ${result.failed} failed`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Extraction error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'failed' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
