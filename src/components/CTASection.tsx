import { Button } from "@/components/ui/button";

interface CTASectionProps {
  onAssistantClick?: () => void;
}

export function CTASection({ onAssistantClick = () => {} }: CTASectionProps) {
  return (
    <section className="bg-primary py-16">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 font-serif">
          Ready to Plan the Perfect Campaign?
        </h2>
        <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          Let us know your goals and budget and we'll do the rest!
        </p>
        <Button 
          variant="secondary" 
          size="xl"
          onClick={onAssistantClick}
        >
          Get Started!
        </Button>
      </div>
    </section>
  );
}