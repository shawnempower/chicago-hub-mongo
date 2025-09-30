import { useSavedPackages } from "@/hooks/useSavedPackages";
import { useSavedOutlets } from "@/hooks/useSavedOutlets";
import { usePackages } from "@/hooks/usePackages";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Package, Building2, ExternalLink, Heart, MessageCircle } from "lucide-react";
import { usePublicationsAsMediaEntities } from "@/hooks/usePublications";
import { EmptyStates } from "@/components/EmptyStates";
import { convertDatabasePackage } from "@/types/package";

export function SavedItemsOverview() {
  const { savedPackages, toggleSavePackage } = useSavedPackages();
  const { savedOutlets, toggleSaveOutlet } = useSavedOutlets();
  const { packages: dbPackages, loading: packagesLoading } = usePackages();
  const { mediaEntities, loading: entitiesLoading } = usePublicationsAsMediaEntities();

  // Convert database packages to frontend format and filter by saved IDs
  const savedPackagesList = dbPackages
    .filter(dbPkg => dbPkg.legacy_id && savedPackages.includes(dbPkg.legacy_id))
    .map(convertDatabasePackage);
  
  const savedOutletsList = mediaEntities.filter(entity => savedOutlets.has(entity.id.toString()));

  if (packagesLoading || entitiesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="section-title mb-2">Saved Items</h2>
          <p className="body-large">Loading your saved items...</p>
        </div>
      </div>
    );
  }

  if (savedPackagesList.length === 0 && savedOutletsList.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="section-title mb-2">Saved Items</h2>
          <p className="body-large">Manage your saved packages and media outlets.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EmptyStates.SavedPackages />
          <EmptyStates.SavedOutlets />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title mb-2">Saved Items</h2>
        <p className="body-large">Manage your saved packages and media outlets.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {savedPackagesList.length > 0 && (
          <Card className="outlet-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-accent" />
                  Saved Packages ({savedPackages.length})
                </div>
                <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('openAssistant'))}>
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Get Advice
                </Button>
              </CardTitle>
              <CardDescription>
                Your saved advertising packages ready for action
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {savedPackagesList.slice(0, 3).map((pkg) => (
                  <div key={pkg.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-medium">{pkg.name}</h4>
                      <p className="text-sm text-muted-foreground">{pkg.outlets.join(', ')}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {pkg.price}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {pkg.audience.join(', ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('openAssistant'))}>
                        💬
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleSavePackage(pkg.id)}
                      >
                        <Heart className="h-4 w-4 fill-current text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  {savedPackagesList.length > 3 && (
                    <Button asChild variant="outline" className="flex-1">
                      <Link to="/packages">
                        View All {savedPackages.length} Packages
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1" onClick={() => window.dispatchEvent(new CustomEvent('openAssistant'))}>
                    Compare & Get Advice
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {savedOutletsList.length > 0 && (
          <Card className="outlet-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-success" />
                  Saved Outlets ({savedOutlets.size})
                </div>
                <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('openAssistant'))}>
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Connect
                </Button>
              </CardTitle>
              <CardDescription>
                Your network of trusted media partners
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {savedOutletsList.slice(0, 3).map((outlet) => (
                  <div key={outlet.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-medium">{outlet.name}</h4>
                      <p className="text-sm text-muted-foreground">{outlet.category}</p>
                      <div className="flex gap-1 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {outlet.reach}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('openAssistant'))}>
                        🤝
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleSaveOutlet(outlet.id.toString())}
                      >
                        <Heart className="h-4 w-4 fill-current text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  {savedOutletsList.length > 3 && (
                    <Button asChild variant="outline" className="flex-1">
                      <Link to="/partners">
                        View All {savedOutlets.size} Outlets
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1" onClick={() => window.dispatchEvent(new CustomEvent('openAssistant'))}>
                    Plan Strategy
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}