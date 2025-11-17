import { HubRoute } from '@/components/admin/HubRoute';
import { HubCentralDashboard } from '@/components/admin/HubCentralDashboard';
import { Header } from '@/components/Header';
import SurveyForm from '@/components/SurveyForm';
import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Package, Megaphone, UserPlus } from 'lucide-react';

const HubCentral = () => {
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = searchParams.get('tab') || 'overview';

  const handleTabChange = (value: string) => {
    navigate(`/hubcentral?tab=${value}`);
  };

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'packages', label: 'Packages', icon: Package },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'team', label: 'Team', icon: UserPlus },
  ];

  return (
    <HubRoute>
      <div className="min-h-screen bg-background">
        <Header 
          onAssistantClick={() => {}} // Assistant is floating widget now
          onSurveyClick={() => setIsSurveyOpen(true)}
          showDashboardNav={true}
        />
        
        <main className="container mx-auto px-6 py-8">
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
              <HubCentralDashboard activeTab={currentTab} onTabChange={handleTabChange} />
            </div>
          </div>
        </main>
        
        <SurveyForm open={isSurveyOpen} onOpenChange={setIsSurveyOpen} />
      </div>
    </HubRoute>
  );
};

export default HubCentral;

