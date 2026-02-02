import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const hostname = window.location.hostname;
    const origin = window.location.origin;
    const isCustomDomain =
      !hostname.includes("lovable.app") && !hostname.includes("lovableproject.com");

    console.info("[auth] google oauth start", { hostname, origin, isCustomDomain });

    if (isCustomDomain) {
      // Bypass auth-bridge for custom domains to avoid desktop 403 and /~oauth/* SPA fallbacks
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: origin,
          skipBrowserRedirect: true,
        },
      });

      if (error) return { error: error as Error };

      const url = data?.url;
      console.info("[auth] google oauth url", { url });
      if (!url) return { error: new Error("OAuth did not return a redirect URL") };

      // Security: only allow redirects to our auth host (prevents open-redirect issues)
      const allowedHost = new URL(import.meta.env.VITE_SUPABASE_URL).hostname;
      const oauthHost = new URL(url).hostname;
      if (oauthHost !== allowedHost) {
        return { error: new Error("Invalid OAuth redirect URL") };
      }

      window.location.assign(url);
      return { error: null };
    }

    // lovable.app / lovableproject.com: use the managed broker
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: origin,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
