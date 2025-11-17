import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/CustomAuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, ChevronDown, Globe, BookOpen } from "lucide-react";
import empowerLogo from "@/assets/empower-logo.png";
import { PublicationSelector } from "@/components/PublicationSelector";
import { HubSelector } from "@/components/HubSelector";

interface HeaderProps {
  onAssistantClick: () => void;
  onSurveyClick: () => void;
  showDashboardNav?: boolean;
}

export function Header({ onAssistantClick, onSurveyClick, showDashboardNav = false }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminAuth();
  
  const firstName = user?.firstName || user?.email?.split('@')[0] || 'User';
  
  const isHubCentral = location.pathname === '/hubcentral';
  
  // Check if user has hub access (admin or has assigned hubs)
  const hasHubAccess = isAdmin || (user?.permissions?.assignedHubIds && user.permissions.assignedHubIds.length > 0);
  
  return (
    <header className="sticky top-0 z-40 backdrop-blur-[20px] border-b border-border" style={{ backgroundColor: 'hsl(42 30% 95% / 0.3)' }}>
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <img 
              src={empowerLogo} 
              alt="Chicago Media Hub" 
              className="h-8 w-auto"
            />
          </Link>
          
          {showDashboardNav ? (
            /* Dashboard Navigation with Hubs/Publications Button and Selector */
            <div className="hidden md:flex items-center gap-3">
              {isHubCentral ? (
                /* Publications Button and Hub Selector when on Hub Central */
                <>
                  <Button
                    onClick={() => navigate('/dashboard')}
                    variant="outline"
                    className="h-9 px-3 text-sm font-medium"
                  >
                    <BookOpen className="h-4 w-4 mr-1" />
                    Publications
                  </Button>
                  <HubSelector />
                </>
              ) : (
                /* Hubs Button and Publication Selector when NOT on Hub Central */
                <>
                  {hasHubAccess && (
                    <Button
                      onClick={() => {
                        console.log('🔘 Hubs button clicked, navigating to /hubcentral');
                        navigate('/hubcentral');
                      }}
                      variant="outline"
                      className="h-9 px-3 text-sm font-medium"
                    >
                      <Globe className="h-4 w-4 mr-1" />
                      Hubs
                    </Button>
                  )}
                  <PublicationSelector compact={true} />
                </>
              )}
            </div>
          ) : (
            /* Regular navigation for landing page */
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
              <Link 
                to="/partners" 
                className={`transition-colors ${
                  location.pathname === '/partners' 
                    ? 'text-primary font-medium' 
                    : 'text-muted-foreground hover:text-primary'
                }`}
              >
                Media Partners
              </Link>
              <Link 
                to="/packages" 
                className={`transition-colors ${
                  location.pathname === '/packages' 
                    ? 'text-primary font-medium' 
                    : 'text-muted-foreground hover:text-primary'
                }`}
              >
                Ad Packages
              </Link>
            </nav>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {!showDashboardNav && (
            <Button 
              variant="outline" 
              onClick={onSurveyClick}
              className="hidden sm:inline-flex"
            >
              Apply to Network
            </Button>
          )}
          
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
                  <Link to="/dashboard?tab=profile">Profile Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard?tab=saved">Saved Items</Link>
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