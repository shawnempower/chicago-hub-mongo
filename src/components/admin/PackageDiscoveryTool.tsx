import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  Users, 
  MapPin,
  Radio,
  Loader2,
  ChevronRight,
  Check
} from 'lucide-react';
import { InventoryAnalysis, PackageRecommendation } from '@/integrations/mongodb/hubPackageSchema';
import { API_BASE_URL } from '@/config/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const PackageDiscoveryTool = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'recommend'>('inventory');
  const [loading, setLoading] = useState(false);
  
  // Inventory Analysis State
  const [inventoryFilters, setInventoryFilters] = useState({
    geographicArea: '',
    minVisitors: ''
  });
  const [inventoryResults, setInventoryResults] = useState<InventoryAnalysis[]>([]);
  
  // Recommendation State
  const [recommendCriteria, setRecommendCriteria] = useState({
    budget: '',
    targetAudience: '',
    geographicArea: '',
    goals: [] as string[],
    channels: [] as string[]
  });
  const [recommendations, setRecommendations] = useState<PackageRecommendation[]>([]);
  
  const { toast } = useToast();

  const analyzeInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (inventoryFilters.geographicArea) params.append('geographic_area', inventoryFilters.geographicArea);
      if (inventoryFilters.minVisitors) params.append('min_visitors', inventoryFilters.minVisitors);

      const response = await fetch(
        `${API_BASE_URL}/api/admin/package-discovery/inventory?${params}`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) throw new Error('Failed to analyze inventory');

      const data = await response.json();
      setInventoryResults(data.inventory || []);
      toast({
        title: 'Success',
        description: `Found ${data.inventory.length} publications with available inventory`
      });
    } catch (error) {
      console.error('Error analyzing inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to analyze inventory',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/package-discovery/recommend`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          budget: recommendCriteria.budget ? parseInt(recommendCriteria.budget) : undefined,
          targetAudience: recommendCriteria.targetAudience || undefined,
          geographicArea: recommendCriteria.geographicArea || undefined,
          goals: recommendCriteria.goals.length > 0 ? recommendCriteria.goals : undefined,
          channels: recommendCriteria.channels.length > 0 ? recommendCriteria.channels : undefined
        })
      });

      if (!response.ok) throw new Error('Failed to generate recommendations');

      const data = await response.json();
      setRecommendations(data.recommendations || []);
      toast({
        title: 'Success',
        description: `Generated ${data.recommendations.length} package recommendations`
      });
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate recommendations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayItem = (arr: string[], item: string) => {
    return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-yellow-500" />
          Package Discovery Tool
        </h1>
        <p className="text-muted-foreground mt-1">
          Analyze inventory and get AI-powered package recommendations
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'inventory' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('inventory')}
          className="rounded-b-none"
        >
          <Radio className="h-4 w-4 mr-2" />
          Inventory Analysis
        </Button>
        <Button
          variant={activeTab === 'recommend' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('recommend')}
          className="rounded-b-none"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Package Recommendations
        </Button>
      </div>

      {/* Inventory Analysis Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analyze Available Inventory</CardTitle>
              <CardDescription>
                Discover what inventory is available across all publications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Geographic Area (DMA normalized)</Label>
                  <Input
                    placeholder="e.g., chicago-il"
                    value={inventoryFilters.geographicArea}
                    onChange={(e) => setInventoryFilters({
                      ...inventoryFilters,
                      geographicArea: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label>Minimum Monthly Visitors</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 50000"
                    value={inventoryFilters.minVisitors}
                    onChange={(e) => setInventoryFilters({
                      ...inventoryFilters,
                      minVisitors: e.target.value
                    })}
                  />
                </div>
              </div>
              <Button onClick={analyzeInventory} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Analyze Inventory
              </Button>
            </CardContent>
          </Card>

          {/* Inventory Results */}
          {inventoryResults.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">
                Found {inventoryResults.length} Publications
              </h2>
              
              <div className="grid gap-4">
                {inventoryResults.map((result, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{result.publicationName}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Publication ID: {result.publicationId}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {result.availableInventory.reduce((sum, inv) => sum + inv.items.length, 0)} items
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          {result.totalMonthlyReach && (
                            <div>
                              <p className="text-muted-foreground">Monthly Reach</p>
                              <p className="font-semibold">{result.totalMonthlyReach.toLocaleString()}</p>
                            </div>
                          )}
                          {result.totalMonthlyImpressions && (
                            <div>
                              <p className="text-muted-foreground">Monthly Impressions</p>
                              <p className="font-semibold">{result.totalMonthlyImpressions.toLocaleString()}</p>
                            </div>
                          )}
                          {result.geographicCoverage && (
                            <div>
                              <p className="text-muted-foreground">Coverage Areas</p>
                              <p className="font-semibold">{result.geographicCoverage.length}</p>
                            </div>
                          )}
                        </div>

                        {/* Inventory by Channel */}
                        <div className="space-y-2">
                          {result.availableInventory.map((inventory, invIndex) => (
                            <div key={invIndex} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold capitalize">{inventory.channel}</h4>
                                <Badge variant="outline">{inventory.items.length} items</Badge>
                              </div>
                              <div className="space-y-1">
                                {inventory.items.slice(0, 3).map((item, itemIndex) => (
                                  <div key={itemIndex} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{item.name}</span>
                                    <span className="font-semibold">
                                      ${item.pricing.hub.toLocaleString()} ({item.pricing.model})
                                    </span>
                                  </div>
                                ))}
                                {inventory.items.length > 3 && (
                                  <p className="text-xs text-muted-foreground">
                                    +{inventory.items.length - 3} more items
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Package Recommendations Tab */}
      {activeTab === 'recommend' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Package Recommendations</CardTitle>
              <CardDescription>
                Get AI-powered suggestions for packages based on your criteria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Budget</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 10000"
                    value={recommendCriteria.budget}
                    onChange={(e) => setRecommendCriteria({
                      ...recommendCriteria,
                      budget: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label>Target Audience</Label>
                  <Input
                    placeholder="e.g., Young professionals"
                    value={recommendCriteria.targetAudience}
                    onChange={(e) => setRecommendCriteria({
                      ...recommendCriteria,
                      targetAudience: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label>Geographic Area</Label>
                  <Input
                    placeholder="e.g., chicago-il"
                    value={recommendCriteria.geographicArea}
                    onChange={(e) => setRecommendCriteria({
                      ...recommendCriteria,
                      geographicArea: e.target.value
                    })}
                  />
                </div>
              </div>

              {/* Channel Selection */}
              <div>
                <Label>Preferred Channels</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['website', 'print', 'newsletter', 'social', 'radio'].map(channel => (
                    <Button
                      key={channel}
                      variant={recommendCriteria.channels.includes(channel) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRecommendCriteria({
                        ...recommendCriteria,
                        channels: toggleArrayItem(recommendCriteria.channels, channel)
                      })}
                    >
                      {recommendCriteria.channels.includes(channel) && <Check className="mr-1 h-3 w-3" />}
                      {channel}
                    </Button>
                  ))}
                </div>
              </div>

              <Button onClick={generateRecommendations} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Recommendations
              </Button>
            </CardContent>
          </Card>

          {/* Recommendations Results */}
          {recommendations.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">
                {recommendations.length} Recommended Package{recommendations.length !== 1 ? 's' : ''}
              </h2>
              
              <div className="grid gap-4">
                {recommendations.map((rec, index) => (
                  <Card key={index} className="border-2 border-primary/20">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {rec.name}
                            <Badge variant="secondary" className="ml-2">
                              {(rec.confidence * 100).toFixed(0)}% confidence
                            </Badge>
                          </CardTitle>
                          <CardDescription className="mt-2">{rec.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                          <div>
                            <p className="text-xs text-muted-foreground">Publications</p>
                            <p className="text-lg font-bold">{rec.suggestedPublications.length}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Est. Price</p>
                            <p className="text-lg font-bold">
                              ${rec.estimatedPrice.min.toLocaleString()}-${rec.estimatedPrice.max.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Est. Reach</p>
                            <p className="text-lg font-bold">
                              {rec.estimatedReach.min.toLocaleString()}-{rec.estimatedReach.max.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Audience</p>
                            <p className="text-sm font-semibold">{rec.targetAudience}</p>
                          </div>
                        </div>

                        {/* Reasoning */}
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm font-semibold text-blue-900 mb-1">Why this package?</p>
                          <p className="text-sm text-blue-800">{rec.reasoning}</p>
                        </div>

                        {/* Action Button */}
                        <Button className="w-full" size="lg">
                          <ChevronRight className="mr-2 h-4 w-4" />
                          Create This Package
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

