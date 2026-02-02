/**
 * Force-popup OAuth flow that bypasses cloud-auth-js's redirect path.
 *
 * The default library detects "isInIframe" by checking `window.self !== window.top`.
 * In Lovable's inline preview browser this returns false (treated as top window),
 * so it triggers a `location.href` redirect instead of a popup, causing a blank screen
 * when the SPA intercepts the route.
 *
 * This wrapper always uses a popup (with web_message response_mode) and listens for
 * the auth response via postMessage, then calls supabase.auth.setSession with the tokens.
 */

import { supabase } from "@/integrations/supabase/client";

const OAUTH_BROKER_URL = "/~oauth/initiate";
const SUPPORTED_ORIGINS = ["https://oauth.lovable.app"];
const EXPECTED_MESSAGE_TYPE = "authorization_response";

function generateState(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return [...crypto.getRandomValues(new Uint8Array(16))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getPopupDimensions() {
  const width = Math.min(500, window.screen.width * 0.8);
  const height = Math.min(600, window.screen.height * 0.8);
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  return { width, height, left, top };
}

export async function signInWithGooglePopup(redirectUri: string): Promise<{ error: Error | null }> {
  const state = generateState();
  const params = new URLSearchParams({
    provider: "google",
    redirect_uri: redirectUri,
    state,
    response_mode: "web_message",
  });

  const url = `${OAUTH_BROKER_URL}?${params.toString()}`;

  // Open popup
  const { width, height, left, top } = getPopupDimensions();
  const popup = window.open(url, "oauth", `width=${width},height=${height},left=${left},top=${top}`);

  if (!popup) {
    return { error: new Error("Popup was blocked. Please allow popups for this site.") };
  }

  // Listen for postMessage from broker
  const messagePromise = new Promise<{ error?: string; error_description?: string; state?: string; access_token?: string; refresh_token?: string }>((resolve) => {
    const handler = (e: MessageEvent) => {
      const isValidOrigin = SUPPORTED_ORIGINS.some((o) => e.origin === o);
      if (!isValidOrigin) return;
      const data = e.data;
      if (!data || typeof data !== "object") return;
      if (data.type !== EXPECTED_MESSAGE_TYPE) return;
      window.removeEventListener("message", handler);
      resolve(data.response);
    };
    window.addEventListener("message", handler);
  });

  // Poll for popup closed
  const popupClosedPromise = new Promise<never>((_, reject) => {
    const interval = setInterval(() => {
      if (popup.closed) {
        clearInterval(interval);
        reject(new Error("Sign in was cancelled"));
      }
    }, 500);
  });

  try {
    const data = await Promise.race([messagePromise, popupClosedPromise]);

    if (data.error) {
      if (data.error === "legacy_flow") {
        return { error: new Error("This flow is not supported in Preview mode. Please open the app in a new tab to sign in.") };
      }
      return { error: new Error(data.error_description ?? "Sign in failed") };
    }

    if (data.state !== state) {
      return { error: new Error("State mismatch — possible CSRF") };
    }

    if (!data.access_token || !data.refresh_token) {
      return { error: new Error("No tokens received from OAuth broker") };
    }

    // Set session in Supabase
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });

    if (sessionError) {
      return { error: sessionError };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  } finally {
    popup?.close();
  }
}
