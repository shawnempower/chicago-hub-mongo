import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Package, Building2, MessageCircle, FileText } from "lucide-react";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

const onboardingSteps = [
  {
    title: "Welcome to Chicago Media Hub",
    description: "Your one-stop platform for discovering and connecting with Chicago media outlets.",
    icon: Package,
    content: "We help you find the perfect advertising packages and media partnerships to grow your business in the Chicago market."
  },
  {
    title: "Complete Your Profile",
    description: "Tell us about your business to get personalized recommendations.",
    icon: FileText,
    content: "The more we know about your brand, target audience, and goals, the better recommendations we can provide."
  },
  {
    title: "Explore Media Partners",
    description: "Discover Chicago's top media outlets and advertising opportunities.",
    icon: Building2,
    content: "Browse through curated media partners, compare packages, and save your favorites for easy reference."
  },
  {
    title: "Get AI-Powered Assistance",
    description: "Use our intelligent assistant for personalized media planning advice.",
    icon: MessageCircle,
    content: "Ask questions, get recommendations, and receive expert guidance tailored to your specific needs and budget."
  }
];

export function WelcomeModal({ isOpen, onClose, userName }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = onboardingSteps[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Icon className="h-6 w-6 text-primary" />
            {step.title}
          </DialogTitle>
          <DialogDescription className="text-base">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            {currentStep === 0 && (
              <p className="text-lg font-medium text-foreground mb-4">
                Welcome, {userName}! 👋
              </p>
            )}
            <p className="text-muted-foreground leading-relaxed">
              {step.content}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-muted-foreground">{currentStep + 1} of {onboardingSteps.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex-1"
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1"
            >
              {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
            </Button>
          </div>

          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Skip Tutorial
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}