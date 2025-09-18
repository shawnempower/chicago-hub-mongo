import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, ChevronDown } from "lucide-react";

interface HeaderProps {
  onAssistantClick?: () => void;
  isChatOpen?: boolean;
}

export function Header({ onAssistantClick = () => {}, isChatOpen = false }: HeaderProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  
  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User';
  
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <h1 className="text-xl font-bold text-primary font-serif">
              Chicago Media Hub
            </h1>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
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
        </div>
        
        <div className="flex items-center space-x-4">
          <Button 
            variant={isChatOpen ? "default" : "assistant"} 
            onClick={onAssistantClick}
            className="relative"
          >
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
              isChatOpen ? 'bg-primary' : 'bg-success animate-pulse'
            }`}></div>
            {isChatOpen ? '💬 Chat Open' : '🟢 Assistant Available'}
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