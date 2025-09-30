import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, X } from "lucide-react";
interface PartnerModalProps {
  partner: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PartnerModal({ partner, isOpen, onClose }: PartnerModalProps) {
  if (!partner) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: partner.logoColor }}
            >
              {partner.logo}
            </div>
            <div>
              <DialogTitle className="text-2xl font-serif text-primary">
                {partner.name}
              </DialogTitle>
              <Badge variant="secondary" className="mt-1">
                {partner.category}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Description */}
          <div>
            <h3 className="font-semibold text-lg mb-2">About</h3>
            <p className="text-muted-foreground leading-relaxed">
              {partner.description}
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Reach</h4>
              <p className="text-sm text-muted-foreground">{partner.reach}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Primary Audience</h4>
              <p className="text-sm text-muted-foreground">{partner.audience}</p>
            </div>
          </div>

          {/* Strengths */}
          <div>
            <h4 className="font-semibold mb-3">Key Strengths</h4>
            <div className="grid grid-cols-1 gap-2">
              {partner.strengths.map((strength, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{strength}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Advertising Options */}
          <div>
            <h4 className="font-semibold mb-3">Advertising Options</h4>
            <div className="flex flex-wrap gap-2">
              {partner.advertising.map((option, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {option}
                </Badge>
              ))}
            </div>
          </div>

          {/* Website */}
          {partner.website && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <h4 className="font-semibold mb-1">Visit Website</h4>
                <p className="text-sm text-muted-foreground">{partner.website}</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={`https://${partner.website}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}