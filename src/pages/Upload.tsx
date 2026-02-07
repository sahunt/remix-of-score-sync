import { useState, useCallback, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/hooks/useAuth';
import { useLastUpload } from '@/hooks/useLastUpload';
import { useUploadInvalidation } from '@/hooks/useUploadInvalidation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ChangesSummary } from '@/components/upload/ChangesSummary';
import { UploadSteps } from '@/components/upload/UploadSteps';
import type { ScoreChange } from '@/components/upload/ScoreChangeRow';

type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface UnmatchedSong {
  name: string | null;
  difficulty: string | null;
  reason: string;
}

interface UploadResult {
  total_rows: number;
  mapped_rows: number;
  skipped_rows: number;
  inserted?: number;
  updated?: number;
  unchanged?: number;
  source_type?: string;
  unmatched_songs?: UnmatchedSong[];
  changes?: ScoreChange[];
}

export default function UploadPage() {
  const { user } = useAuth();
  const { refetch } = useLastUpload();
  const { invalidateAfterUpload } = useUploadInvalidation();
  const { toast } = useToast();
  const [state, setState] = useState<UploadState>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  // Poll for upload status
  const pollUploadStatus = useCallback(async (uploadId: string) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('uploads')
      .select('id, parse_status, parse_summary, parse_error')
      .eq('id', uploadId)
      .maybeSingle();
    
    if (error) {
      console.error('Poll error:', error);
      return;
    }
    
    if (!data) return;
    
    if (data.parse_status === 'parsed' && data.parse_summary) {
      // Success!
      const summary = data.parse_summary as any;
      const uploadResult: UploadResult = {
        total_rows: summary.total_rows ?? 0,
        mapped_rows: summary.mapped_rows ?? 0,
        skipped_rows: summary.skipped_rows ?? 0,
        inserted: summary.inserted,
        updated: summary.updated,
        unchanged: summary.unchanged,
        source_type: summary.source_type,
        unmatched_songs: summary.unmatched_songs,
        changes: summary.changes,
      };
      
      setResult(uploadResult);
      setState('success');
      setCurrentUploadId(null);
      
      // Play completion sound
      try {
        const audio = new Audio('/sounds/done.mp3');
        audio.currentTime = 0;
        audio.preload = 'auto';
        await new Promise<void>((resolve) => {
          audio.addEventListener('canplaythrough', () => {
            audio.play().catch(() => {});
            resolve();
          }, { once: true });
          // Fallback if already loaded
          if (audio.readyState >= 4) {
            audio.play().catch(() => {});
            resolve();
          }
        });
      } catch { /* ignore audio errors */ }
      
      // Clear polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      
      toast({
        title: 'Upload Complete',
        description: `Mapped ${uploadResult.mapped_rows} of ${uploadResult.total_rows} rows`,
      });
      
      // Invalidate all score-related caches after successful upload
      invalidateAfterUpload();
      await refetch();
    } else if (data.parse_status === 'failed') {
      // Failed
      setErrorMessage(data.parse_error || 'Processing failed');
      setState('error');
      setCurrentUploadId(null);
      
      // Clear polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: data.parse_error || 'An error occurred while processing your file',
      });
    }
    // If still 'processing' or 'pending', continue polling
  }, [user, toast, refetch, invalidateAfterUpload]);

  // Start polling when we have an upload ID
  useEffect(() => {
    if (currentUploadId && state === 'processing') {
      // Poll immediately
      pollUploadStatus(currentUploadId);
      
      // Then poll every 2 seconds
      pollIntervalRef.current = window.setInterval(() => {
        pollUploadStatus(currentUploadId);
      }, 2000);
      
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }
  }, [currentUploadId, state, pollUploadStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    if (!user) return;

    setState('uploading');
    setResult(null);
    setErrorMessage(null);
    setCurrentUploadId(null);

    try {
      // Ensure we have a fresh session before uploading
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Please log in again to upload files');
      }

      // 1. Upload raw file to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: storageError } = await supabase.storage
        .from('score-uploads')
        .upload(filePath, file);

      if (storageError) throw storageError;

      // 2. Read file content
      const content = await file.text();

      // 3. Call edge function to start processing
      const { data, error } = await supabase.functions.invoke('process-upload', {
        body: {
          file_name: file.name,
          file_mime_type: file.type,
          file_size_bytes: file.size,
          raw_storage_path: filePath,
          content,
        },
      });

      if (error) throw error;

      // Edge function returns immediately with upload_id and status: 'processing'
      if (data?.upload_id) {
        setCurrentUploadId(data.upload_id);
        setState('processing');
        toast({
          title: 'Processing Started',
          description: 'Your file is being processed. This may take a moment.',
        });
      } else {
        throw new Error('No upload ID received');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMessage(err.message ?? 'Failed to process upload');
      setState('error');
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: err.message ?? 'An error occurred while processing your file',
      });
    }
  }, [user, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const reset = () => {
    setState('idle');
    setResult(null);
    setErrorMessage(null);
    setCurrentUploadId(null);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader title="Upload" description="Import your score files" />

      <div className="mx-auto w-full max-w-2xl p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="upload" size={20} className="text-primary" />
              Import Scores
            </CardTitle>
            <CardDescription>
              Upload a JSON or CSV file containing your DDR scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state === 'idle' && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-secondary/20'
                )}
              >
                <Icon name="upload_file" size={40} className="mb-3 text-muted-foreground" />
                <p className="mb-1 font-medium">Drop your file here</p>
                <p className="mb-4 text-sm text-muted-foreground">or click to browse</p>
                <Button variant="outline" className="relative">
                  <label className="cursor-pointer">
                    Select File
                    <input
                      type="file"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      accept=".json,.csv,.txt"
                      onChange={handleFileChange}
                    />
                  </label>
                </Button>
              </div>
            )}

            {state === 'uploading' && (
              <div className="flex flex-col items-center justify-center py-12 gap-6">
                <UploadSteps currentStep="uploading" />
                <div>
                  <p className="font-medium text-center">Uploading file...</p>
                  <p className="text-sm text-muted-foreground text-center">Please wait</p>
                </div>
              </div>
            )}

            {state === 'processing' && (
              <div className="flex flex-col items-center justify-center py-12 gap-6">
                <UploadSteps currentStep="matching" />
                <div>
                  <p className="font-medium text-center">Processing your scores...</p>
                  <p className="text-sm text-muted-foreground text-center">Matching songs to catalog</p>
                </div>
              </div>
            )}

            {state === 'success' && result && (
              <div className="flex flex-col items-center py-8">
                <div className="mb-4 rounded-full bg-success/10 p-4">
                  <Icon name="check_circle" size={40} className="text-success" />
                </div>
                <p className="mb-2 font-medium">Upload Successful!</p>
                <div className="mb-4 grid grid-cols-3 gap-4 text-center text-sm">
                  <div className="rounded-lg bg-secondary/50 px-4 py-3">
                    <p className="text-lg font-bold">{result.total_rows}</p>
                    <p className="text-xs text-muted-foreground">Total Rows</p>
                  </div>
                  <div className="rounded-lg bg-success/10 px-4 py-3">
                    <p className="text-lg font-bold text-success">{result.mapped_rows}</p>
                    <p className="text-xs text-muted-foreground">Mapped</p>
                  </div>
                  <div className="rounded-lg bg-warning/10 px-4 py-3">
                    <p className="text-lg font-bold text-warning">{result.skipped_rows}</p>
                    <p className="text-xs text-muted-foreground">Skipped</p>
                  </div>
                </div>

                {/* Debug: Upsert breakdown */}
                {(result.inserted !== undefined || result.updated !== undefined) && (
                  <div className="mb-4 grid grid-cols-3 gap-4 text-center text-sm">
                    <div className="rounded-lg bg-primary/10 px-4 py-3">
                      <p className="text-lg font-bold text-primary">{result.inserted ?? 0}</p>
                      <p className="text-xs text-muted-foreground">New</p>
                    </div>
                    <div className="rounded-lg bg-accent/10 px-4 py-3">
                      <p className="text-lg font-bold text-accent">{result.updated ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Updated</p>
                    </div>
                    <div className="rounded-lg bg-muted px-4 py-3">
                      <p className="text-lg font-bold text-muted-foreground">{result.unchanged ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Unchanged</p>
                    </div>
                  </div>
                )}

                {result.source_type && (
                  <p className="mb-4 text-xs text-muted-foreground">
                    Source: <span className="font-mono text-foreground">{result.source_type}</span>
                  </p>
                )}

                {/* Changes summary - show individual score updates */}
                {result.changes && result.changes.length > 0 && (
                  <div className="mb-4 w-full">
                    <ChangesSummary changes={result.changes} />
                  </div>
                )}

                {/* Debug: Unmatched songs list */}
                {result.unmatched_songs && result.unmatched_songs.length > 0 && (
                  <div className="mb-4 w-full rounded-lg border border-warning/30 bg-warning/5 p-3">
                    <p className="mb-2 text-sm font-medium text-warning">
                      ⚠️ Skipped Songs ({result.unmatched_songs.length})
                    </p>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-warning/20 text-left text-muted-foreground">
                            <th className="pb-1 pr-2">Song</th>
                            <th className="pb-1 pr-2">Difficulty</th>
                            <th className="pb-1">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.unmatched_songs.map((song, idx) => (
                            <tr key={idx} className="border-b border-warning/10 last:border-0">
                              <td className="py-1 pr-2 font-mono">{song.name ?? '(no name)'}</td>
                              <td className="py-1 pr-2 font-mono">{song.difficulty ?? '-'}</td>
                              <td className="py-1">
                                <span className="rounded bg-warning/20 px-1 py-0.5 text-warning">
                                  {song.reason}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <Button onClick={reset}>Upload Another File</Button>
              </div>
            )}

            {state === 'error' && (
              <div className="flex flex-col items-center py-8">
                <div className="mb-4 rounded-full bg-destructive/10 p-4">
                  <Icon name="cancel" size={40} className="text-destructive" />
                </div>
                <p className="mb-2 font-medium">Upload Failed</p>
                {errorMessage && (
                  <p className="mb-4 text-center text-sm text-muted-foreground">{errorMessage}</p>
                )}
                <Button onClick={reset}>Try Again</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
