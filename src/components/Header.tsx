import { Button } from "@/components/ui/button";

interface HeaderProps {
  onAssistantClick: () => void;
}

export function Header({ onAssistantClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <h1 className="text-xl font-bold text-primary font-serif">
            Chicago Media Hub
          </h1>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#how-it-works" className="text-muted-foreground hover:text-primary transition-colors">
              How It Works
            </a>
            <a href="#media-partners" className="text-muted-foreground hover:text-primary transition-colors">
              Media Partners
            </a>
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