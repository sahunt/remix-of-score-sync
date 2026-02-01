import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface ImportResult {
  total_in_csv: number;
  rows_updated: number;
  invalid_rows: number;
  error?: string;
}

export default function AdminImportEra() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Fetch CSV from public folder with cache bust
      const csvResponse = await fetch(`/ddr_all_songs_era.csv?t=${Date.now()}`);
      if (!csvResponse.ok) {
        throw new Error(`Failed to load CSV file: ${csvResponse.status}`);
      }
      const csvContent = await csvResponse.text();

      // Send CSV content to edge function
      const { data, error: fnError } = await supabase.functions.invoke(
        "import-era",
        { body: { csvContent } }
      );

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data as ImportResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/home">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Import Era Data</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Bulk Update Era Values
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              This will update the <code>era</code> field in musicdb
              for all charts matching each eamuse_id. ~1,269 CSV entries will
              update ~10,000+ database rows in a single transaction.
            </p>

            <Button
              onClick={handleImport}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Importing..." : "Start Import"}
            </Button>

            {loading && (
              <div className="space-y-2">
                <Progress value={undefined} className="animate-pulse" />
                <p className="text-sm text-muted-foreground text-center">
                  Processing era data via bulk update...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">Import Failed</p>
              </div>
              <p className="text-sm mt-2">{error}</p>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <CheckCircle className="h-5 w-5" />
                Import Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Songs in CSV</p>
                  <p className="text-2xl font-bold">{result.total_in_csv}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">DB Rows Updated</p>
                  <p className="text-2xl font-bold text-primary">
                    {result.rows_updated}
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Each song in the CSV updated all chart rows sharing that
                eamuse_id (~7-8 charts per song on average).
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
