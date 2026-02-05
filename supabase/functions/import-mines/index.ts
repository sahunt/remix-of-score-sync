 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 };
 
 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
   console.log('import-mines: Starting import');
 
   try {
     const body = await req.json().catch(() => ({}));
     let csvContent = body.csvContent;
 
    // Support fetching from URL
    if (body.url && !csvContent) {
      console.log(`import-mines: Fetching CSV from URL: ${body.url}`);
      const response = await fetch(body.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV from URL: ${response.status}`);
      }
      csvContent = await response.text();
    }

     if (!csvContent || typeof csvContent !== 'string') {
       return new Response(
        JSON.stringify({ error: 'csvContent or url is required' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log(`import-mines: Parsing CSV of length ${csvContent.length}`);
 
     // Parse CSV
    // Handle both Windows (\r\n) and Unix (\n) line endings
    const lines = csvContent.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    console.log(`import-mines: Total lines: ${lines.length}, first line: "${lines[0]?.substring(0, 50)}"`);
    if (lines.length > 1) {
      console.log(`import-mines: Second line sample: "${lines[1]?.substring(0, 60)}"`);
    }
     const updates: { eamuse_id: string; mines: number }[] = [];
 
     for (let i = 1; i < lines.length; i++) {
       const line = lines[i].trim();
       if (!line) continue;
 
       const parts = line.split(',');
       if (parts.length < 2) continue;
 
       const eamuse_id = parts[0].trim();
       const mines = parseInt(parts[1].trim(), 10);
 
       // Skip rows with empty eamuse_id or invalid mines
       if (!eamuse_id || isNaN(mines)) continue;
 
       updates.push({ eamuse_id, mines });
     }
 
     console.log(`import-mines: Parsed ${updates.length} valid rows`);
 
     // Create Supabase client
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     // Batch update - process 100 at a time
     const BATCH_SIZE = 100;
     let totalUpdated = 0;
     let notFound: string[] = [];
 
     for (let i = 0; i < updates.length; i += BATCH_SIZE) {
       const batch = updates.slice(i, i + BATCH_SIZE);
 
       const updatePromises = batch.map(async ({ eamuse_id, mines }) => {
         const { data, error } = await supabase
           .from('chart_analysis')
           .update({ mines })
           .eq('eamuse_id', eamuse_id)
           .select('id');
 
         if (error) {
           console.error(`Error updating ${eamuse_id}: ${error.message}`);
           return 0;
         }
 
         if (!data || data.length === 0) {
           notFound.push(eamuse_id);
           return 0;
         }
 
         return data.length;
       });
 
       const counts = await Promise.all(updatePromises);
       totalUpdated += counts.reduce((sum, c) => sum + c, 0);
 
       console.log(`import-mines: Processed batch ${Math.floor(i / BATCH_SIZE) + 1}, total updated: ${totalUpdated}`);
     }
 
     console.log(`import-mines: Complete. Updated ${totalUpdated} charts, ${notFound.length} not found`);
 
     return new Response(
       JSON.stringify({
         success: true,
         charts_updated: totalUpdated,
         not_found_count: notFound.length,
       }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
 
   } catch (err) {
     const errorMessage = err instanceof Error ? err.message : 'Unknown error';
     console.error('import-mines: Error', errorMessage);
     return new Response(
       JSON.stringify({ error: errorMessage }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });