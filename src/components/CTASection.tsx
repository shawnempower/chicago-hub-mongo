import { Button } from "@/components/ui/button";

interface CTASectionProps {
  onAssistantClick: () => void;
  onSurveyClick: () => void;
}

export function CTASection({ onAssistantClick, onSurveyClick }: CTASectionProps) {
  return (
    <section className="bg-primary py-16">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 font-serif">
          Ready to Plan the Perfect Campaign?
        </h2>
        <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          Let us know your goals and budget and we'll do the rest!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            variant="secondary" 
            size="xl"
            onClick={onAssistantClick}
          >
            Get Started!
          </Button>
          <Button 
            variant="outline" 
            size="xl"
            onClick={onSurveyClick}
            className="bg-transparent border-white text-white hover:bg-white hover:text-primary"
          >
            Apply to Network
          </Button>
        </div>
        <p className="text-sm text-white/70 mt-4">
          Media partners: Join our network to connect with advertisers
        </p>
      </div>
    </section>
  );
}