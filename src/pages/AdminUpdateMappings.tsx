import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";

interface BatchResult {
  batch: string;
  songs_updated: number;
  songs_not_found: string[];
  errors: string[];
}

export default function AdminUpdateMappings() {
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [currentBatch, setCurrentBatch] = useState("");
  const [totalUpdated, setTotalUpdated] = useState(0);

  const processAllBatches = async () => {
    setProcessing(true);
    setResults([]);
    setTotalUpdated(0);

    try {
      // Fetch the ZIP file
      const response = await fetch("/eamuse-mappings.zip");
      const zipData = await response.arrayBuffer();
      const zip = await JSZip.loadAsync(zipData);

      // Get all CSV files sorted
      const csvFiles = Object.keys(zip.files)
        .filter((name) => name.endsWith(".csv"))
        .sort();

      console.log(`Found ${csvFiles.length} CSV files:`, csvFiles);

      let cumulative = 0;

      for (const fileName of csvFiles) {
        setCurrentBatch(fileName);

        // Extract CSV content
        const csvContent = await zip.files[fileName].async("string");
        console.log(`Processing ${fileName}, content length: ${csvContent.length}`);

        // Call the edge function
        const { data, error } = await supabase.functions.invoke("update-eamuse-ids", {
          body: { content: csvContent },
        });

        if (error) {
          console.error(`Error processing ${fileName}:`, error);
          setResults((prev) => [
            ...prev,
            {
              batch: fileName,
              songs_updated: 0,
              songs_not_found: [],
              errors: [error.message],
            },
          ]);
          continue;
        }

        console.log(`Result for ${fileName}:`, data);
        cumulative += data.songs_updated || 0;

        setResults((prev) => [
          ...prev,
          {
            batch: fileName,
            songs_updated: data.songs_updated || 0,
            songs_not_found: data.songs_not_found || [],
            errors: data.errors || [],
          },
        ]);
        setTotalUpdated(cumulative);
      }

      setCurrentBatch("");
    } catch (err) {
      console.error("Error processing batches:", err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Update eamuse_id Mappings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              This will process 14 CSV batch files and update the musicdb table
              with eamuse_id mappings based on song_id.
            </p>
            <p className="text-sm">
              <strong>Success criteria:</strong> 1,376 unique songs updated
            </p>

            <Button onClick={processAllBatches} disabled={processing}>
              {processing ? `Processing ${currentBatch}...` : "Start Batch Update"}
            </Button>

            {totalUpdated > 0 && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-lg font-semibold">
                  Total Songs Updated: {totalUpdated}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Batch Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className="p-3 border rounded-lg space-y-1"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{result.batch}</span>
                      <span className="text-green-600">
                        +{result.songs_updated} updated
                      </span>
                    </div>
                    {result.songs_not_found.length > 0 && (
                      <p className="text-sm text-amber-600">
                        Not found: {result.songs_not_found.length} song IDs
                      </p>
                    )}
                    {result.errors.length > 0 && (
                      <p className="text-sm text-red-600">
                        Errors: {result.errors.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
