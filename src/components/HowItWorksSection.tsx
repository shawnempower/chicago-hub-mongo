import { Button } from "@/components/ui/button";
import { MessageSquare, Search, Heart, Calendar } from "lucide-react";

interface HowItWorksSectionProps {
  onAssistantClick: () => void;
}

const steps = [
  {
    icon: MessageSquare,
    title: "Talk with Lassie",
    description: "Share your goals, target audiences, and campaign objectives with our AI assistant in a natural conversation."
  },
  {
    icon: Search,
    title: "Discover Perfect Matches",
    description: "Get personalized recommendations for Chicago media outlets that align with your brand and reach your communities."
  },
  {
    icon: Heart,
    title: "Save Your Favorites",
    description: "Build your ideal media portfolio by saving outlets that resonate with your strategy and goals."
  },
  {
    icon: Calendar,
    title: "Connect with Experts",
    description: "Schedule a strategy session with our team to bring your media plan to life and maximize your impact."
  }
];

export function HowItWorksSection({ onAssistantClick }: HowItWorksSectionProps) {
  return (
    <section id="how-it-works" className="py-16 lg:py-24 bg-brand-light-gray">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="section-title mb-4">
            Your Journey to{" "}
            <span className="text-accent">Perfect Media Discovery</span>
          </h2>
          <p className="body-large max-w-2xl mx-auto">
            From first conversation to successful campaigns - Lassie guides you through every step of discovering your ideal Chicago media strategy.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="text-center space-y-4">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-accent/10 border-2 border-accent rounded-full flex items-center justify-center mx-auto">
                    <Icon className="h-8 w-8 text-accent" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-full w-12 h-0.5 bg-accent/30"></div>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-primary font-serif mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-center space-y-6">
          <div className="bg-white rounded-2xl p-8 max-w-2xl mx-auto shadow-lg">
            <h3 className="text-xl font-semibold text-primary font-serif mb-4">
              Ready to Start Your Discovery?
            </h3>
            <p className="text-muted-foreground mb-6">
              Lassie is standing by to help you explore Chicago's media landscape and find the perfect outlets for your brand's unique needs.
            </p>
            <Button 
              variant="hero" 
              size="lg"
              onClick={onAssistantClick}
            >
              Start Your Conversation with Lassie
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            No commitment required • Free discovery session • Instant recommendations
          </p>
        </div>
      </div>
    </section>
  );
}