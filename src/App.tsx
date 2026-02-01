import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SupabaseAuthProvider, useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Entry from "./pages/Entry";
import Visitors from "./pages/Visitors";
import Register from "./pages/Register";
import Residents from "./pages/Residents";
import ResidentExits from "./pages/ResidentExits";
import WeekendExits from "./pages/WeekendExits";
import Fleet from "./pages/Fleet";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/AuditLogs";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useSupabaseAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useSupabaseAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <Routes>
      <Route path="/auth" element={isAuthenticated ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/entrada" element={<ProtectedRoute><Entry /></ProtectedRoute>} />
      <Route path="/visitantes" element={<ProtectedRoute><Visitors /></ProtectedRoute>} />
      <Route path="/cadastro" element={<ProtectedRoute><Register /></ProtectedRoute>} />
      <Route path="/idosos" element={<ProtectedRoute><Residents /></ProtectedRoute>} />
      <Route path="/saidas-idosos" element={<ProtectedRoute><ResidentExits /></ProtectedRoute>} />
      <Route path="/saidas-fim-semana" element={<ProtectedRoute><WeekendExits /></ProtectedRoute>} />
      <Route path="/frota" element={<ProtectedRoute><Fleet /></ProtectedRoute>} />
      <Route path="/historico" element={<ProtectedRoute><History /></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/auditoria" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SupabaseAuthProvider>
          <AppRoutes />
        </SupabaseAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
