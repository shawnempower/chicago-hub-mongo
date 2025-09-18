import { useNavigate } from "react-router-dom";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { HeroSection } from "@/components/HeroSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { MediaPartnersSection } from "@/components/MediaPartnersSection";
import { CTASection } from "@/components/CTASection";

const Index = () => {
  const navigate = useNavigate();

  const handleViewPackage = (packageId: number) => {
    navigate(`/packages?highlight=${packageId}`);
  };

  return (
    <MarketingLayout onViewPackage={handleViewPackage}>
      <HeroSection />
      <HowItWorksSection />
      <MediaPartnersSection />
      <CTASection />
    </MarketingLayout>
  );
};

export default Index;
