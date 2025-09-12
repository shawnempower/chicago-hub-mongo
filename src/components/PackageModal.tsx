import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Share2 } from "lucide-react";
import { Package, audienceTypes, channelTypes, complexityTypes } from "@/data/packages";
import { cn } from "@/lib/utils";

interface PackageModalProps {
  packageData: Package | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number) => void;
  isSaved: boolean;
}

export function PackageModal({ packageData, isOpen, onClose, onSave, isSaved }: PackageModalProps) {
  const pkg = packageData;
  if (!pkg) return null;

  const getTagColor = (type: string, value: string) => {
    switch (type) {
      case "audience":
        return audienceTypes.find(a => a.id === value)?.color || "bg-gray-100 text-gray-800";
      case "channel":
        return channelTypes.find(c => c.id === value)?.color || "bg-gray-100 text-gray-800";
      case "complexity":
        return complexityTypes.find(c => c.id === value)?.color || "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: pkg.name,
          text: pkg.description,
          url: window.location.href
        });
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl font-serif text-primary">
                {pkg.name}
              </DialogTitle>
              <DialogDescription className="text-accent italic text-lg mt-1">
                "{pkg.tagline}"
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSave(pkg.id)}
              >
                <Heart 
                  className={cn(
                    "h-5 w-5",
                    isSaved ? "fill-accent text-accent" : "text-muted-foreground"
                  )} 
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
              >
                <Share2 className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Price */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">{pkg.price}</div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold text-foreground mb-2">Description</h3>
            <p className="text-muted-foreground leading-relaxed">{pkg.description}</p>
          </div>

          {/* Tags */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Package Details</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Audience: </span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {pkg.audience.map(audience => (
                    <Badge 
                      key={audience} 
                      variant="secondary" 
                      className={cn("text-xs", getTagColor("audience", audience))}
                    >
                      {audienceTypes.find(a => a.id === audience)?.label || audience}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <span className="text-sm font-medium text-muted-foreground">Channels: </span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {pkg.channels.map(channel => (
                    <Badge 
                      key={channel} 
                      variant="secondary" 
                      className={cn("text-xs", getTagColor("channel", channel))}
                    >
                      {channelTypes.find(c => c.id === channel)?.label || channel}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-muted-foreground">Complexity: </span>
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs ml-2", getTagColor("complexity", pkg.complexity))}
                >
                  {complexityTypes.find(c => c.id === pkg.complexity)?.label || pkg.complexity}
                </Badge>
              </div>
            </div>
          </div>

          {/* Outlets */}
          <div>
            <h3 className="font-semibold text-foreground mb-2">Included Media Outlets</h3>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {pkg.outlets.map((outlet, index) => (
                  <div key={index} className="text-sm text-foreground">
                    • {outlet}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="border-t pt-6">
            <Button size="lg" className="w-full">
              Schedule Consultation
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Get a custom proposal for this package
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}