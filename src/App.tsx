import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef } from "react";
import { createBackup, getBackupSettings } from "@/lib/db";
import Index from "./pages/Index";
import Login from "./pages/Login";
import SetupAdmin from "./pages/SetupAdmin";
import Entry from "./pages/Entry";
import Visitors from "./pages/Visitors";
import Register from "./pages/Register";
import Residents from "./pages/Residents";
import ResidentExits from "./pages/ResidentExits";
import Fleet from "./pages/Fleet";
import History from "./pages/History";
import Backup from "./pages/Backup";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, needsSetup } = useAuth();
  
  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AutoBackupScheduler() {
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    async function setupBackup() {
      const settings = await getBackupSettings();
      if (!settings.enabled) return;

      // Clear existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Create initial backup
      await createBackup('auto');

      // Schedule recurring backups
      intervalRef.current = window.setInterval(async () => {
        const currentSettings = await getBackupSettings();
        if (currentSettings.enabled) {
          await createBackup('auto');
        }
      }, settings.intervalMinutes * 60 * 1000);
    }

    setupBackup();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return null;
}

function AppRoutes() {
  const { isAuthenticated, needsSetup, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <>
      <AutoBackupScheduler />
      <Routes>
        <Route path="/setup" element={needsSetup ? <SetupAdmin /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={needsSetup ? <Navigate to="/setup" replace /> : (isAuthenticated ? <Navigate to="/" replace /> : <Login />)} />
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/entrada" element={<ProtectedRoute><Entry /></ProtectedRoute>} />
        <Route path="/visitantes" element={<ProtectedRoute><Visitors /></ProtectedRoute>} />
        <Route path="/cadastro" element={<ProtectedRoute><Register /></ProtectedRoute>} />
        <Route path="/idosos" element={<ProtectedRoute><Residents /></ProtectedRoute>} />
        <Route path="/saidas-idosos" element={<ProtectedRoute><ResidentExits /></ProtectedRoute>} />
        <Route path="/frota" element={<ProtectedRoute><Fleet /></ProtectedRoute>} />
        <Route path="/historico" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/backup" element={<ProtectedRoute><Backup /></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
