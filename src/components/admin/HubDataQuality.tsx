import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface DataQualityIssue {
  severity: 'critical' | 'high' | 'warning';
  type: string;
  count: number;
  description: string;
  items: string[]; // Format: "Publication Name - [Channel] Item Name"
}

interface HubDataQualityStats {
  score: number;
  totalItems: number;
  completeItems: number;
  issues?: any[];
  stats?: {
    totalItems: number;
    totalIssues: number;
    criticalCount: number;
    highCount: number;
    warningCount: number;
    publicationCount: number;
  };
}

interface HubDataQualityProps {
  publications: any[]; // Array of publications in the hub
  hubName?: string;
  preCalculatedQuality?: HubDataQualityStats; // Optional: use pre-calculated quality from parent
}

/**
 * HubDataQuality Component
 * 
 * Aggregates inventory quality across all publications in a hub and displays:
 * - Overall hub inventory quality score (0-100%)
 * - Breakdown of issues by severity
 * - Publication-specific issues
 * - Expandable details for each issue type
 */
export const HubDataQuality: React.FC<HubDataQualityProps> = ({ publications, hubName = "Hub", preCalculatedQuality }) => {
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  // If pre-calculated quality is provided, use it for the score
  const calculatedData = useMemo(() => {
    // If we have pre-calculated data with the simple format, use it
    if (preCalculatedQuality && !preCalculatedQuality.issues) {
      // Calculate the full detailed issues for the detailed view
      const fullCalculation = calculateFullHubQuality();
      return {
        score: preCalculatedQuality.score,
        issues: fullCalculation.issues,
        stats: {
          ...fullCalculation.stats,
          totalItems: preCalculatedQuality.totalItems,
        }
      };
    }
    // Otherwise calculate everything
    return calculateFullHubQuality();
  }, [publications, preCalculatedQuality]);

  function calculateFullHubQuality() {
    const allIssues: DataQualityIssue[] = [];
    let totalItems = 0;
    let totalIssues = 0;
    let criticalCount = 0;
    let highCount = 0;
    let warningCount = 0;

    publications.forEach(pub => {
      const pubName = pub.basicInfo?.publicationName || pub.name || 'Unknown Publication';
      
      // Helper to add channel prefix to item name
      const formatItemName = (itemName: string, channel: string) => {
        return `${pubName} - [${channel}] ${itemName}`;
      };

      // Helper to analyze an inventory item
      const analyzeInventoryItem = (item: any, channel: string, pubName: string) => {
        const issues: DataQualityIssue[] = [];
        const itemName = formatItemName(item.name || item.adFormat || 'Unnamed', channel);
        totalItems++;

        // Get default pricing (handle both object and array formats)
        let defaultPricing = Array.isArray(item.pricing) ? item.pricing[0] : item.pricing;
        if (!defaultPricing) {
          defaultPricing = {};
        }

        // Handle nested pricing structure (e.g., print ads with tier.pricing)
        const getPricingValue = (tier: any, key: string) => {
          if (tier.pricing && tier.pricing[key] !== undefined) {
            return tier.pricing[key];
          }
          return tier[key];
        };

        // Issue 1: Missing pricingModel (CRITICAL)
        const pricingModel = getPricingValue(defaultPricing, 'pricingModel');
        if (!pricingModel) {
          issues.push({
            severity: 'critical',
            type: 'Missing Pricing Model',
            count: 1,
            description: 'pricingModel field is required for calculations',
            items: [itemName]
          });
        }

        // Issue 2: Missing flatRate when required
        if (pricingModel && pricingModel !== 'contact') {
          const flatRate = getPricingValue(defaultPricing, 'flatRate');
          if (!flatRate || flatRate === 0) {
            issues.push({
              severity: 'critical',
              type: 'Missing Price',
              count: 1,
              description: 'flatRate is 0 or missing (required for non-contact pricing)',
              items: [itemName]
            });
          }
        }

        // Issue 3: Zero price (even if model allows it)
        const flatRate = getPricingValue(defaultPricing, 'flatRate');
        if (flatRate === 0 && pricingModel !== 'contact') {
          issues.push({
            severity: 'high',
            type: 'Zero Price',
            count: 1,
            description: 'Price is set to $0',
            items: [itemName]
          });
        }

        // Issue 4: Occurrence-based without occurrencesPerMonth
        const occurrenceModels = ['per_send', 'per_ad', 'per_spot', 'per_post', 'per_episode', 'per_story'];
        if (
          pricingModel && 
          occurrenceModels.includes(pricingModel)
        ) {
          if (!item.performanceMetrics?.occurrencesPerMonth) {
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
        const impressionModels = ['cpm', 'cpd', 'cpv'];
        if (
          pricingModel && 
          impressionModels.includes(pricingModel) && 
          !item.performanceMetrics?.impressionsPerMonth
        ) {
          issues.push({
            severity: 'warning',
            type: 'Missing Performance Metrics',
            count: 1,
            description: 'impressionsPerMonth needed for CPM/CPD/CPV calculations',
            items: [itemName]
          });
        }

        // Issue 6: Missing 1x tier for multi-tier pricing
        if (Array.isArray(item.pricing) && item.pricing.length > 1) {
          const pricingModels = item.pricing.map((tier: any) => {
            return getPricingValue(tier, 'pricingModel');
          });
          const uniqueModels = new Set(pricingModels.filter(Boolean));
          
          if (uniqueModels.size === 1) {
            const has1xTier = item.pricing.some((tier: any) => {
              const freq = getPricingValue(tier, 'frequency');
              return freq === '1x' || freq === 'One time' || freq === 'onetime';
            });
            
            if (!has1xTier) {
              issues.push({
                severity: 'warning',
                type: 'Missing Base Tier',
                count: 1,
                description: 'Multi-tier pricing should include a 1x base tier',
                items: [itemName]
              });
            }
          }
        }

        // Issue 7: Legacy hub pricing structure (duplicate hub entries)
        if (item.hubPricing && Array.isArray(item.hubPricing) && item.hubPricing.length > 1) {
          const hubKeys = item.hubPricing.map((hp: any) => hp.hubId || hp.hubName || 'unknown');
          const uniqueHubs = new Set(hubKeys);
          
          if (hubKeys.length > uniqueHubs.size) {
            const duplicates: string[] = [];
            const seen = new Set();
            hubKeys.forEach((key: string) => {
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

        // Issue 8: Print dimension validation (CRITICAL for creative asset matching)
        if (channel.toLowerCase() === 'print') {
          const dimensions = item.dimensions;
          
          if (!dimensions) {
            issues.push({
              severity: 'high',
              type: 'Missing Print Dimensions',
              count: 1,
              description: 'Dimensions required for PDF asset matching',
              items: [itemName]
            });
          } else {
            // Check if dimensions are parseable (inline check to avoid external dependencies)
            const isParseable = (dim: string) => {
              let cleaned = dim.replace(/["']/g, '').trim().split(/\s+or\s+/i)[0].trim();
              const patterns = [
                /^\d+(?:[-.]\d+)?(?:\/\d+)?\s*(?:"|inches?)?\s*wide\s*[x×]\s*\d+/i,
                /^\d+(?:[-.]\d+)?(?:\/\d+)?\s*(?:"|inches?)?\s*[Ww]\s*[x×]\s*\d+/i,
                /^\d+(?:\.\d+)?\s*(?:"|inches?)?\s*[x×]\s*\d+/i,
                /trim:\s*\d+(?:\.\d+)?\s*[x×]\s*\d+/i
              ];
              return patterns.some(p => p.test(cleaned));
            };
            
            if (!isParseable(dimensions)) {
              issues.push({
                severity: 'critical',
                type: 'Invalid Print Dimensions',
                count: 1,
                description: `Cannot parse "${dimensions.substring(0, 30)}${dimensions.length > 30 ? '...' : ''}"`,
                items: [itemName]
              });
            } else if (!/^\d+(?:\.\d+)?"\s*x\s*\d+(?:\.\d+)?"$/.test(dimensions)) {
              // Parseable but not standard format
              issues.push({
                severity: 'warning',
                type: 'Inconsistent Dimension Format',
                count: 1,
                description: 'Dimension format varies across inventory',
                items: [itemName]
              });
            }
          }
        }

        // Issue 9: Newsletter dimension validation (for creative asset matching)
        if (channel.toLowerCase() === 'newsletter') {
          // Prefer format.dimensions (canonical) over legacy dimensions field
          const dimensions = item.format?.dimensions || item.dimensions;
          
          if (!dimensions) {
            issues.push({
              severity: 'warning',
              type: 'Missing Newsletter Dimensions',
              count: 1,
              description: 'Add dimensions for asset matching (e.g., 600x150, 728x90)',
              items: [itemName]
            });
          } else {
            const dimString = Array.isArray(dimensions) ? dimensions.join(', ') : String(dimensions);
            
            // Check for vague/useless dimension values
            const isVagueDim = (dim: string): boolean => {
              const cleaned = dim.toLowerCase().trim();
              const vagueTerms = [
                'multiple', 'various', 'varies', 'variable',
                'contact', 'contact for', 'tbd', 'tba',
                'custom', 'customized', 'flexible',
                'n/a', 'na', 'none', 'not specified',
                'see specs', 'upon request', 'standard', 'default'
              ];
              return vagueTerms.some(term => cleaned === term || cleaned.startsWith(term + ' ') || cleaned.includes('contact'));
            };
            
            // Check if it's a standard newsletter dimension
            const isStandardNewsletterDim = (dim: string | string[] | any): boolean => {
              if (Array.isArray(dim)) {
                return dim.some(d => typeof d === 'string' && isStandardNewsletterDim(d));
              }
              if (typeof dim !== 'string') return false;
              
              const cleaned = dim.toLowerCase().trim();
              const emailStandards = ['600x150', '600x100', '600x200', '600x300'];
              const iabStandards = ['728x90', '300x250', '336x280', '300x600', '160x600', '320x50', '970x250', '120x600'];
              const specialFormats = [
                'full-newsletter', 'full newsletter', 'full email', 'full-email',
                'dedicated send', 'dedicated-send', 'takeover',
                'text-only', 'text only', 'sponsored-content', 'sponsored content',
                'responsive', 'logo-text', 'logo text', 'content-integration'
              ];
              
              const pixelMatch = cleaned.match(/^(\d+)\s*[x×]\s*(\d+)$/);
              if (pixelMatch) {
                const normalized = `${pixelMatch[1]}x${pixelMatch[2]}`;
                if (emailStandards.includes(normalized) || iabStandards.includes(normalized)) {
                  return true;
                }
              }
              
              if (specialFormats.some(fmt => cleaned.includes(fmt))) {
                return true;
              }
              
              return false;
            };
            
            if (isVagueDim(dimString)) {
              issues.push({
                severity: 'critical',
                type: 'Invalid Newsletter Dimensions',
                count: 1,
                description: `"${dimString.substring(0, 20)}${dimString.length > 20 ? '...' : ''}" is not usable for asset matching`,
                items: [itemName]
              });
            } else if (!isStandardNewsletterDim(dimensions)) {
              issues.push({
                severity: 'warning',
                type: 'Non-Standard Newsletter Dimension',
                count: 1,
                description: `"${dimString.substring(0, 25)}${dimString.length > 25 ? '...' : ''}" is non-standard`,
                items: [itemName]
              });
            }
          }
        }

        // Issue 10: Radio dimension/format validation (for creative asset matching)
        if (channel.toLowerCase() === 'radio') {
          const dimensions = item.format?.dimensions;
          const duration = item.specifications?.duration;
          const adFormat = item.adFormat;
          const fileFormats = item.specifications?.fileFormats;
          
          // Check if radio dimension is valid
          const isValidRadioDim = (dim: string): boolean => {
            if (!dim || typeof dim !== 'string') return false;
            const cleaned = dim.toLowerCase().trim();
            const standardFormats = ['15s', '30s', '60s', 'long-form', 'custom'];
            const durationPattern = /^\d+s$/;
            return standardFormats.includes(cleaned) || durationPattern.test(cleaned);
          };
          
          if (!dimensions && !duration) {
            issues.push({
              severity: 'critical',
              type: 'Missing Radio Duration',
              count: 1,
              description: 'Add duration for asset matching (e.g., 15s, 30s, 60s)',
              items: [itemName]
            });
          } else if (!dimensions && duration) {
            issues.push({
              severity: 'warning',
              type: 'Missing Radio Format Dimensions',
              count: 1,
              description: `Has duration (${duration}s) but missing format.dimensions`,
              items: [itemName]
            });
          } else if (dimensions && !isValidRadioDim(dimensions)) {
            issues.push({
              severity: 'warning',
              type: 'Non-Standard Radio Dimension',
              count: 1,
              description: `"${dimensions}" is non-standard. Use: 15s, 30s, 60s, or long-form`,
              items: [itemName]
            });
          }
          
          if (!adFormat) {
            issues.push({
              severity: 'warning',
              type: 'Missing Radio Ad Format',
              count: 1,
              description: 'Add ad format (e.g., 15_second_spot, 30_second_spot)',
              items: [itemName]
            });
          }
          
          if (!fileFormats || fileFormats.length === 0) {
            issues.push({
              severity: 'warning',
              type: 'Missing Radio File Formats',
              count: 1,
              description: 'Add accepted file formats (e.g., MP3, WAV)',
              items: [itemName]
            });
          }
        }

        // Issue 11: Podcast dimension/format validation (for creative asset matching)
        if (channel.toLowerCase() === 'podcast') {
          const dimensions = item.format?.dimensions;
          const duration = item.specifications?.duration;
          const adFormat = item.adFormat;
          const fileFormats = item.specifications?.fileFormats;
          
          // Check if podcast dimension is valid
          const isValidPodcastDim = (dim: string): boolean => {
            if (!dim || typeof dim !== 'string') return false;
            const cleaned = dim.toLowerCase().trim();
            const standardFormats = [
              'pre-roll', 'preroll', 'mid-roll', 'midroll', 'post-roll', 'postroll',
              '15s', '30s', '60s', 'host-read', 'host read', 'sponsorship', 'custom'
            ];
            const durationPattern = /^\d+s$/;
            return standardFormats.includes(cleaned) || durationPattern.test(cleaned);
          };
          
          if (!dimensions && !adFormat) {
            issues.push({
              severity: 'critical',
              type: 'Missing Podcast Format',
              count: 1,
              description: 'Add format for asset matching (e.g., pre-roll, 30s, 60s, host-read)',
              items: [itemName]
            });
          } else if (!dimensions && (duration || adFormat)) {
            issues.push({
              severity: 'warning',
              type: 'Missing Podcast Format Dimensions',
              count: 1,
              description: 'Missing format.dimensions for asset matching',
              items: [itemName]
            });
          } else if (dimensions && !isValidPodcastDim(dimensions)) {
            issues.push({
              severity: 'warning',
              type: 'Non-Standard Podcast Dimension',
              count: 1,
              description: `"${dimensions}" is non-standard. Use: pre-roll, 30s, 60s, host-read, sponsorship`,
              items: [itemName]
            });
          }
          
          if (!adFormat) {
            issues.push({
              severity: 'warning',
              type: 'Missing Podcast Ad Format',
              count: 1,
              description: 'Add ad format (e.g., pre_roll, mid_roll_30, host_read)',
              items: [itemName]
            });
          }
          
          if (!fileFormats || fileFormats.length === 0) {
            issues.push({
              severity: 'warning',
              type: 'Missing Podcast File Formats',
              count: 1,
              description: 'Add accepted file formats (e.g., MP3, WAV, TXT)',
              items: [itemName]
            });
          }
        }

        return issues;
      };

      // Analyze website ads
      if (pub.distributionChannels?.website?.advertisingOpportunities) {
        pub.distributionChannels.website.advertisingOpportunities.forEach((ad: any) => {
          const issues = analyzeInventoryItem(ad, 'Website', pubName);
          allIssues.push(...issues);
        });
      }

      // Analyze newsletters
      if (pub.distributionChannels?.newsletters) {
        pub.distributionChannels.newsletters.forEach((newsletter: any) => {
          newsletter.advertisingOpportunities?.forEach((ad: any) => {
            const issues = analyzeInventoryItem(ad, 'Newsletter', pubName);
            allIssues.push(...issues);
          });
        });
      }

      // Analyze print ads
      if (pub.distributionChannels?.print) {
        const printArray = Array.isArray(pub.distributionChannels.print) 
          ? pub.distributionChannels.print 
          : [pub.distributionChannels.print];
        
        printArray.forEach((print: any) => {
          print.advertisingOpportunities?.forEach((ad: any) => {
            const issues = analyzeInventoryItem(ad, 'Print', pubName);
            allIssues.push(...issues);
          });
        });
      }

      // Analyze podcasts
      if (pub.distributionChannels?.podcasts) {
        pub.distributionChannels.podcasts.forEach((podcast: any) => {
          podcast.advertisingOpportunities?.forEach((ad: any) => {
            const issues = analyzeInventoryItem(ad, 'Podcast', pubName);
            allIssues.push(...issues);
          });
        });
      }

      // Analyze radio stations
      if (pub.distributionChannels?.radioStations) {
        pub.distributionChannels.radioStations.forEach((radio: any) => {
          if (radio.shows && radio.shows.length > 0) {
            radio.shows.forEach((show: any) => {
              show.advertisingOpportunities?.forEach((ad: any) => {
                const issues = analyzeInventoryItem(ad, 'Radio', pubName);
                allIssues.push(...issues);
              });
            });
          } else if (radio.advertisingOpportunities) {
            radio.advertisingOpportunities.forEach((ad: any) => {
              const issues = analyzeInventoryItem(ad, 'Radio', pubName);
              allIssues.push(...issues);
            });
          }
        });
      }

      // Analyze streaming (with channel-level checks)
      if (pub.distributionChannels?.streamingVideo) {
        pub.distributionChannels.streamingVideo.forEach((stream: any) => {
          const streamName = stream.name || 'Unnamed Channel';
          
          // Count the channel itself as an item to be checked
          totalItems++;
          
          // Channel-level streaming issues
          // Issue: Missing frequency (critical for revenue calculations)
          if (!stream.frequency) {
            allIssues.push({
              severity: 'critical',
              type: 'Missing Frequency',
              count: 1,
              description: 'Publishing frequency is required to calculate impressions/month',
              items: [formatItemName(streamName, 'Streaming')]
            });
          }
          
          // Issue: Missing averageViews (critical for CPM/CPV calculations)
          if (!stream.averageViews && stream.advertisingOpportunities?.some((ad: any) => 
            ['cpm', 'cpv'].includes(ad.pricing?.pricingModel)
          )) {
            allIssues.push({
              severity: 'critical',
              type: 'Missing Performance Data',
              count: 1,
              description: 'averageViews is required for CPM/CPV pricing',
              items: [formatItemName(streamName, 'Streaming')]
            });
          }
          
          // Issue: Missing platform
          if (!stream.platform || (Array.isArray(stream.platform) && stream.platform.length === 0)) {
            allIssues.push({
              severity: 'warning',
              type: 'Missing Platform',
              count: 1,
              description: 'Platform should be specified (YouTube, Twitch, etc.)',
              items: [formatItemName(streamName, 'Streaming')]
            });
          }
          
          // Check individual streaming ads
          stream.advertisingOpportunities?.forEach((ad: any) => {
            const issues = analyzeInventoryItem(ad, 'Streaming', pubName);
            allIssues.push(...issues);
          });
        });
      }

      // Analyze social media
      if (pub.distributionChannels?.socialMedia) {
        pub.distributionChannels.socialMedia.forEach((social: any) => {
          social.advertisingOpportunities?.forEach((ad: any) => {
            const issues = analyzeInventoryItem(ad, 'Social Media', pubName);
            allIssues.push(...issues);
          });
        });
      }

      // Analyze events
      if (pub.distributionChannels?.events) {
        pub.distributionChannels.events.forEach((event: any) => {
          event.advertisingOpportunities?.forEach((ad: any) => {
            const issues = analyzeInventoryItem(ad, 'Events', pubName);
            allIssues.push(...issues);
          });
        });
      }
    });

    // Consolidate issues by type
    const consolidatedIssues = new Map<string, DataQualityIssue>();
    allIssues.forEach(issue => {
      const key = `${issue.severity}-${issue.type}`;
      if (consolidatedIssues.has(key)) {
        const existing = consolidatedIssues.get(key)!;
        existing.count += issue.count;
        existing.items.push(...issue.items);
      } else {
        consolidatedIssues.set(key, { ...issue });
      }
    });

    const consolidatedArray = Array.from(consolidatedIssues.values());
    
    // Count by severity
    consolidatedArray.forEach(issue => {
      totalIssues += issue.count;
      if (issue.severity === 'critical') criticalCount += issue.count;
      else if (issue.severity === 'high') highCount += issue.count;
      else warningCount += issue.count;
    });

    // Calculate score (0-100%)
    const scoreValue = totalItems > 0 
      ? Math.round(((totalItems - totalIssues) / totalItems) * 100)
      : 100;

    return {
      score: scoreValue,
      issues: consolidatedArray.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, warning: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      stats: {
        totalItems,
        totalIssues,
        criticalCount,
        highCount,
        warningCount,
        publicationCount: publications.length
      }
    };
  }

  const { score, issues, stats } = calculatedData;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'warning':
        return <Info className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Inventory Quality Score</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {stats.publicationCount} publication{stats.publicationCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score Display */}
        <div className="flex items-center justify-between pb-2 border-b">
          <div className="flex items-center gap-3">
            <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
              {score}%
            </div>
            <div className="text-sm text-muted-foreground">
              {stats.totalItems} inventory items
            </div>
          </div>
          {score === 100 && (
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          )}
        </div>

        {/* Issues Summary */}
        {issues.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Issues Found</span>
              <div className="flex gap-2">
                {stats.criticalCount > 0 && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    {stats.criticalCount} Critical
                  </Badge>
                )}
                {stats.highCount > 0 && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    {stats.highCount} High
                  </Badge>
                )}
                {stats.warningCount > 0 && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    {stats.warningCount} Warning
                  </Badge>
                )}
              </div>
            </div>

            {/* Issue Details */}
            <div className="space-y-2">
              {issues.map((issue, index) => (
                <div key={index} className="space-y-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between text-left h-auto py-2 px-3"
                    onClick={() => setExpandedIssue(expandedIssue === issue.type ? null : issue.type)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {getSeverityIcon(issue.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm flex items-center gap-2">
                          <span>{issue.count} ×</span>
                          <span className="truncate">{issue.type}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {issue.description}
                        </div>
                      </div>
                    </div>
                    {expandedIssue === issue.type ? (
                      <ChevronUp className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 flex-shrink-0" />
                    )}
                  </Button>

                  {/* Expanded Items List */}
                  {expandedIssue === issue.type && (
                    <div className="ml-6 p-3 bg-gray-50 rounded-md border max-h-60 overflow-y-auto">
                      <div className="text-xs font-medium text-gray-700 mb-2">
                        Affected Items:
                      </div>
                      <ul className="space-y-1">
                        {issue.items.map((item, idx) => (
                          <li key={idx} className="text-xs text-gray-600">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-green-600 py-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>All hub inventory has complete pricing data</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

