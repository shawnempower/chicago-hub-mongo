import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, X } from "lucide-react";

// Feature flag to enable/disable automatic tooltip popups
const SHOW_AUTO_TOOLTIPS = false;

interface AssistantBubbleProps {
  onAssistantClick: () => void;
  isModalOpen: boolean;
}

const helpMessages = [
  "Need help? I'm Lassie 👋",
  "Questions about Chicago media? Ask me!",
  "Ready to discover your perfect outlets?",
  "Let's find your ideal media strategy!"
];

export function AssistantBubble({ onAssistantClick, isModalOpen }: AssistantBubbleProps) {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (isModalOpen || !SHOW_AUTO_TOOLTIPS) return;

    const interval = setInterval(() => {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
      setCurrentMessage((prev) => (prev + 1) % helpMessages.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [isModalOpen]);

  if (isModalOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-16 right-0 mb-2 mr-2 bg-white rounded-lg shadow-lg border border-border p-3 w-64 max-w-[80vw] sm:w-72 break-words leading-relaxed animate-fade-in">
          <p className="text-sm text-muted-foreground">{helpMessages[currentMessage]}</p>
          <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b border-border"></div>
        </div>
      )}

      {/* Bubble */}
      <Button
        variant="assistant"
        size="icon"
        onClick={onAssistantClick}
        className="w-14 h-14 rounded-full shadow-xl hover:scale-110 relative"
      >
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full animate-pulse border-2 border-white"></div>
        <MessageCircle className="h-6 w-6" />
      </Button>
    </div>
  );
}