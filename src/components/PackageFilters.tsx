import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PackageFiltersProps {
  selectedBudget: string[];
  selectedAudience: string[];
  selectedComplexity: string[];
  selectedChannels: string[];
  onBudgetChange: (budget: string) => void;
  onAudienceChange: (audience: string) => void;
  onComplexityChange: (complexity: string) => void;
  onChannelChange: (channel: string) => void;
  onClearAll: () => void;
}

const budgetOptions = [
  { id: "under-5k", label: "Under $5K" },
  { id: "5-15k", label: "$5K-$15K" },
  { id: "15-50k", label: "$15K-$50K" },
  { id: "50k-plus", label: "$50K+" }
];

const audienceOptions = [
  { id: "diverse", label: "Diverse" },
  { id: "families", label: "Families" },
  { id: "business", label: "Business" },
  { id: "hyperlocal", label: "Hyperlocal" },
  { id: "youth", label: "Youth" },
  { id: "faith", label: "Faith" }
];

const complexityOptions = [
  { id: "turnkey", label: "Turnkey" },
  { id: "custom", label: "Custom" }
];

const channelOptions = [
  { id: "radio", label: "Radio" },
  { id: "newsletter", label: "Newsletter" },
  { id: "print", label: "Print" },
  { id: "digital", label: "Digital" },
  { id: "tv", label: "TV" }
];

export function PackageFilters({
  selectedBudget,
  selectedAudience,
  selectedComplexity,
  selectedChannels,
  onBudgetChange,
  onAudienceChange,
  onComplexityChange,
  onChannelChange,
  onClearAll
}: PackageFiltersProps) {
  const hasActiveFilters = 
    selectedBudget.length > 0 || 
    selectedAudience.length > 0 || 
    selectedComplexity.length > 0 || 
    selectedChannels.length > 0;

  return (
    <div className="sticky top-[73px] z-30 bg-white/95 backdrop-blur-sm border-b border-border py-4">
      <div className="container mx-auto px-6">
        <div className="flex flex-wrap gap-6 items-center">
          {/* Budget */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Budget:</span>
            {budgetOptions.map(option => (
              <Badge
                key={option.id}
                variant={selectedBudget.includes(option.id) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedBudget.includes(option.id) 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted"
                )}
                onClick={() => onBudgetChange(option.id)}
              >
                {option.label}
              </Badge>
            ))}
          </div>

          {/* Audience */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Audience:</span>
            {audienceOptions.map(option => (
              <Badge
                key={option.id}
                variant={selectedAudience.includes(option.id) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedAudience.includes(option.id) 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted"
                )}
                onClick={() => onAudienceChange(option.id)}
              >
                {option.label}
              </Badge>
            ))}
          </div>

          {/* Complexity */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Complexity:</span>
            {complexityOptions.map(option => (
              <Badge
                key={option.id}
                variant={selectedComplexity.includes(option.id) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedComplexity.includes(option.id) 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted"
                )}
                onClick={() => onComplexityChange(option.id)}
              >
                {option.label}
              </Badge>
            ))}
          </div>

          {/* Channels */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Channels:</span>
            {channelOptions.map(option => (
              <Badge
                key={option.id}
                variant={selectedChannels.includes(option.id) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedChannels.includes(option.id) 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted"
                )}
                onClick={() => onChannelChange(option.id)}
              >
                {option.label}
              </Badge>
            ))}
          </div>

          {/* Clear All */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}