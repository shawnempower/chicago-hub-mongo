import { useSavedPackages } from "@/hooks/useSavedPackages";
import { useSavedOutlets } from "@/hooks/useSavedOutlets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Package, Building2, ExternalLink, Heart } from "lucide-react";
import { packages } from "@/data/packages";
import { mediaPartners } from "@/data/mediaPartners";

export function SavedItemsOverview() {
  const { savedPackages, toggleSavePackage } = useSavedPackages();
  const { savedOutlets, toggleSaveOutlet } = useSavedOutlets();

  const savedPackagesList = packages.filter(pkg => savedPackages.includes(pkg.id));
  const savedOutletsList = mediaPartners.filter(partner => savedOutlets.has(partner.id.toString()));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title mb-2">Saved Items</h2>
        <p className="body-large">Manage your saved packages and media outlets.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Saved Packages */}
        <Card className="outlet-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-accent" />
              Saved Packages ({savedPackages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {savedPackagesList.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No saved packages yet</p>
                <Button asChild variant="outline">
                  <Link to="/packages">Browse Packages</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {savedPackagesList.slice(0, 3).map((pkg) => (
                  <div key={pkg.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{pkg.name}</h4>
                      <p className="text-xs text-muted-foreground">{pkg.outlets.join(', ')}</p>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {pkg.price}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {pkg.audience.join(', ')}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleSavePackage(pkg.id)}
                    >
                      <Heart className="h-4 w-4 fill-current text-destructive" />
                    </Button>
                  </div>
                ))}
                {savedPackagesList.length > 3 && (
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/packages">
                      View All {savedPackages.length} Saved Packages
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saved Outlets */}
        <Card className="outlet-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-success" />
              Saved Outlets ({savedOutlets.size})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {savedOutletsList.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No saved outlets yet</p>
                <Button asChild variant="outline">
                  <Link to="/partners">Browse Outlets</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {savedOutletsList.slice(0, 3).map((outlet) => (
                  <div key={outlet.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{outlet.name}</h4>
                      <p className="text-xs text-muted-foreground">{outlet.category}</p>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {outlet.reach}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleSaveOutlet(outlet.id.toString())}
                    >
                      <Heart className="h-4 w-4 fill-current text-destructive" />
                    </Button>
                  </div>
                ))}
                {savedOutletsList.length > 3 && (
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/partners">
                      View All {savedOutlets.size} Saved Outlets
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}