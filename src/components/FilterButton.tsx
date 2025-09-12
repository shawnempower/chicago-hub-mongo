import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterButtonProps {
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

export function FilterButton({
  selectedBudget,
  selectedAudience,
  selectedComplexity,
  selectedChannels,
  onBudgetChange,
  onAudienceChange,
  onComplexityChange,
  onChannelChange,
  onClearAll
}: FilterButtonProps) {
  const [open, setOpen] = useState(false);

  const totalActiveFilters = 
    selectedBudget.length + 
    selectedAudience.length + 
    selectedComplexity.length + 
    selectedChannels.length;

  const hasActiveFilters = totalActiveFilters > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "relative",
            hasActiveFilters && "border-primary text-primary"
          )}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <Badge 
              variant="secondary" 
              className="ml-2 h-5 px-1.5 text-xs bg-primary text-primary-foreground"
            >
              {totalActiveFilters}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Filter Packages</h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="text-muted-foreground hover:text-foreground h-auto p-1"
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Budget</label>
            <div className="flex flex-wrap gap-2">
              {budgetOptions.map(option => (
                <Badge
                  key={option.id}
                  variant={selectedBudget.includes(option.id) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => onBudgetChange(option.id)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Audience</label>
            <div className="flex flex-wrap gap-2">
              {audienceOptions.map(option => (
                <Badge
                  key={option.id}
                  variant={selectedAudience.includes(option.id) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => onAudienceChange(option.id)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Complexity */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Complexity</label>
            <div className="flex flex-wrap gap-2">
              {complexityOptions.map(option => (
                <Badge
                  key={option.id}
                  variant={selectedComplexity.includes(option.id) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => onComplexityChange(option.id)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Channels</label>
            <div className="flex flex-wrap gap-2">
              {channelOptions.map(option => (
                <Badge
                  key={option.id}
                  variant={selectedChannels.includes(option.id) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => onChannelChange(option.id)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}