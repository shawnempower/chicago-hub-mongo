import { Package } from "@/data/packages";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, ExternalLink } from "lucide-react";
import { useSavedPackages } from "@/hooks/useSavedPackages";

interface PackageRecommendation {
  id: number;
  name: string;
  tagline: string;
  price: string;
  priceRange: string;
  audience: string[];
  channels: string[];
  complexity: string;
  reasoning: string;
}

interface PackageRecommendationCardProps {
  recommendation: PackageRecommendation;
  onViewPackage?: (packageId: number) => void;
}

export function PackageRecommendationCard({ recommendation, onViewPackage }: PackageRecommendationCardProps) {
  const { toggleSavePackage, isSaved } = useSavedPackages();

  const audienceColors: { [key: string]: string } = {
    diverse: "bg-blue-100 text-blue-800",
    families: "bg-green-100 text-green-800",
    business: "bg-purple-100 text-purple-800",
    hyperlocal: "bg-orange-100 text-orange-800",
    youth: "bg-pink-100 text-pink-800",
    faith: "bg-indigo-100 text-indigo-800",
    creative: "bg-yellow-100 text-yellow-800",
    all: "bg-gray-100 text-gray-800"
  };

  const channelColors: { [key: string]: string } = {
    radio: "bg-purple-100 text-purple-800",
    newsletter: "bg-blue-100 text-blue-800",
    print: "bg-green-100 text-green-800",
    digital: "bg-orange-100 text-orange-800",
    tv: "bg-red-100 text-red-800",
    podcast: "bg-indigo-100 text-indigo-800",
    social: "bg-pink-100 text-pink-800",
    events: "bg-yellow-100 text-yellow-800",
    flexible: "bg-gray-100 text-gray-800",
    mixed: "bg-gray-100 text-gray-800",
    all: "bg-gray-100 text-gray-800"
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              AI Recommended
            </Badge>
            <Badge 
              variant={recommendation.complexity === 'turnkey' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {recommendation.complexity}
            </Badge>
          </div>
          <h3 className="text-lg font-semibold text-foreground font-serif">
            {recommendation.name}
          </h3>
          <p className="text-muted-foreground italic text-sm">"{recommendation.tagline}"</p>
          <p className="text-accent font-medium">{recommendation.price}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => toggleSavePackage(recommendation.id)}
          className="shrink-0"
        >
          <Heart 
            className={`h-5 w-5 ${
              isSaved(recommendation.id) 
                ? 'fill-accent text-accent' 
                : 'text-muted-foreground'
            }`} 
          />
        </Button>
      </div>

      <div className="mb-3">
        <p className="text-sm text-muted-foreground mb-2">
          <strong>Why this package:</strong> {recommendation.reasoning}
        </p>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        <span className="text-xs font-medium text-muted-foreground mr-2">Audience:</span>
        {recommendation.audience.map((audience) => (
          <Badge 
            key={audience} 
            variant="secondary" 
            className={`text-xs ${audienceColors[audience] || 'bg-gray-100 text-gray-800'}`}
          >
            {audience}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        <span className="text-xs font-medium text-muted-foreground mr-2">Channels:</span>
        {recommendation.channels.map((channel) => (
          <Badge 
            key={channel} 
            variant="outline" 
            className={`text-xs ${channelColors[channel] || 'bg-gray-100 text-gray-800'}`}
          >
            {channel}
          </Badge>
        ))}
      </div>

      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant="default"
          onClick={() => onViewPackage?.(recommendation.id)}
          className="flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" />
          View Package
        </Button>
        <Button
          size="sm"
          variant={isSaved(recommendation.id) ? "secondary" : "outline"}
          onClick={() => toggleSavePackage(recommendation.id)}
        >
          {isSaved(recommendation.id) ? "Saved ♡" : "Save ♡"}
        </Button>
      </div>
    </div>
  );
}