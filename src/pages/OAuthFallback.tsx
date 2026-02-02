import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * If the app ever renders for /~oauth/*, the OAuth broker route was intercepted (often by a service worker/app-shell).
 * We try a one-time recovery by unregistering the service worker and reloading.
 */
export default function OAuthFallback() {
  const location = useLocation();

  useEffect(() => {
    const key = "oauth_recovery_attempted";
    const alreadyAttempted = sessionStorage.getItem(key) === "1";
    if (alreadyAttempted) return;

    const hasSW = typeof navigator !== "undefined" && "serviceWorker" in navigator;
    const isControlled = hasSW && !!navigator.serviceWorker.controller;
    if (!isControlled) return;

    sessionStorage.setItem(key, "1");

    (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } finally {
        window.location.reload();
      }
    })();
  }, []);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <section className="w-full max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Signing you in…</h1>
        <p className="text-sm text-muted-foreground">
          If you stay on this screen, your browser may be loading the app instead of the sign-in broker. We’ll try to
          recover automatically. If it still doesn’t continue, return to the app and try again.
        </p>

        <div className="rounded-lg border border-border bg-card p-3 text-left text-xs text-muted-foreground">
          <div className="font-mono break-all">{location.pathname + location.search}</div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button asChild>
            <Link to="/auth">Back to sign in</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
