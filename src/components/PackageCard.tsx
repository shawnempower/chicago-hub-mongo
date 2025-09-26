import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";
import { Package } from "@/types/package";
import { audienceTypes, channelTypes, priceRanges, complexityTypes } from "@/data/packages";
import { cn } from "@/lib/utils";

interface PackageCardProps {
  packageData: Package;
  onSave: (id: number) => void;
  isSaved: boolean;
  onDetails: (packageData: Package) => void;
}

export function PackageCard({ packageData, onSave, isSaved, onDetails }: PackageCardProps) {
  const pkg = packageData;
  const getTagColor = (type: string, value: string) => {
    switch (type) {
      case "audience":
        return audienceTypes.find(a => a.id === value)?.color || "bg-gray-100 text-gray-800";
      case "channel":
        return channelTypes.find(c => c.id === value)?.color || "bg-gray-100 text-gray-800";
      case "price":
        return priceRanges.find(p => p.id === pkg.priceRange)?.color || "bg-gray-100 text-gray-800";
      case "complexity":
        return complexityTypes.find(c => c.id === value)?.color || "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div 
      className="outlet-card group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      onClick={() => onDetails(pkg)}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-primary font-serif mb-1">
              {pkg.name}
            </h3>
            <p className="text-accent italic text-sm">"{pkg.tagline}"</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onSave(pkg.id);
            }}
            className="ml-2 hover:bg-accent/10"
          >
            <Heart 
              className={cn(
                "h-4 w-4 transition-colors",
                isSaved ? "fill-accent text-accent" : "text-muted-foreground"
              )} 
            />
          </Button>
        </div>

        <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
          {pkg.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {pkg.audience.slice(0, 2).map(audience => (
            <Badge 
              key={audience} 
              variant="secondary" 
              className={cn("text-xs", getTagColor("audience", audience))}
            >
              {audienceTypes.find(a => a.id === audience)?.label || audience}
            </Badge>
          ))}
          {pkg.channels.slice(0, 2).map(channel => (
            <Badge 
              key={channel} 
              variant="secondary" 
              className={cn("text-xs", getTagColor("channel", channel))}
            >
              {channelTypes.find(c => c.id === channel)?.label || channel}
            </Badge>
          ))}
          <Badge 
            variant="secondary" 
            className={cn("text-xs", getTagColor("complexity", pkg.complexity))}
          >
            {complexityTypes.find(c => c.id === pkg.complexity)?.label || pkg.complexity}
          </Badge>
        </div>

        {/* Key Outlets Preview */}
        <div className="bg-muted/50 rounded-lg p-3 mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Key Outlets:</p>
          <div className="text-xs text-foreground">
            {pkg.outlets.slice(0, 3).join(", ")}
            {pkg.outlets.length > 3 && ` +${pkg.outlets.length - 3} more`}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center">
          <div className="text-lg font-semibold text-primary">
            {pkg.price}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDetails(pkg);
            }}
          >
            Details →
          </Button>
        </div>
      </div>
    </div>
  );
}