import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LastUploadProvider } from "@/hooks/useLastUpload";
import { TwelveMSModeProvider } from "@/hooks/use12MSMode";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Scores from "./pages/Scores";
import Upload from "./pages/Upload";
import GoalDetail from "./pages/GoalDetail";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import OAuthFallback from "./pages/OAuthFallback";
import Edi from "./pages/Edi";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,              // Check freshness on mount
      gcTime: 5 * 60 * 1000,     // 5 minutes garbage collection
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <LastUploadProvider>
            <TwelveMSModeProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                {/* OAuth broker routes should never render the SPA, but if they do, show a safe fallback */}
                <Route path="/~oauth/*" element={<OAuthFallback />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/home" element={<Home />} />
                  <Route path="/scores" element={<Scores />} />
                  <Route path="/upload" element={<Upload />} />
                  <Route path="/goal/:goalId" element={<GoalDetail />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/edi" element={<Edi />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TwelveMSModeProvider>
          </LastUploadProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
