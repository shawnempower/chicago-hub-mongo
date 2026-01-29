import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/CustomAuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, ChevronDown, Globe, BookOpen } from "lucide-react";
import empowerLogo from "@/assets/empower-logo.png";
import { PublicationSelector } from "@/components/PublicationSelector";
import { HubSelector } from "@/components/HubSelector";
import { NotificationBell } from "@/components/NotificationBell";
import { MessageBell } from "@/components/MessageBell";

interface HeaderProps {
  onSurveyClick?: () => void;
  showDashboardNav?: boolean;
}

export function Header({ showDashboardNav = false }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminAuth();
  
  const firstName = user?.firstName || user?.email?.split('@')[0] || 'User';
  
  const isHubCentral = location.pathname === '/hubcentral';
  
  // Check if current page is hub-scoped (should show HubSelector)
  const isHubScopedPage = location.pathname === '/hubcentral' || 
                          location.pathname.startsWith('/campaigns') ||
                          location.pathname.startsWith('/packages');
  
  // Check if user has hub access (admin or has assigned hubs)
  const hasHubAccess = isAdmin || (user?.permissions?.assignedHubIds && user.permissions.assignedHubIds.length > 0);
  
  return (
    <header className="sticky top-0 z-40 backdrop-blur-[20px] border-b border-border" style={{ backgroundColor: 'hsl(42 30% 95% / 0.3)' }}>
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link to="/dashboard" className="hover:opacity-80 transition-opacity">
            <img 
              src={empowerLogo} 
              alt="Chicago Media Hub" 
              className="h-8 w-auto"
            />
          </Link>
          
          {showDashboardNav ? (
            /* Dashboard Navigation with Hubs/Publications Toggle and Selector */
            <div className="hidden md:flex items-center gap-3">
              {/* Toggle between Hubs and Publications */}
              {hasHubAccess && (
                <div 
                  className="flex items-center h-10 rounded-lg p-0.5 border"
                  style={{ backgroundColor: '#EDEAE1', borderColor: '#D4D1C7' }}
                >
                  <button
                    onClick={() => {
                      console.log('🔘 Hubs toggle clicked, navigating to /hubcentral');
                      navigate('/hubcentral');
                    }}
                    className={`flex items-center gap-1.5 px-3 h-9 rounded-md font-medium transition-all ${
                      isHubScopedPage 
                        ? 'bg-white border shadow-sm' 
                        : 'hover:bg-white/30'
                    }`}
                    style={{ 
                      fontSize: '14px',
                      color: isHubScopedPage ? '#1a1a1a' : '#6C685D',
                      borderColor: isHubScopedPage ? '#D4D1C7' : 'transparent'
                    }}
                  >
                    <Globe className="h-4 w-4" />
                    Hubs
                  </button>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className={`flex items-center gap-1.5 px-3 h-9 rounded-md font-medium transition-all ${
                      !isHubScopedPage 
                        ? 'bg-white border shadow-sm' 
                        : 'hover:bg-white/30'
                    }`}
                    style={{ 
                      fontSize: '14px',
                      color: !isHubScopedPage ? '#1a1a1a' : '#6C685D',
                      borderColor: !isHubScopedPage ? '#D4D1C7' : 'transparent'
                    }}
                  >
                    <BookOpen className="h-4 w-4" />
                    Publications
                  </button>
                </div>
              )}
              
              {/* Show appropriate selector based on current page */}
              {isHubScopedPage ? (
                <HubSelector />
              ) : (
                <PublicationSelector compact={true} />
              )}
            </div>
          ) : (
            /* Navigation when not in dashboard mode */
            <nav className="hidden md:flex items-center space-x-6 text-sm">
              {user && (
                <Link 
                  to="/dashboard" 
                  className={`transition-colors ${
                    location.pathname === '/dashboard' 
                      ? 'text-primary font-medium' 
                      : 'text-muted-foreground hover:text-primary'
                  }`}
                >
                  Dashboard
                </Link>
              )}
            </nav>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Message Bell - shows unread order messages */}
          {user && <MessageBell />}
          {/* Notification Bell - shows system notifications */}
          {user && <NotificationBell />}
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{firstName}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled className="font-medium">
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile">Account Settings</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">Admin Dashboard</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}