import { useState, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useLastUpload } from '@/hooks/useLastUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileUp, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface UploadResult {
  total_rows: number;
  mapped_rows: number;
  skipped_rows: number;
}

export default function UploadPage() {
  const { user } = useAuth();
  const { refetch } = useLastUpload();
  const { toast } = useToast();
  const [state, setState] = useState<UploadState>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUpload = useCallback(async (file: File) => {
    if (!user) return;

    setState('uploading');
    setResult(null);
    setErrorMessage(null);

    try {
      // 1. Upload raw file to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: storageError } = await supabase.storage
        .from('score-uploads')
        .upload(filePath, file);

      if (storageError) throw storageError;

      // 2. Read file content
      const content = await file.text();

      // 3. Call edge function to parse and process
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

      setResult({
        total_rows: data.total_rows ?? 0,
        mapped_rows: data.mapped_rows ?? 0,
        skipped_rows: data.skipped_rows ?? 0,
      });

      setState('success');
      toast({
        title: 'Upload Complete',
        description: `Mapped ${data.mapped_rows} of ${data.total_rows} rows`,
      });

      // Refresh last upload
      await refetch();
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
  }, [user, toast, refetch]);

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
  };

  return (
    <div className="flex flex-col">
      <PageHeader title="Upload" description="Import your score files" />

      <div className="mx-auto w-full max-w-2xl p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
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
                <FileUp className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="mb-1 font-medium">Drop your file here</p>
                <p className="mb-4 text-sm text-muted-foreground">or click to browse</p>
                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    Select File
                    <input
                      type="file"
                      className="hidden"
                      accept=".json,.csv,.txt"
                      onChange={handleFileChange}
                    />
                  </label>
                </Button>
              </div>
            )}

            {state === 'uploading' && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
                <p className="font-medium">Processing your file...</p>
                <p className="text-sm text-muted-foreground">This may take a moment</p>
              </div>
            )}

            {state === 'success' && result && (
              <div className="flex flex-col items-center py-8">
                <div className="mb-4 rounded-full bg-success/10 p-4">
                  <CheckCircle className="h-10 w-10 text-success" />
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
                <Button onClick={reset}>Upload Another File</Button>
              </div>
            )}

            {state === 'error' && (
              <div className="flex flex-col items-center py-8">
                <div className="mb-4 rounded-full bg-destructive/10 p-4">
                  <XCircle className="h-10 w-10 text-destructive" />
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
