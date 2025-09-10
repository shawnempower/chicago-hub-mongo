import { useState } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { MediaPartnersSection } from "@/components/MediaPartnersSection";
import { AssistantModal } from "@/components/AssistantModal";
import { AssistantBubble } from "@/components/AssistantBubble";
import { Footer } from "@/components/Footer";

const Index = () => {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  const handleAssistantClick = () => {
    setIsAssistantOpen(true);
  };

  const handleAssistantClose = () => {
    setIsAssistantOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onAssistantClick={handleAssistantClick} />
      
      <main>
        <HeroSection onAssistantClick={handleAssistantClick} />
        <HowItWorksSection onAssistantClick={handleAssistantClick} />
        <MediaPartnersSection onAssistantClick={handleAssistantClick} />
      </main>

      <Footer />

      <AssistantBubble 
        onAssistantClick={handleAssistantClick}
        isModalOpen={isAssistantOpen}
      />

      <AssistantModal 
        isOpen={isAssistantOpen}
        onClose={handleAssistantClose}
      />
    </div>
  );
};

export default Index;
