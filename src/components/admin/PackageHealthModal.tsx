import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { HealthBadge, getHealthBgClass } from '@/components/ui/health-badge';
import { HubPackage } from '@/integrations/mongodb/hubPackageSchema';
import { Activity, RefreshCw, TrendingUp, TrendingDown, Loader2, AlertTriangle, CheckCircle2, Download, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/api';
import { formatDistanceToNow } from 'date-fns';

interface PackageHealthModalProps {
  package: HubPackage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPackageUpdated: () => void;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export function PackageHealthModal({ package: pkg, open, onOpenChange, onPackageUpdated }: PackageHealthModalProps) {
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [healthData, setHealthData] = useState(pkg.healthCheck);

  const handleRunHealthCheck = async () => {
    const packageId = pkg._id?.toString();
    if (!packageId) return;

    try {
      setChecking(true);
      const response = await fetch(`${API_BASE_URL}/admin/builder/packages/${packageId}/health-check`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to run health check');

      const data = await response.json();
      setHealthData(data.healthCheck);
      
      toast({
        title: 'Health Check Complete',
        description: `Status: ${data.healthCheck.overallHealth}`,
      });

      onPackageUpdated();
    } catch (error) {
      console.error('Error running health check:', error);
      toast({
        title: 'Error',
        description: 'Failed to run health check',
        variant: 'destructive'
      });
    } finally {
      setChecking(false);
    }
  };

  const handleRecalculate = async () => {
    const packageId = pkg._id?.toString();
    if (!packageId) return;

    if (!confirm(`Recalculate pricing and reach for "${pkg.basicInfo.name}"? This will update the package with current values.`)) {
      return;
    }

    try {
      setRecalculating(true);
      const response = await fetch(`${API_BASE_URL}/admin/builder/packages/${packageId}/recalculate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          updatePricing: true,
          updateReach: true
        })
      });

      if (!response.ok) throw new Error('Failed to recalculate package');

      const data = await response.json();
      setHealthData(data.healthCheck);
      
      toast({
        title: 'Package Updated',
        description: data.changes.join(', '),
      });

      onPackageUpdated();
    } catch (error) {
      console.error('Error recalculating package:', error);
      toast({
        title: 'Error',
        description: 'Failed to recalculate package',
        variant: 'destructive'
      });
    } finally {
      setRecalculating(false);
    }
  };

  const hasHealthData = healthData && healthData.checks;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Package Health: {pkg.basicInfo.name}
            {healthData?.overallHealth && (
              <HealthBadge status={healthData.overallHealth} />
            )}
          </DialogTitle>
          <DialogDescription>
            {healthData?.lastChecked 
              ? `Last checked ${formatDistanceToNow(new Date(healthData.lastChecked), { addSuffix: true })}`
              : 'Health check has not been run for this package'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={handleRunHealthCheck}
              disabled={checking}
              variant="outline"
            >
              {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
              Run Health Check
            </Button>
            <Button 
              onClick={handleRecalculate}
              disabled={recalculating || !hasHealthData}
              variant="default"
            >
              {recalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Recalculate & Update
            </Button>
          </div>

          {/* Health Check Results */}
          {!hasHealthData && !checking && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No Health Data</AlertTitle>
              <AlertDescription>
                Click "Run Health Check" to analyze this package for pricing drift, reach changes, and data freshness.
              </AlertDescription>
            </Alert>
          )}

          {hasHealthData && (
            <>
              {/* Pricing Comparison */}
              {healthData.checks?.pricing && (
                <Card className={getHealthBgClass(
                  healthData.checks.pricing.status === 'current' ? 'healthy' : 
                  healthData.checks.pricing.status === 'outdated' ? 'needs-attention' : 'critical'
                )}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      Pricing Analysis
                      {healthData.checks.pricing.deltaPercent > 0 ? (
                        <TrendingUp className="h-4 w-4 text-amber-600" />
                      ) : healthData.checks.pricing.deltaPercent < 0 ? (
                        <TrendingDown className="h-4 w-4 text-green-600" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Stored Price</p>
                        <p className="text-3xl font-bold">
                          ${healthData.checks.pricing.storedPrice.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Set {formatDistanceToNow(new Date(pkg.analytics?.lastModified || new Date()), { addSuffix: true })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Current Calculated Price</p>
                        <p className="text-3xl font-bold text-blue-600">
                          ${healthData.checks.pricing.currentPrice.toLocaleString()}
                        </p>
                        <p className={`text-sm font-medium mt-1 ${
                          Math.abs(healthData.checks.pricing.deltaPercent) < 5 ? 'text-green-600' :
                          Math.abs(healthData.checks.pricing.deltaPercent) < 15 ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {healthData.checks.pricing.deltaPercent > 0 ? '↑' : healthData.checks.pricing.deltaPercent < 0 ? '↓' : ''}
                          {Math.abs(healthData.checks.pricing.deltaPercent).toFixed(1)}% change
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Reach Comparison */}
              {healthData.checks?.reach && (
                <Card className={getHealthBgClass(
                  healthData.checks.reach.status === 'current' ? 'healthy' : 'needs-attention'
                )}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      Reach Analysis
                      {healthData.checks.reach.status === 'improved' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : healthData.checks.reach.status === 'declined' ? (
                        <TrendingDown className="h-4 w-4 text-amber-600" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Stored Reach</p>
                        <p className="text-3xl font-bold">
                          {healthData.checks.reach.storedReach.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Current Calculated Reach</p>
                        <p className="text-3xl font-bold text-blue-600">
                          {healthData.checks.reach.currentReach.toLocaleString()}
                        </p>
                        <p className={`text-sm font-medium mt-1 ${
                          healthData.checks.reach.status === 'improved' ? 'text-green-600' :
                          healthData.checks.reach.status === 'declined' ? 'text-amber-600' :
                          'text-gray-600'
                        }`}>
                          {healthData.checks.reach.deltaPercent > 0 ? '↑' : healthData.checks.reach.deltaPercent < 0 ? '↓' : ''}
                          {Math.abs(healthData.checks.reach.deltaPercent).toFixed(1)}% change
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Inventory Status */}
              {healthData.checks?.inventory && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Data Freshness</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Package Age</span>
                        <span className="font-semibold">{healthData.checks.inventory.inventoryAge} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span className={`font-semibold ${
                          healthData.checks.inventory.status === 'current' ? 'text-green-600' : 'text-amber-600'
                        }`}>
                          {healthData.checks.inventory.status === 'current' ? 'Current' : 'Stale'}
                        </span>
                      </div>
                      {healthData.checks.inventory.publicationsNeedingUpdate.length > 0 && (
                        <Alert variant="default" className="mt-3">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Publications May Need Update</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside mt-2">
                              {healthData.checks.inventory.publicationsNeedingUpdate.map(pub => (
                                <li key={pub}>{pub}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Availability Issues */}
              {healthData.checks?.availability && healthData.checks.availability.unavailableItems.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Availability Issues</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2">
                      {healthData.checks.availability.unavailableItems.map(item => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Recommended Action */}
              {healthData.recommendedAction && healthData.recommendedAction !== 'none' && (
                <Alert className={
                  healthData.recommendedAction === 'archive' ? 'border-red-300 bg-red-50' :
                  healthData.recommendedAction === 'update-required' ? 'border-amber-300 bg-amber-50' :
                  'border-blue-300 bg-blue-50'
                }>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Recommended Action</AlertTitle>
                  <AlertDescription className="capitalize">
                    {healthData.recommendedAction.replace('-', ' ')}
                  </AlertDescription>
                </Alert>
              )}

              {/* History */}
              {healthData.history && healthData.history.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Health Check History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {healthData.history.slice(-5).reverse().map((entry, idx) => (
                        <div key={idx} className="flex justify-between items-start text-sm border-b pb-2 last:border-b-0">
                          <div>
                            <p className="font-medium">{formatDistanceToNow(new Date(entry.checkedAt), { addSuffix: true })}</p>
                            {entry.changes && entry.changes.length > 0 && (
                              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                                {entry.changes.map((change, cidx) => (
                                  <li key={cidx}>{change}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <HealthBadge status={entry.overallHealth as any} size="sm" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

