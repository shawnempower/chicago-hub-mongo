import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { AssistantModal } from "@/components/AssistantModal";
import SurveyForm from "@/components/SurveyForm";

import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { PublicationProfile } from "@/components/dashboard/PublicationProfile";
import { DashboardInventoryManager } from "@/components/dashboard/DashboardInventoryManager";
import { PublicationKnowledgeBase } from "@/components/dashboard/PublicationKnowledgeBase";
import { PublicationSettings } from "@/components/dashboard/PublicationSettings";
import { PublicationStorefront } from "@/components/dashboard/PublicationStorefront";
import { PublicationFullSummary } from "@/components/dashboard/PublicationFullSummary";
import { HubPricingReport } from "@/components/dashboard/HubPricingReport";
import { useAuth } from "@/contexts/CustomAuthContext";
import { Navigate, useSearchParams, useNavigate, Link } from "react-router-dom";
import { usePublication } from "@/contexts/PublicationContext";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  User, 
  Package, 
  BookOpen, 
  Settings, 
  Store, 
  FileText,
  DollarSign
} from "lucide-react";

// Main Dashboard Component
export default function Dashboard() {
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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'knowledgebase', label: 'Knowledge', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'storefront', label: 'Storefront', icon: Store },
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'hub-pricing', label: 'Hub Pricing', icon: DollarSign },
  ];

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'profile':
        return <PublicationProfile />;
      case 'inventory':
        return <DashboardInventoryManager />;
      case 'knowledgebase':
        return <PublicationKnowledgeBase />;
      case 'settings':
        return <PublicationSettings />;
      case 'storefront':
        return <PublicationStorefront />;
      case 'summary':
        return <PublicationFullSummary onBack={() => handleTabChange('dashboard')} />;
      case 'hub-pricing':
        return <HubPricingReport onBack={() => handleTabChange('dashboard')} />;
      default:
        return <DashboardOverview />;
    }
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
      <Header 
        onAssistantClick={handleAssistantClick} 
        onSurveyClick={() => setIsSurveyOpen(true)} 
        showDashboardNav={true}
      />
      
      <main className="container mx-auto px-6 py-8">
        {/* Publication-Specific Dashboard */}
        {selectedPublication ? (
          <div className="flex gap-6">
            {/* Vertical Left Navigation */}
            <aside className="w-24 flex-shrink-0">
              <nav className="p-2 sticky top-6">
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleTabChange(item.id)}
                        className={cn(
                          "w-full flex flex-col items-center gap-1 px-2 py-3 rounded-md transition-colors",
                          isActive
                            ? "bg-[#EDEAE1] font-bold"
                            : "hover:bg-[#E2E0D8] font-bold"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-[11px]">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
              <div className="space-y-6">
                {renderContent()}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">Select a Publication</h2>
            <p className="text-muted-foreground">
              Choose a publication from the dropdown in the navbar to view its dashboard and manage its content.
            </p>
          </div>
        )}
      </main>

      <AssistantModal 
        isOpen={isAssistantOpen}
        onClose={handleAssistantClose}
      />
      
      <SurveyForm open={isSurveyOpen} onOpenChange={setIsSurveyOpen} />
    </div>
  );
}