import { Button } from "@/components/ui/button";
import { MessageSquare, Search, Calendar } from "lucide-react";
interface HowItWorksSectionProps {
  onAssistantClick: () => void;
}
const steps = [{
  icon: MessageSquare,
  title: "Start a chat with Lassie, your media assistant.",
  description: "Tell Lassie about your brand, goals, and target audience in a simple conversation."
}, {
  icon: Search,
  title: "Get Personalized Recommendations",
  description: "Receive curated Chicago media outlets perfectly matched to your campaign needs."
}, {
  icon: Calendar,
  title: "Book and Launch the Perfect Campaign!",
  description: "Connect with our team to bring your media strategy to life and maximize your impact."
}];
export function HowItWorksSection({
  onAssistantClick
}: HowItWorksSectionProps) {
  return <section id="how-it-works" className="py-16 lg:py-24 bg-brand-light-gray">
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

        <div className="grid md:grid-cols-3 gap-8 lg:gap-16 mb-12 max-w-4xl mx-auto">
          {steps.map((step, index) => {
          const Icon = step.icon;
          return <div key={step.title} className="text-center space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-primary mb-2">
                    {index + 1}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-primary font-serif">
                  {step.title}
                </h3>
                
              </div>;
        })}
        </div>

        <div className="text-center space-y-6">
          <div className="bg-white rounded-2xl p-8 max-w-2xl mx-auto shadow-lg">
            <h3 className="text-xl font-semibold text-primary font-serif mb-4">
              Ready to Start Your Discovery?
            </h3>
            
            <Button variant="hero" size="lg" onClick={onAssistantClick}>Get Started</Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            No commitment required • Free discovery session • Instant recommendations
          </p>
        </div>
      </div>
    </section>;
}