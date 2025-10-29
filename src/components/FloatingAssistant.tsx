import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AssistantModal } from '@/components/AssistantModal';
import { Bot } from 'lucide-react';
import { usePublication } from '@/contexts/PublicationContext';
import { getPublicationBrandColor } from '@/config/publicationBrandColors';

export function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const { selectedPublication } = usePublication();
  
  // Get brand color for button from storefront configuration
  const buttonColor = selectedPublication 
    ? getPublicationBrandColor(selectedPublication.publicationId)
    : '#0066cc';

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg text-white hover:opacity-90 transition-all duration-200 z-50"
        style={{ backgroundColor: buttonColor }}
        size="icon"
      >
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: buttonColor, filter: 'brightness(1.2)' }}></div>
        <Bot className="h-6 w-6" />
      </Button>

      <AssistantModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

