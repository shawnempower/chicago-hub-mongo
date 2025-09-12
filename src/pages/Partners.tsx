import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AssistantModal } from "@/components/AssistantModal";
import { AssistantBubble } from "@/components/AssistantBubble";
import { CTASection } from "@/components/CTASection";
import { PartnerModal } from "@/components/PartnerModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { mediaPartners, categories, MediaPartner } from "@/data/mediaPartners";

export default function Partners() {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<MediaPartner | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredPartners = activeCategory === "all" 
    ? mediaPartners 
    : mediaPartners.filter(partner => partner.categoryTag === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <Header onAssistantClick={() => setIsAssistantOpen(true)} />
      
      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-background via-brand-cream to-brand-light-gray py-16 lg:py-24">
          <div className="container mx-auto px-6 text-center">
            <h1 className="hero-title mb-6">
              Our Media Partners
            </h1>
            <p className="body-large max-w-3xl mx-auto text-muted-foreground">
              35+ trusted Chicago voices reaching every community, every neighborhood, every Chicagoan
            </p>
          </div>
        </section>

        {/* Filter Bar */}
        <section className="bg-white border-b border-border py-6">
          <div className="container mx-auto px-6">
            <div className="flex flex-wrap gap-3 justify-center">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(category.id)}
                  className="rounded-full"
                >
                  {category.name}
                  {category.id !== "all" && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {mediaPartners.filter(p => p.categoryTag === category.id).length}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Partners Grid */}
        <section className="py-16 bg-gradient-to-b from-white to-brand-cream/30">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPartners.map((partner) => (
                <Card key={partner.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2">
                  <CardHeader className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ backgroundColor: partner.logoColor }}
                      >
                        {partner.logo}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg font-serif text-primary line-clamp-2">
                          {partner.name}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {partner.category}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <CardDescription className="text-sm leading-relaxed line-clamp-3">
                      {partner.brief}
                    </CardDescription>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setSelectedPartner(partner)}
                      >
                        Learn More
                      </Button>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="flex-1 opacity-60 cursor-not-allowed"
                              disabled
                            >
                              View Storefront
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Storefront coming soon</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <CTASection onAssistantClick={() => setIsAssistantOpen(true)} />
      </main>

      <Footer />
      <AssistantBubble onAssistantClick={() => setIsAssistantOpen(true)} isModalOpen={isAssistantOpen} />
      <AssistantModal isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} />
      <PartnerModal 
        partner={selectedPartner} 
        isOpen={!!selectedPartner} 
        onClose={() => setSelectedPartner(null)} 
      />
    </div>
  );
}