import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface ActiveFiltersProps {
  selectedBudget: string[];
  selectedAudience: string[];
  selectedComplexity: string[];
  selectedChannels: string[];
  onBudgetChange: (budget: string) => void;
  onAudienceChange: (audience: string) => void;
  onComplexityChange: (complexity: string) => void;
  onChannelChange: (channel: string) => void;
}

const budgetLabels = {
  "under-5k": "Under $5K",
  "5-15k": "$5K-$15K",
  "15-50k": "$15K-$50K",
  "50k-plus": "$50K+"
};

const audienceLabels = {
  "diverse": "Diverse",
  "families": "Families",
  "business": "Business",
  "hyperlocal": "Hyperlocal",
  "youth": "Youth",
  "faith": "Faith"
};

const complexityLabels = {
  "turnkey": "Turnkey",
  "custom": "Custom"
};

const channelLabels = {
  "radio": "Radio",
  "newsletter": "Newsletter",
  "print": "Print",
  "digital": "Digital",
  "tv": "TV"
};

export function ActiveFilters({
  selectedBudget,
  selectedAudience,
  selectedComplexity,
  selectedChannels,
  onBudgetChange,
  onAudienceChange,
  onComplexityChange,
  onChannelChange
}: ActiveFiltersProps) {
  const hasActiveFilters = 
    selectedBudget.length > 0 || 
    selectedAudience.length > 0 || 
    selectedComplexity.length > 0 || 
    selectedChannels.length > 0;

  if (!hasActiveFilters) return null;

  return (
    <div className="bg-muted/30 border-b py-3">
      <div className="container mx-auto px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">Active filters:</span>
          
          {/* Budget filters */}
          {selectedBudget.map(budget => (
            <Badge
              key={budget}
              variant="secondary"
              className="pl-2 pr-1 py-1 gap-1 bg-blue-100 text-blue-800 hover:bg-blue-200"
            >
              {budgetLabels[budget as keyof typeof budgetLabels]}
              <button
                onClick={() => onBudgetChange(budget)}
                className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {/* Audience filters */}
          {selectedAudience.map(audience => (
            <Badge
              key={audience}
              variant="secondary"
              className="pl-2 pr-1 py-1 gap-1 bg-green-100 text-green-800 hover:bg-green-200"
            >
              {audienceLabels[audience as keyof typeof audienceLabels]}
              <button
                onClick={() => onAudienceChange(audience)}
                className="ml-1 hover:bg-green-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {/* Complexity filters */}
          {selectedComplexity.map(complexity => (
            <Badge
              key={complexity}
              variant="secondary"
              className="pl-2 pr-1 py-1 gap-1 bg-orange-100 text-orange-800 hover:bg-[#F9F8F3]"
            >
              {complexityLabels[complexity as keyof typeof complexityLabels]}
              <button
                onClick={() => onComplexityChange(complexity)}
                className="ml-1 hover:bg-[#F9F8F3] rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {/* Channel filters */}
          {selectedChannels.map(channel => (
            <Badge
              key={channel}
              variant="secondary"
              className="pl-2 pr-1 py-1 gap-1 bg-purple-100 text-purple-800 hover:bg-purple-200"
            >
              {channelLabels[channel as keyof typeof channelLabels]}
              <button
                onClick={() => onChannelChange(channel)}
                className="ml-1 hover:bg-purple-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}