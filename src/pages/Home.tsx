import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/hooks/useAuth';
import { useLastUpload } from '@/hooks/useLastUpload';
import { supabase } from '@/integrations/supabase/client';

export default function Home() {
  const { user, signOut } = useAuth();
  const { lastUpload } = useLastUpload();
  const [totalScores, setTotalScores] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        const { count, error } = await supabase
          .from('user_scores')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (error) throw error;
        setTotalScores(count ?? 0);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [user]);

  const getStatusIcon = () => {
    if (!lastUpload) return <Icon name="schedule" size={20} className="text-muted-foreground" />;
    if (lastUpload.parse_status === 'parsed') return <Icon name="check_circle" size={20} className="text-success" />;
    if (lastUpload.parse_status === 'failed') return <Icon name="cancel" size={20} className="text-destructive" />;
    return <Icon name="schedule" size={20} className="text-warning animate-pulse" />;
  };

  const getStatusText = () => {
    if (!lastUpload) return 'No uploads yet';
    if (lastUpload.parse_status === 'parsed') {
      const summary = lastUpload.parse_summary;
      if (summary) {
        return `${summary.mapped_rows ?? 0} rows mapped`;
      }
      return 'Successfully parsed';
    }
    if (lastUpload.parse_status === 'failed') return 'Parse failed';
    return 'Processing...';
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Home"
        description={`Welcome back${user?.email ? ', ' + user.email.split('@')[0] : ''}`}
        actions={
          <Button variant="ghost" size="icon" onClick={signOut}>
            <Icon name="logout" size={20} />
          </Button>
        }
      />

      <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
        {/* Hero card */}
        <Card className="border-primary/20 bg-gradient-surface glow-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Icon name="music_note" size={24} className="text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">DDR Score Tracker</CardTitle>
                <CardDescription>Track and analyze your dance game scores</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-secondary/50 p-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {loadingStats ? '...' : totalScores.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Total Scores</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{getStatusText()}</p>
                    <p className="text-xs text-muted-foreground">Last Upload</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/upload" className="block">
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-secondary/30">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Icon name="upload" size={20} className="text-primary" />
                </div>
                <div>
                  <p className="font-medium">Upload Scores</p>
                  <p className="text-sm text-muted-foreground">Import a new score file</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/scores" className="block">
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-secondary/30">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-accent/10 p-3">
                  <Icon name="music_note" size={20} className="text-accent" />
                </div>
                <div>
                  <p className="font-medium">View Scores</p>
                  <p className="text-sm text-muted-foreground">Browse all your scores</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Last upload summary */}
        {lastUpload && lastUpload.parse_status === 'parsed' && lastUpload.parse_summary && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Last Import Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">File:</span>
                <span className="font-medium truncate ml-2">{lastUpload.file_name}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded bg-secondary/50 py-2">
                  <p className="font-semibold">{lastUpload.parse_summary.total_rows ?? 0}</p>
                  <p className="text-muted-foreground">Total</p>
                </div>
                <div className="rounded bg-success/10 py-2">
                  <p className="font-semibold text-success">{lastUpload.parse_summary.mapped_rows ?? 0}</p>
                  <p className="text-muted-foreground">Mapped</p>
                </div>
                <div className="rounded bg-warning/10 py-2">
                  <p className="font-semibold text-warning">{lastUpload.parse_summary.skipped_rows ?? 0}</p>
                  <p className="text-muted-foreground">Skipped</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
