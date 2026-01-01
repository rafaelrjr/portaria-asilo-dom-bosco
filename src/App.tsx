import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
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
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
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
