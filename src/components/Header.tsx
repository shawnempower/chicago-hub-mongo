import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface HeaderProps {
  onAssistantClick: () => void;
}

export function Header({ onAssistantClick }: HeaderProps) {
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
            <Link to="/partners" className="text-muted-foreground hover:text-primary transition-colors">
              Media Partners
            </Link>
            <Link to="/packages" className="text-muted-foreground hover:text-primary transition-colors">
              Advertising Packages
            </Link>
          </nav>
        </div>
        
        <Button 
          variant="assistant" 
          onClick={onAssistantClick}
          className="relative"
        >
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full animate-pulse"></div>
          🟢 Assistant Available
        </Button>
      </div>
    </header>
  );
}