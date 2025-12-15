import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/CustomAuthContext";
import { PublicationProvider } from "@/contexts/PublicationContext";
import { HubProvider } from "@/contexts/HubContext";
import { RootRedirect } from "./components/RootRedirect";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import HubCentral from "./pages/HubCentral";
import CampaignBuilder from "./pages/CampaignBuilder";
import CampaignList from "./pages/CampaignList";
import CampaignDetail from "./pages/CampaignDetail";
import AcceptInvitation from "./pages/AcceptInvitation";
import ResetPassword from "./pages/ResetPassword";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <HubProvider>
        <PublicationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/hubcentral" element={<HubCentral />} />
              <Route path="/campaigns" element={<CampaignList />} />
              <Route path="/campaigns/new" element={<CampaignBuilder />} />
              <Route path="/campaigns/:id" element={<CampaignDetail />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </PublicationProvider>
      </HubProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
