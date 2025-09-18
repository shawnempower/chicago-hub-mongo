import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { MediaPartnersSection } from "@/components/MediaPartnersSection";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { AssistantBubble } from "@/components/AssistantBubble";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";

const Index = () => {
  const navigate = useNavigate();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  const handleAssistantClick = () => {
    setIsAssistantOpen(true);
  };

  const handleAssistantClose = () => {
    setIsAssistantOpen(false);
  };

  const handleViewPackage = (packageId: number) => {
    setIsAssistantOpen(false);
    navigate(`/packages?highlight=${packageId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onAssistantClick={handleAssistantClick} />
      
      <main>
        <HeroSection onAssistantClick={handleAssistantClick} />
        <HowItWorksSection onAssistantClick={handleAssistantClick} />
        <MediaPartnersSection onAssistantClick={handleAssistantClick} />
      </main>

      <CTASection onAssistantClick={handleAssistantClick} />
      
      <Footer />

      <AssistantBubble 
        onAssistantClick={handleAssistantClick}
        isChatOpen={isAssistantOpen}
      />

      <ChatContainer 
        isOpen={isAssistantOpen}
        onClose={handleAssistantClose}
        onViewPackage={handleViewPackage}
      />
    </div>
  );
};

export default Index;
