import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParsedScore {
  chart_id?: number | null;
  song_id?: number | null;
  name?: string | null;
  artist?: string | null;
  playstyle?: string | null;
  difficulty_name?: string | null;
  difficulty_level?: number | null;
  score?: number | null;
  timestamp?: string | null;
  username?: string | null;
  rank?: string | null;
  flare?: number | null;
  halo?: string | null;
  judgement_offset?: number | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await req.json();
    const { file_name, file_mime_type, file_size_bytes, raw_storage_path, content } = body;

    if (!content || !file_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Create upload record
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .insert({
        user_id: user.id,
        file_name,
        file_mime_type,
        file_size_bytes,
        raw_storage_path,
        parse_status: 'pending',
      })
      .select('id')
      .single();

    if (uploadError) {
      console.error('Upload insert error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to create upload record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uploadId = upload.id;

    // 2. Parse file content
    let parsedRows: ParsedScore[] = [];
    let parseError: string | null = null;

    try {
      // Try JSON first
      const trimmedContent = content.trim();
      if (trimmedContent.startsWith('[') || trimmedContent.startsWith('{')) {
        const jsonData = JSON.parse(trimmedContent);
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        parsedRows = dataArray.map((row: any) => ({
          chart_id: row.chart_id ?? row.chartId ?? null,
          song_id: row.song_id ?? row.songId ?? null,
          name: row.name ?? row.song_name ?? row.title ?? null,
          artist: row.artist ?? null,
          playstyle: row.playstyle ?? row.playStyle ?? null,
          difficulty_name: row.difficulty_name ?? row.difficultyName ?? row.difficulty ?? null,
          difficulty_level: row.difficulty_level ?? row.difficultyLevel ?? row.level ?? null,
          score: row.score ?? null,
          timestamp: row.timestamp ?? row.playedAt ?? row.played_at ?? null,
          username: row.username ?? row.user ?? null,
          rank: row.rank ?? row.grade ?? null,
          flare: row.flare ?? null,
          halo: row.halo ?? null,
          judgement_offset: row.judgement_offset ?? row.judgementOffset ?? null,
        }));
      } else {
        // Try CSV parsing
        const lines = content.split('\n').filter((line: string) => line.trim());
        if (lines.length > 1) {
          const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const row: any = {};
            headers.forEach((header: string, index: number) => {
              row[header] = values[index]?.trim() ?? null;
            });
            
            parsedRows.push({
              chart_id: parseInt(row.chart_id || row.chartid) || null,
              song_id: parseInt(row.song_id || row.songid) || null,
              name: row.name || row.song_name || row.title || null,
              artist: row.artist || null,
              playstyle: row.playstyle || null,
              difficulty_name: row.difficulty_name || row.difficulty || null,
              difficulty_level: parseInt(row.difficulty_level || row.level) || null,
              score: parseInt(row.score) || null,
              timestamp: row.timestamp || row.played_at || null,
              username: row.username || null,
              rank: row.rank || row.grade || null,
              flare: parseInt(row.flare) || null,
              halo: row.halo || null,
              judgement_offset: parseInt(row.judgement_offset) || null,
            });
          }
        }
      }
    } catch (err) {
      parseError = `Parse error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error('Parse error:', err);
    }

    // If parsing failed, update upload and return
    if (parseError || parsedRows.length === 0) {
      await supabase
        .from('uploads')
        .update({
          parse_status: 'failed',
          parse_error: parseError ?? 'No valid rows found in file',
        })
        .eq('id', uploadId);

      return new Response(JSON.stringify({
        error: parseError ?? 'No valid rows found in file',
        total_rows: 0,
        mapped_rows: 0,
        skipped_rows: 0,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Map rows to musicdb
    let mappedCount = 0;
    let skippedCount = 0;
    const scoresToInsert: any[] = [];

    for (const row of parsedRows) {
      let musicdbId: number | null = null;

      // Try to match by chart_id first
      if (row.chart_id) {
        const { data: match } = await supabase
          .from('musicdb')
          .select('id')
          .eq('chart_id', row.chart_id)
          .limit(1)
          .maybeSingle();
        
        if (match) musicdbId = match.id;
      }

      // If no match, try song_id + playstyle + difficulty
      if (!musicdbId && row.song_id) {
        let query = supabase
          .from('musicdb')
          .select('id')
          .eq('song_id', row.song_id);
        
        if (row.playstyle) query = query.eq('playstyle', row.playstyle);
        if (row.difficulty_name) query = query.eq('difficulty_name', row.difficulty_name);
        if (row.difficulty_level) query = query.eq('difficulty_level', row.difficulty_level);
        
        const { data: match } = await query.limit(1).maybeSingle();
        if (match) musicdbId = match.id;
      }

      // If still no match, try by name + artist + playstyle + difficulty
      if (!musicdbId && row.name) {
        let query = supabase
          .from('musicdb')
          .select('id')
          .ilike('name', row.name);
        
        if (row.artist) query = query.ilike('artist', row.artist);
        if (row.playstyle) query = query.eq('playstyle', row.playstyle);
        if (row.difficulty_name) query = query.eq('difficulty_name', row.difficulty_name);
        
        const { data: match } = await query.limit(1).maybeSingle();
        if (match) musicdbId = match.id;
      }

      // Insert score if we have a valid song_id (required field)
      if (row.song_id) {
        scoresToInsert.push({
          user_id: user.id,
          upload_id: uploadId,
          musicdb_id: musicdbId,
          chart_id: row.chart_id,
          song_id: row.song_id,
          playstyle: row.playstyle,
          difficulty_name: row.difficulty_name,
          difficulty_level: row.difficulty_level,
          score: row.score,
          timestamp: row.timestamp,
          username: row.username,
          rank: row.rank,
          flare: row.flare,
          halo: row.halo,
          judgement_offset: row.judgement_offset,
        });
        mappedCount++;
      } else {
        skippedCount++;
      }
    }

    // 4. Insert scores
    if (scoresToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('user_scores')
        .insert(scoresToInsert);

      if (insertError) {
        console.error('Score insert error:', insertError);
        await supabase
          .from('uploads')
          .update({
            parse_status: 'failed',
            parse_error: `Failed to insert scores: ${insertError.message}`,
          })
          .eq('id', uploadId);

        return new Response(JSON.stringify({
          error: `Failed to insert scores: ${insertError.message}`,
          total_rows: parsedRows.length,
          mapped_rows: 0,
          skipped_rows: parsedRows.length,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 5. Update upload record with summary
    await supabase
      .from('uploads')
      .update({
        parse_status: 'parsed',
        parse_summary: {
          total_rows: parsedRows.length,
          mapped_rows: mappedCount,
          skipped_rows: skippedCount,
        },
      })
      .eq('id', uploadId);

    return new Response(JSON.stringify({
      upload_id: uploadId,
      total_rows: parsedRows.length,
      mapped_rows: mappedCount,
      skipped_rows: skippedCount,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ 
      error: err instanceof Error ? err.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
