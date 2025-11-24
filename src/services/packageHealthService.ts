/**
 * Package Health Service
 * 
 * Performs health checks on packages to detect:
 * - Pricing drift (stored vs. current calculated)
 * - Reach drift (stored vs. current calculated)
 * - Inventory availability changes
 * - Stale data
 */

import { HubPackage } from '../integrations/mongodb/hubPackageSchema';
import { calculatePackageReach } from '../utils/reachCalculations';
import { calculatePublicationTotal, calculateCampaignTotal } from '../utils/inventoryPricing';

export interface PackageHealthCheckResult {
  packageId: string;
  packageName: string;
  lastModified: Date;
  checks: {
    pricing: {
      status: 'current' | 'outdated' | 'significant-change';
      storedPrice: number;
      currentPrice: number;
      deltaPercent: number;
    };
    reach: {
      status: 'current' | 'improved' | 'declined';
      storedReach: number;
      currentReach: number;
      deltaPercent: number;
    };
    availability: {
      status: 'available' | 'partially-available' | 'unavailable';
      unavailableItems: string[];
    };
    inventory: {
      status: 'current' | 'stale';
      inventoryAge: number; // days
      publicationsNeedingUpdate: string[];
    };
  };
  recommendedAction: 'none' | 'review' | 'update-required' | 'archive';
  overallHealth: 'healthy' | 'needs-attention' | 'critical';
}

export class PackageHealthService {
  
  /**
   * Run a comprehensive health check on a package
   */
  async runHealthCheck(packageData: HubPackage): Promise<PackageHealthCheckResult> {
    const pricingCheck = this.checkPricing(packageData);
    const reachCheck = this.checkReach(packageData);
    const availabilityCheck = await this.checkAvailability(packageData);
    const inventoryCheck = this.checkInventoryAge(packageData);

    // Determine overall health
    const overallHealth = this.determineOverallHealth(
      pricingCheck,
      reachCheck,
      availabilityCheck,
      inventoryCheck
    );

    // Determine recommended action
    const recommendedAction = this.determineRecommendedAction(
      pricingCheck,
      reachCheck,
      availabilityCheck,
      inventoryCheck,
      overallHealth
    );

    return {
      packageId: packageData.packageId,
      packageName: packageData.basicInfo.name,
      lastModified: packageData.analytics?.lastModified || new Date(),
      checks: {
        pricing: pricingCheck,
        reach: reachCheck,
        availability: availabilityCheck,
        inventory: inventoryCheck,
      },
      recommendedAction,
      overallHealth,
    };
  }

  /**
   * Check pricing drift
   */
  private checkPricing(packageData: HubPackage) {
    const storedPrice = packageData.pricing.breakdown.finalPrice;
    
    // Recalculate current price using shared utilities
    const currentPrice = calculateCampaignTotal(
      packageData.components.publications,
      1 // monthly pricing
    );

    const deltaPercent = ((currentPrice - storedPrice) / storedPrice) * 100;

    let status: 'current' | 'outdated' | 'significant-change' = 'current';
    if (Math.abs(deltaPercent) > 15) {
      status = 'significant-change';
    } else if (Math.abs(deltaPercent) > 5) {
      status = 'outdated';
    }

    return {
      status,
      storedPrice,
      currentPrice,
      deltaPercent: Math.round(deltaPercent * 100) / 100, // Round to 2 decimals
    };
  }

  /**
   * Check reach drift
   */
  private checkReach(packageData: HubPackage) {
    const storedReach = packageData.performance.estimatedReach.minReach;
    
    // Recalculate current reach using shared utilities
    const reachSummary = calculatePackageReach(packageData.components.publications);
    const currentReach = reachSummary.estimatedUniqueReach || 0;

    const deltaPercent = storedReach > 0 
      ? ((currentReach - storedReach) / storedReach) * 100 
      : 0;

    let status: 'current' | 'improved' | 'declined' = 'current';
    if (Math.abs(deltaPercent) > 10) {
      status = deltaPercent > 0 ? 'improved' : 'declined';
    }

    return {
      status,
      storedReach,
      currentReach,
      deltaPercent: Math.round(deltaPercent * 100) / 100,
    };
  }

  /**
   * Check inventory availability
   * Note: For now, this is a placeholder. In the future, we could:
   * - Check if inventory items still exist in publications
   * - Verify with real-time availability data
   * - Check if publications are still active
   */
  private async checkAvailability(packageData: HubPackage) {
    const unavailableItems: string[] = [];
    
    // TODO: Implement real availability checking
    // For now, we check if publications have excluded all items
    packageData.components.publications.forEach(pub => {
      const allExcluded = pub.inventoryItems?.every(item => item.isExcluded);
      if (allExcluded && pub.inventoryItems && pub.inventoryItems.length > 0) {
        unavailableItems.push(`${pub.publicationName} (all items excluded)`);
      }
    });

    let status: 'available' | 'partially-available' | 'unavailable' = 'available';
    if (unavailableItems.length > 0) {
      const totalPubs = packageData.components.publications.length;
      status = unavailableItems.length === totalPubs ? 'unavailable' : 'partially-available';
    }

    return {
      status,
      unavailableItems,
    };
  }

  /**
   * Check inventory age (how stale is the data)
   */
  private checkInventoryAge(packageData: HubPackage) {
    const lastModified = packageData.analytics?.lastModified || new Date();
    const now = new Date();
    const inventoryAge = Math.floor(
      (now.getTime() - new Date(lastModified).getTime()) / (1000 * 60 * 60 * 24)
    );

    let status: 'current' | 'stale' = 'current';
    if (inventoryAge > 30) {
      status = 'stale';
    }

    // Publications that might need updating (older than 60 days)
    const publicationsNeedingUpdate: string[] = [];
    if (inventoryAge > 60) {
      packageData.components.publications.forEach(pub => {
        publicationsNeedingUpdate.push(pub.publicationName);
      });
    }

    return {
      status,
      inventoryAge,
      publicationsNeedingUpdate,
    };
  }

  /**
   * Determine overall health status
   */
  private determineOverallHealth(
    pricing: any,
    reach: any,
    availability: any,
    inventory: any
  ): 'healthy' | 'needs-attention' | 'critical' {
    // Critical conditions
    if (
      availability.status === 'unavailable' ||
      pricing.status === 'significant-change' ||
      Math.abs(reach.deltaPercent) > 25
    ) {
      return 'critical';
    }

    // Needs attention conditions
    if (
      availability.status === 'partially-available' ||
      pricing.status === 'outdated' ||
      reach.status !== 'current' ||
      inventory.status === 'stale'
    ) {
      return 'needs-attention';
    }

    return 'healthy';
  }

  /**
   * Determine recommended action
   */
  private determineRecommendedAction(
    pricing: any,
    reach: any,
    availability: any,
    inventory: any,
    overallHealth: string
  ): 'none' | 'review' | 'update-required' | 'archive' {
    if (availability.status === 'unavailable') {
      return 'archive';
    }

    if (overallHealth === 'critical') {
      return 'update-required';
    }

    if (overallHealth === 'needs-attention') {
      return 'review';
    }

    return 'none';
  }

  /**
   * Recalculate and return updated package values
   * (Does not save to database - that's handled by the service layer)
   */
  recalculatePackageValues(packageData: HubPackage): {
    pricing: {
      finalPrice: number;
      breakdown: any;
    };
    performance: {
      estimatedReach: {
        minReach: number;
        maxReach: number;
        reachDescription: string;
        deduplicatedReach: number;
      };
      estimatedImpressions: {
        minImpressions: number;
        maxImpressions: number;
        impressionsByChannel?: Record<string, number>;
      };
      costPerThousand: number;
    };
  } {
    // Recalculate pricing
    const monthlyCost = calculateCampaignTotal(
      packageData.components.publications,
      1
    );

    // Recalculate reach
    const reachSummary = calculatePackageReach(packageData.components.publications);

    return {
      pricing: {
        finalPrice: monthlyCost,
        breakdown: {
          totalStandardPrice: monthlyCost, // Could calculate with standard pricing if available
          totalHubPrice: monthlyCost,
          packageDiscount: packageData.pricing.breakdown.packageDiscount || 0,
          finalPrice: monthlyCost,
        },
      },
      performance: {
        estimatedReach: {
          minReach: reachSummary.estimatedUniqueReach || 0,
          maxReach: reachSummary.estimatedUniqueReach || 0,
          reachDescription: `${(reachSummary.estimatedUniqueReach || 0).toLocaleString()}+ estimated unique reach`,
          deduplicatedReach: reachSummary.estimatedUniqueReach || 0,
        },
        estimatedImpressions: {
          minImpressions: reachSummary.totalMonthlyImpressions || 0,
          maxImpressions: reachSummary.totalMonthlyImpressions || 0,
          impressionsByChannel: reachSummary.channelAudiences,
        },
        costPerThousand: reachSummary.totalMonthlyImpressions > 0
          ? (monthlyCost / (reachSummary.totalMonthlyImpressions / 1000))
          : 0,
      },
    };
  }

  /**
   * Get health summary for multiple packages
   */
  async getHealthSummary(packages: HubPackage[]): Promise<{
    total: number;
    healthy: number;
    needsAttention: number;
    critical: number;
    packagesNeedingReview: PackageHealthCheckResult[];
  }> {
    const healthChecks = await Promise.all(
      packages.map(pkg => this.runHealthCheck(pkg))
    );

    const summary = {
      total: packages.length,
      healthy: healthChecks.filter(hc => hc.overallHealth === 'healthy').length,
      needsAttention: healthChecks.filter(hc => hc.overallHealth === 'needs-attention').length,
      critical: healthChecks.filter(hc => hc.overallHealth === 'critical').length,
      packagesNeedingReview: healthChecks.filter(
        hc => hc.overallHealth !== 'healthy'
      ),
    };

    return summary;
  }
}

// Export singleton instance
export const packageHealthService = new PackageHealthService();

