import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Package, Building2, MessageCircle, FileText, ArrowRight, ChevronRight } from "lucide-react";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userId?: string;
}

const onboardingSteps = [
  {
    title: "Welcome to Chicago Media Hub",
    description: "Your gateway to Chicago's media landscape",
    icon: Package,
    content: "Connect with Chicago's top media outlets and discover advertising opportunities tailored to your business goals.",
    benefits: ["500+ verified media partners", "AI-powered recommendations", "Streamlined booking process"],
    nextStep: "Let's set up your profile"
  },
  {
    title: "Complete Your Profile",
    description: "Get personalized recommendations",
    icon: FileText,
    content: "Tell us about your business, target audience, and marketing goals to receive tailored media suggestions.",
    benefits: ["Smart package matching", "Budget optimization", "Industry-specific insights"],
    nextStep: "Explore media partners"
  },
  {
    title: "Explore Media Partners",
    description: "Discover advertising opportunities",
    icon: Building2,
    content: "Browse curated media outlets, compare packages, and save favorites for easy booking and reference.",
    benefits: ["Real-time availability", "Transparent pricing", "One-click saving"],
    nextStep: "Meet your AI assistant"
  },
  {
    title: "Get AI-Powered Assistance",
    description: "Your personal media planning expert",
    icon: MessageCircle,
    content: "Ask questions, get recommendations, and receive expert guidance for your media campaigns.",
    benefits: ["24/7 availability", "Market insights", "Campaign optimization"],
    nextStep: "Start exploring!"
  }
];

export function WelcomeModal({ isOpen, onClose, userName, userId }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark onboarding as completed
      if (userId) {
        localStorage.setItem(`onboarding_completed_${userId}`, 'true');
      }
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header with Step Indicators */}
        <DialogHeader className="space-y-4 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {onboardingSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index <= currentStep ? 'bg-primary w-8' : 'bg-muted w-6'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} of {onboardingSteps.length}
            </span>
          </div>
        </DialogHeader>

        {/* Main Content Card */}
        <Card className="border-0 shadow-none bg-gradient-to-br from-background to-muted/20">
          <CardContent className="p-8 space-y-8">
            {/* Hero Section for First Step */}
            {currentStep === 0 && (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                  <Icon className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-3xl font-serif font-bold text-primary">
                  Welcome, {userName}! 👋
                </h1>
                <p className="text-xl text-muted-foreground">
                  {step.description}
                </p>
              </div>
            )}

            {/* Regular Steps */}
            {currentStep > 0 && (
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-serif font-semibold text-primary">
                    {step.title}
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="space-y-6">
              <p className="text-base text-foreground leading-relaxed">
                {step.content}
              </p>

              {/* Benefits List */}
              <div className="grid gap-3">
                {step.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Next Step Preview */}
              {currentStep < onboardingSteps.length - 1 && (
                <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Next:</span>
                    <span className="font-medium">{step.nextStep}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between gap-4 pt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="min-w-[100px]"
          >
            Previous
          </Button>
          
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Skip Tutorial
            </Button>
            <Button
              onClick={handleNext}
              className="min-w-[120px] gap-2"
            >
              {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Continue'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}