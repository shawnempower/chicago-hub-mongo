import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/CustomAuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, ChevronDown } from "lucide-react";
import empowerLogo from "@/assets/empower-logo.svg";
import { PublicationSelector } from "@/components/PublicationSelector";
import { usePublication } from "@/contexts/PublicationContext";
import { getPublicationBrandColor } from "@/config/publicationBrandColors";
import { useState, useEffect } from "react";

interface HeaderProps {
  onAssistantClick: () => void;
  onSurveyClick: () => void;
  showDashboardNav?: boolean;
}

export function Header({ onAssistantClick, onSurveyClick, showDashboardNav = false }: HeaderProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminAuth();
  const { selectedPublication } = usePublication();
  const [, forceRender] = useState(0);
  
  const firstName = user?.firstName || user?.email?.split('@')[0] || 'User';
  
  // Get brand color for assistant button from storefront configuration
  const assistantButtonColor = selectedPublication 
    ? getPublicationBrandColor(selectedPublication.publicationId)
    : '#0066cc';
  
  // Force re-render when publication changes to pick up newly loaded colors
  useEffect(() => {
    if (selectedPublication?.publicationId) {
      // Small delay to allow color to be fetched
      const timer = setTimeout(() => forceRender(prev => prev + 1), 100);
      return () => clearTimeout(timer);
    }
  }, [selectedPublication?.publicationId]);
  
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
            /* Compact Publication Selector for Dashboard */
            <div className="hidden md:block">
              <PublicationSelector compact={true} />
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
          <Button 
            onClick={onAssistantClick}
            className="relative text-white font-medium shadow-md transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: assistantButtonColor }}
          >
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: assistantButtonColor, filter: 'brightness(1.2)' }}></div>
            Assistant
          </Button>
          
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