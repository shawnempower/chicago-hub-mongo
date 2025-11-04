import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { Publication } from '@/integrations/mongodb/schemas';
import { usePublication } from '@/contexts/PublicationContext';

interface DataQualityIssue {
  severity: 'critical' | 'warning' | 'info';
  type: string;
  count: number;
  description: string;
  items: string[]; // Item names with issues
}

interface DataQualityScore {
  score: number; // 0-100
  totalItems: number;
  completeItems: number;
  issuesCount: number;
  criticalCount: number;
  issues: DataQualityIssue[];
}

interface Props {
  publication: Publication | any; // Accept both Publication and PublicationFrontend types
  onViewDetails?: () => void;
}

/**
 * Analyzes a single inventory item for data quality issues
 */
function analyzeInventoryItem(
  item: any,
  channel: string,
  itemName: string
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  
  // Handle nested pricing structure (print ads often have tier.pricing.flatRate)
  let defaultPricing;
  if (Array.isArray(item.pricing) && item.pricing.length > 0) {
    const firstTier = item.pricing[0];
    // Check if pricing is nested (tier.pricing.flatRate) or flat (tier.flatRate)
    defaultPricing = firstTier.pricing || firstTier;
  } else {
    defaultPricing = item.pricing;
  }

  // Issue 1: Missing pricing entirely
  if (!defaultPricing) {
    issues.push({
      severity: 'critical',
      type: 'Missing Pricing',
      count: 1,
      description: 'No pricing data found',
      items: [itemName]
    });
    return issues; // Can't check further without pricing
  }

  // Issue 2: Missing flatRate (but NOT contact pricing)
  if (
    defaultPricing.pricingModel !== 'contact' && 
    !defaultPricing.flatRate && 
    defaultPricing.flatRate !== 0
  ) {
    issues.push({
      severity: 'critical',
      type: 'Missing Price',
      count: 1,
      description: 'flatRate is required for this pricing model',
      items: [itemName]
    });
  }

  // Issue 3: Missing pricingModel
  if (!defaultPricing.pricingModel) {
    issues.push({
      severity: 'critical',
      type: 'Missing Pricing Model',
      count: 1,
      description: 'pricingModel field is required',
      items: [itemName]
    });
  }

  // Issue 4: Occurrence-based without occurrencesPerMonth
  const occurrenceModels = ['per_send', 'per_ad', 'per_spot', 'per_post', 'per_episode', 'per_story'];
  if (
    defaultPricing.pricingModel && 
    occurrenceModels.includes(defaultPricing.pricingModel)
  ) {
    if (!item.performanceMetrics?.occurrencesPerMonth) {
      // For radio (per_spot) and podcasts (per_episode), missing occurrences is CRITICAL
      // because show frequency doesn't equal ad occurrences
      const isCritical = channel === 'Radio' || channel === 'Podcast';
      
      issues.push({
        severity: isCritical ? 'critical' : 'warning',
        type: isCritical ? 'Missing Performance Metrics' : 'Missing Frequency Data',
        count: 1,
        description: isCritical 
          ? 'occurrencesPerMonth is required - cannot calculate revenue without it'
          : 'occurrencesPerMonth needed for accurate revenue calculation',
        items: [itemName]
      });
    }
  }

  // Issue 5: Impression-based without impressionsPerMonth
  const impressionModels = ['cpm', 'cpd', 'cpv', 'cpc'];
  if (
    defaultPricing.pricingModel && 
    impressionModels.includes(defaultPricing.pricingModel)
  ) {
    if (!item.performanceMetrics?.impressionsPerMonth && !item.monthlyImpressions) {
      issues.push({
        severity: 'warning',
        type: 'Missing Impression Data',
        count: 1,
        description: 'impressionsPerMonth needed for CPM/CPC calculation',
        items: [itemName]
      });
    }
  }

  // Issue 6: Zero price (ambiguous - could be free or incomplete)
  if (
    defaultPricing.flatRate === 0 && 
    defaultPricing.pricingModel !== 'contact'
  ) {
    issues.push({
      severity: 'info',
      type: 'Zero Price',
      count: 1,
      description: 'Verify if intentionally free',
      items: [itemName]
    });
  }

  // Issue 7: Multi-tier without 1x tier
  // Only check if tiers use the same pricing model (true tiers, not alternative pricing)
  if (Array.isArray(item.pricing) && item.pricing.length > 0) {
    // Check if all tiers have the same pricing model
    const pricingModels = item.pricing.map((tier: any) => {
      const pricing = tier.pricing || tier;
      return pricing.pricingModel;
    }).filter(Boolean);
    
    const uniqueModels = [...new Set(pricingModels)];
    
    // Only check for 1x tier if all tiers use the same pricing model
    if (uniqueModels.length === 1) {
      const has1x = item.pricing.some((tier: any) => {
        // Handle nested structure (tier.pricing.frequency) or flat (tier.frequency)
        const pricing = tier.pricing || tier;
        const freq = (pricing.frequency || '').toLowerCase();
        return freq === '1x' || freq.includes('one time') || freq === 'onetime';
      });
      
      if (!has1x) {
        issues.push({
          severity: 'info',
          type: 'Missing Base Tier',
          count: 1,
          description: 'No 1x tier found in multi-tier pricing',
          items: [itemName]
        });
      }
    }
    // If different pricing models, they're alternative pricing options, not tiers - no warning needed
  }

  // Issue 8: Legacy hub pricing structure (duplicate hub entries)
  // After migration, each hub should have only one entry with pricing as array
  if (item.hubPricing && Array.isArray(item.hubPricing) && item.hubPricing.length > 1) {
    const hubKeys = item.hubPricing.map((hp: any) => hp.hubId || hp.hubName || 'unknown');
    const uniqueHubs = new Set(hubKeys);
    
    if (hubKeys.length > uniqueHubs.size) {
      // Found duplicate hub entries - legacy structure
      const duplicates: string[] = [];
      const seen = new Set();
      hubKeys.forEach(key => {
        if (seen.has(key)) {
          duplicates.push(key);
        }
        seen.add(key);
      });
      
      issues.push({
        severity: 'warning',
        type: 'Legacy Hub Pricing Structure',
        count: 1,
        description: `Hub pricing has duplicate entries for: ${[...new Set(duplicates)].join(', ')}. Needs migration to consolidate tiers.`,
        items: [itemName]
      });
    }
  }

  return issues;
}

/**
 * Calculate comprehensive data quality score for a publication
 */
function calculateDataQuality(publication: Publication | any): DataQualityScore {
  const allIssues: DataQualityIssue[] = [];
  let totalItems = 0;
  let completeItems = 0;

  // Helper to check all items in a channel
  const checkChannel = (items: any[], channel: string, getItemName: (item: any) => string) => {
    items?.forEach(item => {
      const itemName = getItemName(item);
      totalItems++;
      
      const itemIssues = analyzeInventoryItem(item, channel, itemName);
      
      if (itemIssues.length === 0) {
        completeItems++;
      } else {
        allIssues.push(...itemIssues);
      }
    });
  };

  const channels = publication.distributionChannels || {};

  // Check Website
  if (channels.website?.advertisingOpportunities) {
    checkChannel(
      channels.website.advertisingOpportunities,
      'Website',
      (item) => `[Website] ${item.name || 'Unnamed Ad'}`
    );
  }

  // Check Newsletters
  channels.newsletters?.forEach(newsletter => {
    checkChannel(
      newsletter.advertisingOpportunities || [],
      'Newsletter',
      (item) => `[Newsletter] ${newsletter.name} - ${item.name || 'Unnamed'}`
    );
  });

  // Check Print
  const printArray = Array.isArray(channels.print) 
    ? channels.print 
    : channels.print ? [channels.print] : [];
  
  printArray.forEach(print => {
    checkChannel(
      print.advertisingOpportunities || [],
      'Print',
      (item) => `[Print] ${print.name || 'Print'} - ${item.name || 'Unnamed'}`
    );
  });

  // Check Podcasts
  channels.podcasts?.forEach(podcast => {
    checkChannel(
      podcast.advertisingOpportunities || [],
      'Podcast',
      (item) => `[Podcast] ${podcast.name} - ${item.name || 'Unnamed'}`
    );
  });

  // Check Social Media
  channels.socialMedia?.forEach(profile => {
    checkChannel(
      profile.advertisingOpportunities || [],
      'Social Media',
      (item) => `[Social] ${profile.platform} - ${item.name || 'Unnamed'}`
    );
  });

  // Check Streaming (with special channel-level checks)
  channels.streamingVideo?.forEach(stream => {
    const streamName = stream.name || 'Unnamed Channel';
    
    // Count the channel itself as an item to be checked
    totalItems++;
    
    // Check streaming channel-level data quality
    const channelIssues: DataQualityIssue[] = [];
    
    // Issue: Missing frequency (critical for revenue calculations)
    if (!stream.frequency) {
      channelIssues.push({
        severity: 'critical',
        type: 'Missing Frequency',
        count: 1,
        description: 'Publishing frequency is required to calculate impressions/month',
        items: [`[Streaming] ${streamName}`]
      });
    }
    
    // Issue: Missing averageViews (critical for CPM/CPV calculations)
    if (!stream.averageViews && stream.advertisingOpportunities?.some((ad: any) => 
      ['cpm', 'cpv'].includes(ad.pricing?.pricingModel)
    )) {
      channelIssues.push({
        severity: 'critical',
        type: 'Missing Performance Data',
        count: 1,
        description: 'averageViews is required for CPM/CPV pricing',
        items: [`[Streaming] ${streamName}`]
      });
    }
    
    // Issue: Missing platform
    if (!stream.platform || (Array.isArray(stream.platform) && stream.platform.length === 0)) {
      channelIssues.push({
        severity: 'warning',
        type: 'Missing Platform',
        count: 1,
        description: 'Platform should be specified (YouTube, Twitch, etc.)',
        items: [`[Streaming] ${streamName}`]
      });
    }
    
    // Issue: Missing subscribers (less critical, but useful)
    if (!stream.subscribers || stream.subscribers === 0) {
      channelIssues.push({
        severity: 'info',
        type: 'Missing Audience Data',
        count: 1,
        description: 'Subscriber count helps with audience reach metrics',
        items: [`[Streaming] ${streamName}`]
      });
    }
    
    // If no channel-level issues, count as complete
    if (channelIssues.length === 0) {
      completeItems++;
    }
    
    // Add channel-level issues
    allIssues.push(...channelIssues);
    
    // Check each streaming ad
    checkChannel(
      stream.advertisingOpportunities || [],
      'Streaming',
      (item) => `[Streaming] ${streamName} - ${item.name || 'Unnamed'}`
    );
  });

  // Check Radio
  channels.radioStations?.forEach(station => {
    if (station.shows && station.shows.length > 0) {
      station.shows.forEach(show => {
        checkChannel(
          show.advertisingOpportunities || [],
          'Radio',
          (item) => `[Radio] ${station.callSign} - ${show.name} - ${item.name || 'Unnamed'}`
        );
      });
    } else {
      checkChannel(
        station.advertisingOpportunities || [],
        'Radio',
        (item) => `[Radio] ${station.callSign} - ${item.name || 'Unnamed'}`
      );
    }
  });

  // Check Events
  channels.events?.forEach(event => {
    checkChannel(
      event.advertisingOpportunities || [],
      'Events',
      (item) => `[Event] ${event.name} - ${item.level || 'Unnamed'}`
    );
  });

  // Aggregate issues by type
  const aggregatedIssues: Map<string, DataQualityIssue> = new Map();
  
  allIssues.forEach(issue => {
    const key = `${issue.severity}-${issue.type}`;
    if (aggregatedIssues.has(key)) {
      const existing = aggregatedIssues.get(key)!;
      existing.count += issue.count;
      existing.items.push(...issue.items);
    } else {
      aggregatedIssues.set(key, { ...issue });
    }
  });

  const issuesList = Array.from(aggregatedIssues.values())
    .sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

  const criticalCount = issuesList
    .filter(i => i.severity === 'critical')
    .reduce((sum, i) => sum + i.count, 0);

  // Calculate score (0-100)
  let score = 100;
  if (totalItems > 0) {
    score = Math.round((completeItems / totalItems) * 100);
  }

  return {
    score,
    totalItems,
    completeItems,
    issuesCount: allIssues.length,
    criticalCount,
    issues: issuesList
  };
}

export const PublicationDataQuality: React.FC<Props> = ({ 
  publication, 
  onViewDetails 
}) => {
  const { refreshPublication } = usePublication();
  const quality = useMemo(() => calculateDataQuality(publication), [publication]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshPublication();
    setIsRefreshing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { variant: 'default' as const, label: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (score >= 70) return { variant: 'secondary' as const, label: 'Good', color: 'bg-yellow-100 text-yellow-800' };
    if (score >= 50) return { variant: 'secondary' as const, label: 'Fair', color: 'bg-orange-100 text-orange-800' };
    return { variant: 'destructive' as const, label: 'Needs Attention', color: 'bg-red-100 text-red-800' };
  };

  const badge = getScoreBadge(quality.score);

  if (quality.totalItems === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-5 w-5" />
            Data Quality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              No inventory items found for this publication.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Data Quality Score</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
              title="Refresh data quality score"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Badge className={badge.color}>
              {badge.label}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score Display */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <div className={`text-2xl font-bold ${getScoreColor(quality.score)}`}>
              {quality.score}%
            </div>
            <div className="text-xs text-gray-600 mt-0.5">
              {quality.completeItems} of {quality.totalItems} items complete
            </div>
          </div>
          <div className="text-right">
            {quality.criticalCount === 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">No Critical Issues</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">{quality.criticalCount} Critical</span>
              </div>
            )}
          </div>
        </div>

        {/* Issues Summary - Expandable */}
        {quality.issues.length > 0 ? (
          <div className="space-y-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between font-medium text-sm text-gray-700 hover:text-gray-900 transition-colors"
            >
              <span>Issues Found ({quality.issues.length} {quality.issues.length === 1 ? 'type' : 'types'}):</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            {/* Collapsed View - Summary */}
            {!isExpanded && (
              <div className="space-y-1">
                {quality.issues.slice(0, 3).map((issue, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-2 text-sm p-2 rounded bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setIsExpanded(true)}
                  >
                    {issue.severity === 'critical' && (
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    {issue.severity === 'warning' && (
                      <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    )}
                    {issue.severity === 'info' && (
                      <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">
                        {issue.count} × {issue.type}
                      </div>
                      <div className="text-xs text-gray-600">
                        {issue.description}
                      </div>
                    </div>
                  </div>
                ))}
                {quality.issues.length > 3 && (
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 pl-6 underline"
                  >
                    Click to see {quality.issues.length - 3} more {quality.issues.length - 3 === 1 ? 'issue' : 'issues'} and all affected items
                  </button>
                )}
              </div>
            )}

            {/* Expanded View - Detailed List */}
            {isExpanded && (
              <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                {quality.issues.map((issue, idx) => (
                  <div 
                    key={idx}
                    className="border-b border-gray-200 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {issue.severity === 'critical' && (
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      {issue.severity === 'warning' && (
                        <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      )}
                      {issue.severity === 'info' && (
                        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="font-semibold text-sm">
                          {issue.count} × {issue.type}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {issue.description}
                        </div>
                      </div>
                    </div>
                    
                    {/* List of affected items */}
                    <div className="ml-7 space-y-1">
                      <div className="text-xs font-medium text-gray-700 mb-1">
                        Affected Items:
                      </div>
                      {issue.items.slice(0, 10).map((item, itemIdx) => (
                        <div 
                          key={itemIdx}
                          className="text-xs text-gray-600 pl-3 py-1 bg-white rounded border-l-2 border-gray-300"
                        >
                          • {item}
                        </div>
                      ))}
                      {issue.items.length > 10 && (
                        <div className="text-xs text-gray-500 pl-3 italic">
                          ... and {issue.items.length - 10} more items
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex gap-2">
          {onViewDetails && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onViewDetails}
              className="flex-1"
            >
              View Details
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('/pricing-formulas.html#data-quality', '_blank')}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-3 w-3" />
            Data Quality Guide
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
          <div>
            <div className="text-xl font-bold text-green-600">
              {quality.completeItems}
            </div>
            <div className="text-xs text-gray-600">Complete</div>
          </div>
          <div>
            <div className="text-xl font-bold text-yellow-600">
              {quality.issuesCount - quality.criticalCount}
            </div>
            <div className="text-xs text-gray-600">Warnings</div>
          </div>
          <div>
            <div className="text-xl font-bold text-red-600">
              {quality.criticalCount}
            </div>
            <div className="text-xs text-gray-600">Critical</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

