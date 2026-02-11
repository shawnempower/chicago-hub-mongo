import { HubRoute } from '@/components/admin/HubRoute';
import { HubCentralDashboard } from '@/components/admin/HubCentralDashboard';
import { Header } from '@/components/Header';
import SurveyForm from '@/components/SurveyForm';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Package, Megaphone, UserPlus, DollarSign, Bot, FileText, Wallet, MessageSquare } from 'lucide-react';
import { useHubContext } from '@/contexts/HubContext';
import { messagesApi } from '@/api/messages';

const HubCentral = () => {
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = searchParams.get('tab') || 'overview';
  const { selectedHubId } = useHubContext();
  const [unreadMessages, setUnreadMessages] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const count = await messagesApi.getUnreadCount(selectedHubId);
      setUnreadMessages(count);
    } catch {
      // silently ignore
    }
  }, [selectedHubId]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const handleTabChange = (value: string) => {
    navigate(`/hubcentral?tab=${value}`);
  };

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'packages', label: 'Packages', icon: Package },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone, isLink: true, href: '/campaigns' },
    { id: 'orders', label: 'Orders', icon: FileText },
    { id: 'payouts', label: 'Payouts', icon: Wallet },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'inventory-chat', label: 'AI Chat', icon: Bot },
    { id: 'team', label: 'Team', icon: UserPlus },
  ];

  return (
    <HubRoute>
      <div className="min-h-screen bg-background">
        <Header 
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
                    // Treat 'order-detail' as part of 'orders' section
                    const isActive = currentTab === item.id || 
                      (item.id === 'orders' && currentTab === 'order-detail');
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => item.isLink ? navigate(item.href!) : handleTabChange(item.id)}
                        className={cn(
                          "w-full flex flex-col items-center gap-1 px-2 py-3 rounded-md transition-colors relative",
                          isActive
                            ? "bg-muted/50 font-bold border-l-2 border-l-primary"
                            : "hover:bg-muted/50 font-bold"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-[11px]">{item.label}</span>
                        {item.id === 'messages' && unreadMessages > 0 && (
                          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
                            {unreadMessages > 9 ? '9+' : unreadMessages}
                          </span>
                        )}
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

