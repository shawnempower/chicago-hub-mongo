import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { MediaPartnersSection } from "@/components/MediaPartnersSection";
import { AssistantModal } from "@/components/AssistantModal";
import SurveyForm from "@/components/SurveyForm";

import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";

const Index = () => {
  const navigate = useNavigate();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);

  const handleAssistantClick = () => {
    setIsAssistantOpen(true);
  };

  const handleAssistantClose = () => {
    setIsAssistantOpen(false);
  };

  const handleSurveyClick = () => {
    setIsSurveyOpen(true);
  };

  const handleSurveyClose = () => {
    setIsSurveyOpen(false);
  };

  const handleViewPackage = (packageId: number) => {
    setIsAssistantOpen(false);
    navigate(`/packages?highlight=${packageId}`);
  };

  return (
    <div className="min-h-screen bg-background">
          <Header onAssistantClick={handleAssistantClick} onSurveyClick={handleSurveyClick} />
      
      <main>
        <HeroSection onAssistantClick={handleAssistantClick} />
        <HowItWorksSection onAssistantClick={handleAssistantClick} />
        <MediaPartnersSection onAssistantClick={handleAssistantClick} />
      </main>

      <CTASection onAssistantClick={handleAssistantClick} onSurveyClick={handleSurveyClick} />
      
      <Footer />

      <AssistantModal 
        isOpen={isAssistantOpen}
        onClose={handleAssistantClose}
        onViewPackage={handleViewPackage}
      />

      <SurveyForm 
        open={isSurveyOpen}
        onOpenChange={setIsSurveyOpen}
      />
    </div>
  );
};

export default Index;
