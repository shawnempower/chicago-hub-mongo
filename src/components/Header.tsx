import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { User, LogOut } from "lucide-react";

interface HeaderProps {
  onAssistantClick: () => void;
}

export function Header({ onAssistantClick }: HeaderProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  
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
            variant="assistant" 
            onClick={onAssistantClick}
            className="relative"
          >
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full animate-pulse"></div>
            🟢 Assistant Available
          </Button>
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline">
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}