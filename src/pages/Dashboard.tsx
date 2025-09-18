import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AssistantModal } from "@/components/AssistantModal";

import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { ProfileManager } from "@/components/dashboard/ProfileManager";
import { SavedItemsOverview } from "@/components/dashboard/SavedItemsOverview";
import { ConversationHistory } from "@/components/dashboard/ConversationHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useSearchParams } from "react-router-dom";

export default function Dashboard() {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'overview';

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

  if (loading) {
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
      <Header onAssistantClick={handleAssistantClick} />
      
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="saved">Saved Items</TabsTrigger>
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <DashboardOverview />
          </TabsContent>

          <TabsContent value="saved" className="space-y-6">
            <SavedItemsOverview />
          </TabsContent>

          <TabsContent value="conversations" className="space-y-6">
            <ConversationHistory />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <ProfileManager />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />


      <AssistantModal 
        isOpen={isAssistantOpen}
        onClose={handleAssistantClose}
      />
    </div>
  );
}