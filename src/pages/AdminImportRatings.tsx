import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface ImportResult {
  total_in_csv: number;
  charts_updated: number;
  not_found: string[];
  errors: string[];
}

export default function AdminImportRatings() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Fetch CSV from public folder
      const csvResponse = await fetch("/sanbai_difficulty_ratings.csv");
      if (!csvResponse.ok) {
        throw new Error(`Failed to load CSV file: ${csvResponse.status}`);
      }
      const csvContent = await csvResponse.text();

      // Send CSV content to edge function
      const { data, error: fnError } = await supabase.functions.invoke(
        "import-sanbai-ratings",
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

  const matchRate = result
    ? ((result.charts_updated / result.total_in_csv) * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/home">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Import Sanbai Ratings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Difficulty Ratings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              This will import difficulty ratings from the Sanbai CSV file and
              update the musicdb table. Only SP charts with matching eamuse_id
              and difficulty_name will be updated.
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
                  Processing 5,671 ratings in batches...
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
                  <p className="text-muted-foreground">Total in CSV</p>
                  <p className="text-2xl font-bold">{result.total_in_csv}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Charts Updated</p>
                  <p className="text-2xl font-bold text-primary">
                    {result.charts_updated}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Not Found</p>
                  <p className="text-2xl font-bold text-amber-500">
                    {result.not_found.length}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Match Rate</p>
                  <p className="text-2xl font-bold">{matchRate}%</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div>
                  <p className="font-medium text-destructive mb-2">
                    Errors ({result.errors.length}):
                  </p>
                  <div className="max-h-40 overflow-y-auto bg-muted p-2 rounded text-xs">
                    {result.errors.slice(0, 20).map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                    {result.errors.length > 20 && (
                      <p className="text-muted-foreground">
                        ...and {result.errors.length - 20} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {result.not_found.length > 0 && (
                <div>
                  <p className="font-medium text-amber-500 mb-2">
                    Not Found ({result.not_found.length}):
                  </p>
                  <div className="max-h-40 overflow-y-auto bg-muted p-2 rounded text-xs font-mono">
                    {result.not_found.slice(0, 50).map((id, i) => (
                      <p key={i}>{id}</p>
                    ))}
                    {result.not_found.length > 50 && (
                      <p className="text-muted-foreground">
                        ...and {result.not_found.length - 50} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
