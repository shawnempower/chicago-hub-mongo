import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AssistantModal } from "@/components/AssistantModal";
import SurveyForm from "@/components/SurveyForm";

import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { PublicationProfile } from "@/components/dashboard/PublicationProfile";
import { DashboardInventoryManager } from "@/components/dashboard/DashboardInventoryManager";
import { PublicationKnowledgeBase } from "@/components/dashboard/PublicationKnowledgeBase";
import { PublicationSettings } from "@/components/dashboard/PublicationSettings";
import { PublicationStorefront } from "@/components/dashboard/PublicationStorefront";
import { PublicationFullSummary } from "@/components/dashboard/PublicationFullSummary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/CustomAuthContext";
import { Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { PublicationProvider, usePublication } from "@/contexts/PublicationContext";
import { PublicationSelector } from "@/components/PublicationSelector";

// Internal Dashboard Component (wrapped by PublicationProvider)
function DashboardContent() {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { selectedPublication, loading: publicationLoading } = usePublication();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = searchParams.get('tab') || 'dashboard';

  useEffect(() => {
    // Listen for custom events to open assistant
    const handleOpenAssistant = () => setIsAssistantOpen(true);
    window.addEventListener('openAssistant', handleOpenAssistant);
    return () => window.removeEventListener('openAssistant', handleOpenAssistant);
  }, []);

  const handleAssistantClick = () => {
    setIsAssistantOpen(true);
  };

  const handleAssistantClose = () => {
    setIsAssistantOpen(false);
  };

  const handleTabChange = (value: string) => {
    navigate(`/dashboard?tab=${value}`);
  };

  if (authLoading || publicationLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onAssistantClick={handleAssistantClick} onSurveyClick={() => setIsSurveyOpen(true)} />
      
      <main className="container mx-auto px-6 py-8">
        {/* Publication Selector */}
        <div className="mb-8 p-4 bg-card border border-border rounded-lg">
          <PublicationSelector />
        </div>

        {/* Publication-Specific Dashboard */}
        {selectedPublication ? (
          <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="knowledgebase">Knowledgebase</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="storefront">Storefront</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <DashboardOverview />
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              <PublicationProfile />
            </TabsContent>

            <TabsContent value="inventory" className="space-y-6">
              <DashboardInventoryManager />
            </TabsContent>

            <TabsContent value="knowledgebase" className="space-y-6">
              <PublicationKnowledgeBase />
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <PublicationSettings />
            </TabsContent>

            <TabsContent value="storefront" className="space-y-6">
              <PublicationStorefront />
            </TabsContent>

            <TabsContent value="summary" className="space-y-6">
              <PublicationFullSummary onBack={() => handleTabChange('dashboard')} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">Select a Publication</h2>
            <p className="text-muted-foreground">
              Choose a publication from the dropdown above to view its dashboard and manage its content.
            </p>
          </div>
        )}
      </main>

      <Footer />

      <AssistantModal 
        isOpen={isAssistantOpen}
        onClose={handleAssistantClose}
      />
      
      <SurveyForm open={isSurveyOpen} onOpenChange={setIsSurveyOpen} />
    </div>
  );
}

// Main Dashboard Component with PublicationProvider
export default function Dashboard() {
  return (
    <PublicationProvider>
      <DashboardContent />
    </PublicationProvider>
  );
}