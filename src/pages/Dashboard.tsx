import { useState } from "react";
import { Header } from "@/components/Header";
import SurveyForm from "@/components/SurveyForm";

import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { PublicationProfile } from "@/components/dashboard/PublicationProfile";
import { DashboardInventoryManager } from "@/components/dashboard/DashboardInventoryManager";
import { PublicationSettings } from "@/components/dashboard/PublicationSettings";
import { PublicationLeads } from "@/components/dashboard/PublicationLeads";
import { PublicationStorefront } from "@/components/dashboard/PublicationStorefront";
import { PublicationFullSummary } from "@/components/dashboard/PublicationFullSummary";
import { PublicationOrders } from "@/components/dashboard/PublicationOrders";
import { PublicationOrderDetail } from "@/components/dashboard/PublicationOrderDetail";
import { PublicationEarnings } from "@/components/dashboard/PublicationEarnings";
import { MessagingInbox } from "@/components/messaging/MessagingInbox";
import { useAuth } from "@/contexts/CustomAuthContext";
import { Navigate, useSearchParams, useNavigate, Link } from "react-router-dom";
import { usePublication } from "@/contexts/PublicationContext";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Newspaper, 
  Package, 
  Settings, 
  Store, 
  FileText,
  Users,
  Mail,
  RefreshCw,
  DollarSign,
  MessageSquare
} from "lucide-react";

// Main Dashboard Component
export default function Dashboard() {
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { selectedPublication, availablePublications, loading: publicationLoading } = usePublication();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = searchParams.get('tab') || 'dashboard';

  const handleTabChange = (value: string) => {
    navigate(`/dashboard?tab=${value}`);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Publication', icon: Newspaper },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'orders', label: 'Orders', icon: FileText },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'storefront', label: 'Storefront', icon: Store },
  ];

  const renderContent = () => {
    // Only render the active tab component to prevent unnecessary mounting and data loading
    // This ensures components like PublicationStorefront only load data when the user navigates to that tab
    return (
      <>
        {currentTab === 'dashboard' && <DashboardOverview />}
        {currentTab === 'profile' && <PublicationProfile />}
        {currentTab === 'inventory' && <DashboardInventoryManager />}
        {currentTab === 'leads' && selectedPublication?.publicationId && <PublicationLeads publicationId={selectedPublication.publicationId.toString()} />}
        {currentTab === 'orders' && <PublicationOrders />}
        {currentTab === 'order-detail' && <PublicationOrderDetail />}
        {currentTab === 'earnings' && selectedPublication?.publicationId && <PublicationEarnings publicationId={selectedPublication.publicationId} />}
        {currentTab === 'settings' && <PublicationSettings />}
        {currentTab === 'messages' && <MessagingInbox userType="publication" hubIds={selectedPublication?.hubIds} />}
        {currentTab === 'storefront' && <PublicationStorefront />}
        {currentTab === 'summary' && <PublicationFullSummary onBack={() => handleTabChange('dashboard')} />}
        {!['dashboard', 'profile', 'inventory', 'leads', 'orders', 'order-detail', 'earnings', 'settings', 'messages', 'storefront', 'summary'].includes(currentTab) && <DashboardOverview />}
      </>
    );
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
                            ? "bg-muted/50 font-bold border-l-2 border-l-primary"
                            : "hover:bg-muted/50 font-bold"
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
          <div className="flex items-center justify-center py-12">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                {availablePublications.length > 0 ? (
                  <>
                    <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <CardTitle>Select a Publication</CardTitle>
                    <CardDescription>
                      Choose a publication from the dropdown in the navbar to view its dashboard and manage its content.
                    </CardDescription>
                  </>
                ) : (
                  <>
                    <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <CardTitle>No Publications Available</CardTitle>
                    <CardDescription>
                      You don't have access to any publications yet. If you were recently invited, your access may still be loading.
                    </CardDescription>
                  </>
                )}
              </CardHeader>
              {availablePublications.length === 0 && (
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium">What you can do:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Check your email for pending invitations</li>
                      <li>Contact your administrator for access</li>
                      <li>Try refreshing the page</li>
                    </ul>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Page
                  </Button>
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </main>
      
      <SurveyForm open={isSurveyOpen} onOpenChange={setIsSurveyOpen} />
    </div>
  );
}