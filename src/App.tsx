import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Entry from "./pages/Entry";
import Visitors from "./pages/Visitors";
import Register from "./pages/Register";
import Residents from "./pages/Residents";
import ResidentExits from "./pages/ResidentExits";
import Fleet from "./pages/Fleet";
import History from "./pages/History";
import Backup from "./pages/Backup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/entrada" element={<Entry />} />
          <Route path="/visitantes" element={<Visitors />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/idosos" element={<Residents />} />
          <Route path="/saidas-idosos" element={<ResidentExits />} />
          <Route path="/frota" element={<Fleet />} />
          <Route path="/historico" element={<History />} />
          <Route path="/backup" element={<Backup />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
