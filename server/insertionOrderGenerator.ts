/**
 * Insertion Order Generator
 * 
 * Generates professional insertion orders in HTML and Markdown formats
 */

import { Campaign } from '../src/integrations/mongodb/campaignSchema';
import { HubPackage } from '../src/integrations/mongodb/hubPackageSchema';
import { calculateItemCost } from '../src/utils/inventoryPricing';

class InsertionOrderGenerator {
  
  /**
   * PHASE 5: Ensure campaign has pre-calculated values
   * Calculates missing values on-the-fly for backwards compatibility
   */
  private async ensureCampaignCalculations(campaign: Campaign): Promise<Campaign> {
    const { calculatePublicationTotal, calculateCampaignTotal } = await import('../src/utils/inventoryPricing');
    const { calculatePackageReach } = await import('../src/utils/reachCalculations');
    
    let modified = false;

    // Calculate missing publicationTotal values
    if (campaign.selectedInventory?.publications) {
      campaign.selectedInventory.publications = campaign.selectedInventory.publications.map((pub) => {
        if (pub.publicationTotal === undefined || pub.publicationTotal === null) {
          console.log(`Calculating missing publicationTotal for ${pub.publicationName}`);
          // Calculate on-the-fly using shared utilities
          const pubTotal = calculatePublicationTotal([pub], 1); // Monthly total
          modified = true;
          return { ...pub, publicationTotal: pubTotal };
        }
        return pub;
      });
    }

    // Ensure pricing exists
    if (!campaign.pricing?.subtotal && !campaign.pricing?.finalPrice && campaign.selectedInventory?.publications) {
      console.log('Calculating missing campaign pricing');
      const totalCost = calculateCampaignTotal(campaign.selectedInventory.publications, 1);
      if (!campaign.pricing) {
        campaign.pricing = {} as any;
      }
      campaign.pricing.subtotal = totalCost;
      campaign.pricing.finalPrice = totalCost;
      modified = true;
    }

    // Ensure reach calculations exist
    if (!campaign.estimatedPerformance?.reach && campaign.selectedInventory?.publications) {
      console.log('Calculating missing campaign reach');
      const reachSummary = calculatePackageReach(campaign.selectedInventory.publications);
      if (!campaign.estimatedPerformance) {
        campaign.estimatedPerformance = {} as any;
      }
      campaign.estimatedPerformance.reach = {
        min: reachSummary.estimatedUniqueReach || 0,
        max: reachSummary.estimatedUniqueReach || 0,
        description: `${(reachSummary.estimatedUniqueReach || 0).toLocaleString()}+ estimated unique reach`
      };
      campaign.estimatedPerformance.impressions = {
        min: reachSummary.totalMonthlyImpressions || 0,
        max: reachSummary.totalMonthlyImpressions || 0
      };
      modified = true;
    }

    if (modified) {
      console.log('⚠️ Campaign calculations were missing and calculated on-the-fly. Consider updating campaign creation logic.');
    }

    return campaign;
  }

  /**
   * Format currency
   */
  private formatCurrency(amount: number | undefined | null): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '$0.00';
    }
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Format date
   */
  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  /**
   * Generate HTML Insertion Order
   */
  async generateHTMLInsertionOrder(campaign: Campaign): Promise<string> {
    // PHASE 5: Ensure pre-calculated values exist (calculate if missing)
    campaign = await this.ensureCampaignCalculations(campaign);
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Insertion Order - ${campaign.basicInfo.name}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 40px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #1e40af;
            margin: 0 0 10px 0;
            font-size: 28px;
        }
        .header .campaign-id {
            color: #64748b;
            font-size: 14px;
            font-weight: 600;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: #1e40af;
            font-size: 20px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        .section h3 {
            color: #475569;
            font-size: 16px;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }
        .info-item {
            padding: 12px;
            background: #f8fafc;
            border-left: 3px solid #2563eb;
        }
        .info-label {
            font-weight: 600;
            color: #475569;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .info-value {
            color: #1e293b;
            font-size: 14px;
            margin-top: 4px;
        }
        .publication-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            background: #f9fafb;
        }
        .publication-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
        }
        .publication-name {
            font-size: 18px;
            font-weight: 700;
            color: #1e293b;
        }
        .publication-total {
            font-size: 18px;
            font-weight: 700;
            color: #059669;
        }
        .inventory-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .inventory-table th {
            background: #f1f5f9;
            padding: 10px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .inventory-table td {
            padding: 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
        }
        .inventory-table tr:last-child td {
            border-bottom: none;
        }
        .channel-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .channel-website { background: #dbeafe; color: #1e40af; }
        .channel-print { background: #f3e8ff; color: #6b21a8; }
        .channel-newsletter { background: #fef3c7; color: #92400e; }
        .channel-radio { background: #fed7aa; color: #c2410c; }
        .channel-podcast { background: #fecaca; color: #991b1b; }
        .channel-events { background: #d1fae5; color: #065f46; }
        .channel-streaming { background: #e0f2fe; color: #075985; }
        .channel-social { background: #fae8ff; color: #86198f; }
        .pricing-summary {
            background: #f0fdf4;
            border: 2px solid #10b981;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
        }
        .pricing-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 16px;
        }
        .pricing-row.total {
            border-top: 2px solid #10b981;
            margin-top: 10px;
            padding-top: 15px;
            font-size: 20px;
            font-weight: 700;
            color: #065f46;
        }
        .terms-list {
            list-style: none;
            padding: 0;
        }
        .terms-list li {
            padding: 8px 0 8px 24px;
            position: relative;
        }
        .terms-list li:before {
            content: "•";
            position: absolute;
            left: 8px;
            color: #2563eb;
            font-weight: bold;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 14px;
        }
        .performance-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-top: 15px;
        }
        .performance-card {
            background: #fef3c7;
            border-left: 3px solid #f59e0b;
            padding: 15px;
            border-radius: 4px;
        }
        .performance-label {
            font-size: 12px;
            font-weight: 600;
            color: #92400e;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .performance-value {
            font-size: 20px;
            font-weight: 700;
            color: #78350f;
        }
        @media print {
            body {
                background: white;
                margin: 0;
                padding: 0;
            }
            .container {
                box-shadow: none;
                padding: 20px;
            }
            .publication-card {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>Media Insertion Order</h1>
            <div class="campaign-id">Campaign ID: ${campaign.campaignId}</div>
        </div>

        <!-- Campaign Information -->
        <div class="section">
            <h2>Campaign Information</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Campaign Name</div>
                    <div class="info-value">${campaign.basicInfo.name}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Advertiser</div>
                    <div class="info-value">${campaign.basicInfo.advertiserName}</div>
                </div>
                ${campaign.basicInfo.advertiserContact?.name ? `
                <div class="info-item">
                    <div class="info-label">Contact Name</div>
                    <div class="info-value">${campaign.basicInfo.advertiserContact.name}</div>
                </div>
                ` : ''}
                ${campaign.basicInfo.advertiserContact?.email ? `
                <div class="info-item">
                    <div class="info-label">Contact Email</div>
                    <div class="info-value">${campaign.basicInfo.advertiserContact.email}</div>
                </div>
                ` : ''}
                ${campaign.basicInfo.advertiserContact?.phone ? `
                <div class="info-item">
                    <div class="info-label">Contact Phone</div>
                    <div class="info-value">${campaign.basicInfo.advertiserContact.phone}</div>
                </div>
                ` : ''}
                ${campaign.basicInfo.advertiserContact?.company ? `
                <div class="info-item">
                    <div class="info-label">Company</div>
                    <div class="info-value">${campaign.basicInfo.advertiserContact.company}</div>
                </div>
                ` : ''}
                <div class="info-item">
                    <div class="info-label">Campaign Start Date</div>
                    <div class="info-value">${this.formatDate(campaign.timeline.startDate)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Campaign End Date</div>
                    <div class="info-value">${this.formatDate(campaign.timeline.endDate)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Duration</div>
                    <div class="info-value">${campaign.timeline.durationMonths} months (${campaign.timeline.durationWeeks} weeks)</div>
                </div>
                ${campaign.objectives?.primaryGoal ? `
                <div class="info-item">
                    <div class="info-label">Primary Goal</div>
                    <div class="info-value">${campaign.objectives.primaryGoal}</div>
                </div>
                ` : ''}
                ${campaign.objectives?.targetAudience ? `
                <div class="info-item">
                    <div class="info-label">Target Audience</div>
                    <div class="info-value">${campaign.objectives.targetAudience}</div>
                </div>
                ` : ''}
                <div class="info-item">
                    <div class="info-label">Hub</div>
                    <div class="info-value">${campaign.hubName}</div>
                </div>
            </div>
        </div>

        <!-- Campaign Description -->
        ${campaign.basicInfo.description ? `
        <div class="section">
            <h2>Campaign Description</h2>
            <p>${campaign.basicInfo.description}</p>
        </div>
        ` : ''}

        <!-- Estimated Performance -->
        ${(campaign.performance || campaign.estimatedPerformance) ? `
        <div class="section">
            <h2>Estimated Performance</h2>
            <div class="performance-grid">
                ${(campaign.performance?.estimatedReach || campaign.estimatedPerformance?.reach) ? `
                <div class="performance-card">
                    <div class="performance-label">Estimated Reach</div>
                    <div class="performance-value">${(campaign.performance?.estimatedReach?.minReach || campaign.estimatedPerformance?.reach?.min || 0).toLocaleString()} - ${(campaign.performance?.estimatedReach?.maxReach || campaign.estimatedPerformance?.reach?.max || 0).toLocaleString()}</div>
                </div>
                ` : ''}
                ${(campaign.performance?.estimatedImpressions || campaign.estimatedPerformance?.impressions) ? `
                <div class="performance-card">
                    <div class="performance-label">Estimated Impressions</div>
                    <div class="performance-value">${(campaign.performance?.estimatedImpressions?.minImpressions || campaign.estimatedPerformance?.impressions?.min || 0).toLocaleString()} - ${(campaign.performance?.estimatedImpressions?.maxImpressions || campaign.estimatedPerformance?.impressions?.max || 0).toLocaleString()}</div>
                </div>
                ` : ''}
                ${(campaign.performance?.costPerThousand || campaign.estimatedPerformance?.cpm) ? `
                <div class="performance-card">
                    <div class="performance-label">Cost Per Thousand (CPM)</div>
                    <div class="performance-value">${this.formatCurrency(campaign.performance?.costPerThousand || campaign.estimatedPerformance?.cpm || 0)}</div>
                </div>
                ` : ''}
            </div>
        </div>
        ` : ''}

        <!-- Selected Publications and Inventory -->
        <div class="section">
            <h2>Selected Publications & Inventory</h2>
            <p style="color: #64748b; margin-bottom: 20px;">
                ${campaign.selectedInventory?.publications?.length || 0} publications • 
                ${campaign.selectedInventory?.publications?.reduce((sum, pub) => sum + (pub.inventoryItems?.length || 0), 0) || 0} ad placements
            </p>

            ${(campaign.selectedInventory?.publications || []).map(pub => `
                <div class="publication-card">
                    <div class="publication-header">
                        <div class="publication-name">${pub.publicationName}</div>
                        <div class="publication-total">${this.formatCurrency(pub.publicationTotal)}</div>
                    </div>
                    
                    <table class="inventory-table">
                        <thead>
                            <tr>
                                <th>Channel</th>
                                <th>Ad Placement</th>
                                <th>Quantity</th>
                                <th>Audience Estimate</th>
                                <th>Item Cost</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pub.inventoryItems.filter(item => !item.isExcluded).map(item => {
                                const pricingModel = item.itemPricing?.pricingModel;
                                const monthlyImpressions = (item as any).monthlyImpressions;
                                const currentFreq = item.currentFrequency || item.quantity || 1;
                                const unitCost = item.itemPricing?.hubPrice || 0;
                                
                                // Calculate line total using shared utility
                                const lineTotal = calculateItemCost(item, currentFreq, 1);
                                
                                // Format quantity based on pricing model (match package style)
                                let quantityDisplay = '';
                                if (pricingModel === 'cpm' || pricingModel === 'cpv' || pricingModel === 'cpc') {
                                    quantityDisplay = `${currentFreq}% share`;
                                } else {
                                    quantityDisplay = `${currentFreq}× per month`;
                                }
                                
                                // Format audience info to match package style
                                let audienceInfo = 'N/A';
                                if (pricingModel === 'cpm' && monthlyImpressions) {
                                    // Calculate actual share: currentFreq% of total monthlyImpressions
                                    const actualShare = Math.round(monthlyImpressions * (currentFreq / 100));
                                    audienceInfo = `${actualShare.toLocaleString()} impressions/month`;
                                } else if (pricingModel === 'cpv' && monthlyImpressions) {
                                    const actualShare = Math.round(monthlyImpressions * (currentFreq / 100));
                                    audienceInfo = `${actualShare.toLocaleString()} views/month`;
                                } else if (pricingModel === 'cpc' && monthlyImpressions) {
                                    const actualShare = Math.round(monthlyImpressions * (currentFreq / 100));
                                    const clicks = Math.round(actualShare * 0.01);
                                    audienceInfo = `~${clicks.toLocaleString()} clicks/month`;
                                } else if (pricingModel === 'per_send' || pricingModel === 'per_newsletter') {
                                    // For newsletters, show sends if available
                                    const audienceSize = item.audienceMetrics?.subscribers || (item as any).subscribers;
                                    if (audienceSize && currentFreq) {
                                        audienceInfo = `${audienceSize.toLocaleString()} subscribers × ${currentFreq} sends`;
                                    } else {
                                        audienceInfo = `${currentFreq} sends per month`;
                                    }
                                } else if (pricingModel === 'per_spot' || pricingModel === 'per_ad') {
                                    const audienceSize = item.audienceMetrics?.listeners || item.audienceMetrics?.viewers || (item as any).circulation;
                                    if (audienceSize && currentFreq) {
                                        audienceInfo = `${audienceSize.toLocaleString()} listeners/viewers × ${currentFreq} spots`;
                                    } else {
                                        audienceInfo = `${currentFreq} placements per month`;
                                    }
                                } else if (pricingModel === 'monthly' || pricingModel === 'flat') {
                                    audienceInfo = 'Monthly rate';
                                }
                                
                                return `
                                <tr>
                                    <td>
                                        <span class="channel-badge channel-${item.channel}">${item.channel}</span>
                                    </td>
                                    <td>${item.itemName}</td>
                                    <td>${quantityDisplay}</td>
                                    <td style="font-size: 12px; color: #64748b;">${audienceInfo}</td>
                                    <td>${this.formatCurrency(unitCost)}</td>
                                    <td><strong>${this.formatCurrency(lineTotal)}</strong></td>
                                </tr>
                            `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `).join('')}
        </div>

        <!-- Investment Summary -->
        <div class="section">
            <h2>Investment Summary</h2>
            <div class="pricing-summary">
                ${(campaign.pricing.monthlyTotal || campaign.pricing.monthlyPrice) ? `
                <div class="pricing-row">
                    <span>Monthly Total:</span>
                    <span><strong>${this.formatCurrency(campaign.pricing.monthlyTotal || campaign.pricing.monthlyPrice)}</strong></span>
                </div>
                <div class="pricing-row">
                    <span>Campaign Duration:</span>
                    <span><strong>${campaign.timeline.durationMonths} months</strong></span>
                </div>
                ` : ''}
                <div class="pricing-row total">
                    <span>Total Campaign Investment:</span>
                    <span>${this.formatCurrency(campaign.pricing.total || campaign.pricing.finalPrice || campaign.pricing.totalHubPrice || 0)}</span>
                </div>
            </div>
            
        </div>

        <!-- Terms and Conditions -->
        <div class="section">
            <h2>Terms & Conditions</h2>
            <ul class="terms-list">
                <li>This insertion order is valid for the dates specified above</li>
                <li>All advertising materials must be submitted according to each publication's specifications</li>
                <li>Creative assets must be delivered at least 5 business days before campaign start date</li>
                <li>Payment terms: Net 30 days from invoice date</li>
                <li>Cancellation policy: Cancellations must be made at least 10 business days prior to campaign start</li>
                <li>All pricing reflects Chicago Hub discounted rates</li>
                <li>Performance estimates are based on historical data and are not guaranteed</li>
                <li>Each publication reserves the right to reject advertising that doesn't meet their standards</li>
            </ul>
        </div>

        <!-- Contact Information -->
        <div class="section">
            <h2>Questions or Changes?</h2>
            <p>For questions about this insertion order or to make changes to your campaign, please contact:</p>
            <div class="info-item" style="margin-top: 15px;">
                <div class="info-label">Chicago Hub Campaign Management</div>
                <div class="info-value">Email: campaigns@chicagohub.media</div>
                <div class="info-value">Campaign ID: ${campaign.campaignId}</div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>Generated on ${this.formatDate(new Date())}</p>
            <p>Chicago Hub • Supporting Local Journalism • Press Forward Initiative</p>
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Generate Markdown Insertion Order
   */
  async generateMarkdownInsertionOrder(campaign: Campaign): Promise<string> {
    // PHASE 5: Ensure pre-calculated values exist (calculate if missing)
    campaign = await this.ensureCampaignCalculations(campaign);
    const markdown = `# Media Insertion Order

**Campaign ID:** ${campaign.campaignId}  
**Generated:** ${this.formatDate(new Date())}

---

## Campaign Information

| Field | Value |
|-------|-------|
| **Campaign Name** | ${campaign.basicInfo.name} |
| **Advertiser** | ${campaign.basicInfo.advertiserName} |
${campaign.basicInfo.advertiserContact?.name ? `| **Contact Name** | ${campaign.basicInfo.advertiserContact.name} |\n` : ''}
${campaign.basicInfo.advertiserContact?.email ? `| **Contact Email** | ${campaign.basicInfo.advertiserContact.email} |\n` : ''}
${campaign.basicInfo.advertiserContact?.phone ? `| **Contact Phone** | ${campaign.basicInfo.advertiserContact.phone} |\n` : ''}
${campaign.basicInfo.advertiserContact?.company ? `| **Company** | ${campaign.basicInfo.advertiserContact.company} |\n` : ''}
| **Campaign Start Date** | ${this.formatDate(campaign.timeline.startDate)} |
| **Campaign End Date** | ${this.formatDate(campaign.timeline.endDate)} |
| **Duration** | ${campaign.timeline.durationMonths} months (${campaign.timeline.durationWeeks} weeks) |
${campaign.objectives?.primaryGoal ? `| **Primary Goal** | ${campaign.objectives.primaryGoal} |\n` : ''}
${campaign.objectives?.targetAudience ? `| **Target Audience** | ${campaign.objectives.targetAudience} |\n` : ''}
| **Hub** | ${campaign.hubName} |

${campaign.basicInfo.description ? `\n## Campaign Description\n\n${campaign.basicInfo.description}\n` : ''}

## Estimated Performance

| Metric | Value |
|--------|-------|
${(campaign.performance?.estimatedReach || campaign.estimatedPerformance?.reach) ? `| **Estimated Reach** | ${(campaign.performance?.estimatedReach?.minReach || campaign.estimatedPerformance?.reach?.min || 0).toLocaleString()} - ${(campaign.performance?.estimatedReach?.maxReach || campaign.estimatedPerformance?.reach?.max || 0).toLocaleString()} |\n` : ''}
${(campaign.performance?.estimatedImpressions || campaign.estimatedPerformance?.impressions) ? `| **Estimated Impressions** | ${(campaign.performance?.estimatedImpressions?.minImpressions || campaign.estimatedPerformance?.impressions?.min || 0).toLocaleString()} - ${(campaign.performance?.estimatedImpressions?.maxImpressions || campaign.estimatedPerformance?.impressions?.max || 0).toLocaleString()} |\n` : ''}
${(campaign.performance?.costPerThousand || campaign.estimatedPerformance?.cpm) ? `| **Cost Per Thousand (CPM)** | ${this.formatCurrency(campaign.performance?.costPerThousand || campaign.estimatedPerformance?.cpm || 0)} |\n` : ''}

---

## Selected Publications & Inventory

**${campaign.selectedInventory?.publications?.length || 0} publications • ${campaign.selectedInventory?.publications?.reduce((sum, pub) => sum + (pub.inventoryItems?.length || 0), 0) || 0} ad placements**

${(campaign.selectedInventory?.publications || []).map(pub => `
### ${pub.publicationName}
**Publication Total:** ${this.formatCurrency(pub.publicationTotal)}

| Channel | Ad Placement | Quantity | Audience Estimate | Item Cost | Total |
|---------|--------------|----------|-------------------|-----------|-------|
${pub.inventoryItems.filter(item => !item.isExcluded).map(item => {
  const pricingModel = item.itemPricing?.pricingModel;
  const monthlyImpressions = (item as any).monthlyImpressions;
  const currentFreq = item.currentFrequency || item.quantity || 1;
  
  // Format quantity based on pricing model
  let quantityDisplay = '';
  if (pricingModel === 'cpm' || pricingModel === 'cpv' || pricingModel === 'cpc') {
    quantityDisplay = `${currentFreq}% share`;
  } else {
    quantityDisplay = `${currentFreq}× per month`;
  }
  
  // Format audience info
  let audienceInfo = 'N/A';
  if (pricingModel === 'cpm' && monthlyImpressions) {
    audienceInfo = `${monthlyImpressions.toLocaleString()} impressions/month`;
  } else if (pricingModel === 'cpv' && monthlyImpressions) {
    audienceInfo = `${monthlyImpressions.toLocaleString()} views/month`;
  } else if (pricingModel === 'cpc' && monthlyImpressions) {
    const clicks = Math.round(monthlyImpressions * 0.01);
    audienceInfo = `~${clicks.toLocaleString()} clicks/month`;
  } else if (pricingModel === 'per_send' || pricingModel === 'per_newsletter') {
    const audienceSize = item.audienceMetrics?.subscribers || (item as any).subscribers;
    if (audienceSize && currentFreq) {
      audienceInfo = `${audienceSize.toLocaleString()} subscribers × ${currentFreq} sends`;
    } else {
      audienceInfo = `${currentFreq} sends per month`;
    }
  } else if (pricingModel === 'per_spot' || pricingModel === 'per_ad') {
    const audienceSize = item.audienceMetrics?.listeners || item.audienceMetrics?.viewers || (item as any).circulation;
    if (audienceSize && currentFreq) {
      audienceInfo = `${audienceSize.toLocaleString()} listeners/viewers × ${currentFreq} spots`;
    } else {
      audienceInfo = `${currentFreq} placements per month`;
    }
  } else if (pricingModel === 'monthly' || pricingModel === 'flat') {
    audienceInfo = 'Monthly rate';
  }
  
  // Calculate line total using shared utility
  const unitCost = item.itemPricing?.hubPrice || 0;
  const lineTotal = calculateItemCost(item, currentFreq, 1);
  
  return `| ${item.channel} | ${item.itemName} | ${quantityDisplay} | ${audienceInfo} | ${this.formatCurrency(unitCost)} | **${this.formatCurrency(lineTotal)}** |`;
}).join('\n')}
`).join('\n')}

---

## Investment Summary

${(campaign.pricing.monthlyTotal || campaign.pricing.monthlyPrice) ? `
**Monthly Total:** ${this.formatCurrency(campaign.pricing.monthlyTotal || campaign.pricing.monthlyPrice)}  
**Campaign Duration:** ${campaign.timeline.durationMonths} months  
` : ''}

### **Total Campaign Investment:** ${this.formatCurrency(campaign.pricing.total || campaign.pricing.finalPrice || campaign.pricing.totalHubPrice || 0)}

---

## Terms & Conditions

- This insertion order is valid for the dates specified above
- All advertising materials must be submitted according to each publication's specifications
- Creative assets must be delivered at least 5 business days before campaign start date
- Payment terms: Net 30 days from invoice date
- Cancellation policy: Cancellations must be made at least 10 business days prior to campaign start
- All pricing reflects Chicago Hub discounted rates
- Performance estimates are based on historical data and are not guaranteed
- Each publication reserves the right to reject advertising that doesn't meet their standards

---

## Questions or Changes?

For questions about this insertion order or to make changes to your campaign, please contact:

**Chicago Hub Campaign Management**  
Email: campaigns@chicagohub.media  
Campaign ID: ${campaign.campaignId}

---

*Chicago Hub • Supporting Local Journalism • Press Forward Initiative*
`;

    return markdown;
  }

  /**
   * Generate HTML Insertion Order for a Single Publication
   */
  async generatePublicationHTMLInsertionOrder(
    campaign: Campaign, 
    publicationId: number
  ): Promise<string | null> {
    // PHASE 5: Ensure pre-calculated values exist (calculate if missing)
    campaign = await this.ensureCampaignCalculations(campaign);
    // Find the publication in the campaign
    const publication = campaign.selectedInventory?.publications?.find(
      p => p.publicationId === publicationId
    );

    if (!publication) {
      console.error(`Publication ${publicationId} not found in campaign`, {
        publicationId,
        availablePublications: campaign.selectedInventory?.publications?.map(p => p.publicationId)
      });
      return null;
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Insertion Order - ${publication.publicationName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 40px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            color: #1e40af;
            font-size: 28px;
        }
        .publication-name {
            font-size: 24px;
            color: #059669;
            font-weight: bold;
            margin: 20px 0;
        }
        .section {
            margin: 30px 0;
        }
        .section h2 {
            color: #1e40af;
            font-size: 20px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 20px 0;
        }
        .info-item {
            padding: 12px;
            background: #f9fafb;
            border-left: 3px solid #3b82f6;
        }
        .info-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .info-value {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
        }
        .inventory-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .inventory-table th {
            background: #f3f4f6;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #d1d5db;
        }
        .inventory-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        .inventory-table tr:hover {
            background: #f9fafb;
        }
        .total-row {
            background: #eff6ff;
            font-weight: bold;
        }
        .highlight-box {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #2563eb;
        }
        .highlight-box h3 {
            margin-top: 0;
            color: #1e40af;
        }
        .requirements-list {
            list-style: none;
            padding: 0;
        }
        .requirements-list li {
            padding: 8px 0;
            padding-left: 24px;
            position: relative;
        }
        .requirements-list li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #059669;
            font-weight: bold;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>📄 Insertion Order</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Campaign ID: ${campaign.campaignId}</p>
        </div>

        <!-- Publication Name -->
        <div class="publication-name">
            ${publication.publicationName}
        </div>

        <!-- Campaign Information -->
        <div class="section">
            <h2>Campaign Information</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Campaign Name</div>
                    <div class="info-value">${campaign.basicInfo.name}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Advertiser</div>
                    <div class="info-value">${campaign.basicInfo.advertiserName}</div>
                </div>
                ${campaign.basicInfo.advertiserContact?.name ? `
                <div class="info-item">
                    <div class="info-label">Contact Name</div>
                    <div class="info-value">${campaign.basicInfo.advertiserContact.name}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Contact Email</div>
                    <div class="info-value">${campaign.basicInfo.advertiserContact.email}</div>
                </div>
                ` : ''}
                <div class="info-item">
                    <div class="info-label">Campaign Start Date</div>
                    <div class="info-value">${this.formatDate(campaign.timeline.startDate)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Campaign End Date</div>
                    <div class="info-value">${this.formatDate(campaign.timeline.endDate)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Duration</div>
                    <div class="info-value">${campaign.timeline.durationMonths} ${campaign.timeline.durationMonths === 1 ? 'month' : 'months'} (${campaign.timeline.durationWeeks} weeks)</div>
                </div>
                ${campaign.objectives?.primaryGoal ? `
                <div class="info-item">
                    <div class="info-label">Campaign Goal</div>
                    <div class="info-value">${campaign.objectives.primaryGoal}</div>
                </div>
                ` : ''}
            </div>
        </div>

        <!-- Your Placements -->
        <div class="section">
            <h2>Your Ad Placements</h2>
            
            <table class="inventory-table">
                <thead>
                    <tr>
                        <th>Channel</th>
                        <th>Ad Placement</th>
                        <th style="text-align: center;">Quantity</th>
                        <th style="text-align: center;">Audience Estimate</th>
                        <th style="text-align: right;">Item Cost</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${(publication.inventoryItems || []).map(item => {
                        const pricingModel = item.itemPricing?.pricingModel;
                        const monthlyImpressions = (item as any).monthlyImpressions;
                        const currentFreq = item.currentFrequency || item.quantity || 1;
                        const unitCost = item.itemPricing?.hubPrice || 0;
                        
                        // Calculate line total using shared utility
                        const lineTotal = calculateItemCost(item, currentFreq, 1);
                        
                        // Format quantity based on pricing model
                        let quantityDisplay = '';
                        if (pricingModel === 'cpm' || pricingModel === 'cpv' || pricingModel === 'cpc') {
                            quantityDisplay = `${currentFreq}% share`;
                        } else {
                            quantityDisplay = `${currentFreq}× per month`;
                        }
                        
                        // Format audience info
                        let audienceInfo = 'N/A';
                        if (pricingModel === 'cpm' && monthlyImpressions) {
                            const actualShare = Math.round(monthlyImpressions * (currentFreq / 100));
                            audienceInfo = `${actualShare.toLocaleString()} impressions/month`;
                        } else if (pricingModel === 'per_send') {
                            const subscribers = item.audienceMetrics?.subscribers;
                            if (subscribers && currentFreq) {
                                audienceInfo = `${subscribers.toLocaleString()} subscribers × ${currentFreq} sends ✓ Guaranteed`;
                            } else {
                                audienceInfo = `${currentFreq} sends per month`;
                            }
                        } else if (pricingModel === 'per_spot' || pricingModel === 'per_ad') {
                            const audienceSize = item.audienceMetrics?.listeners || item.audienceMetrics?.viewers;
                            if (audienceSize && currentFreq) {
                                audienceInfo = `${audienceSize.toLocaleString()} listeners/viewers × ${currentFreq} spots ✓ Guaranteed`;
                            } else {
                                audienceInfo = `${currentFreq} placements per month`;
                            }
                        } else if (pricingModel === 'per_week') {
                            const visitors = item.audienceMetrics?.monthlyVisitors;
                            if (visitors) {
                                audienceInfo = `${visitors.toLocaleString()} monthly visitors ✓ Guaranteed`;
                            } else {
                                audienceInfo = 'Monthly rate';
                            }
                        }
                        
                        return `
                        <tr>
                            <td><strong>${item.channel}</strong></td>
                            <td>${item.itemName}</td>
                            <td style="text-align: center;">${quantityDisplay}</td>
                            <td style="text-align: center;">${audienceInfo}</td>
                            <td style="text-align: right;">${this.formatCurrency(unitCost)}</td>
                            <td style="text-align: right;">${this.formatCurrency(lineTotal)}</td>
                        </tr>
                        `;
                    }).join('')}
                    <tr class="total-row">
                        <td colspan="5" style="text-align: right;">Total for ${publication.publicationName}:</td>
                        <td style="text-align: right;">${this.formatCurrency(publication.publicationTotal || 0)}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Publication Responsibilities -->
        <div class="highlight-box">
            <h3>📋 Your Responsibilities</h3>
            <ul class="requirements-list">
                <li>Review and confirm availability for all placements listed above</li>
                <li>Notify campaign manager of any conflicts or technical requirements</li>
                <li>Provide ad specifications and creative requirements by ${this.formatDate(new Date(new Date(campaign.timeline.startDate).getTime() - 7 * 24 * 60 * 60 * 1000))}</li>
                <li>Confirm receipt of creative assets once provided</li>
                <li>Execute placements according to agreed schedule</li>
                <li>Provide proof of performance (screenshots, analytics) after campaign completion</li>
            </ul>
        </div>

        <!-- Material Requirements -->
        <div class="section">
            <h2>Material Requirements & Deadlines</h2>
            <div class="info-grid">
                ${campaign.timeline.leadTime ? `
                <div class="info-item">
                    <div class="info-label">Lead Time</div>
                    <div class="info-value">${campaign.timeline.leadTime}</div>
                </div>
                ` : ''}
                ${campaign.timeline.materialDeadline ? `
                <div class="info-item">
                    <div class="info-label">Material Deadline</div>
                    <div class="info-value">${campaign.timeline.materialDeadline}</div>
                </div>
                ` : ''}
            </div>
            <p style="margin-top: 15px; color: #6b7280;">
                Please provide your specific ad specifications (dimensions, file formats, file size limits) 
                for each placement type to the campaign manager as soon as possible.
            </p>
        </div>

        <!-- Contact Information -->
        <div class="section">
            <h2>Questions or Changes?</h2>
            <p>For questions about this insertion order or to make changes, please contact:</p>
            <div class="info-grid" style="grid-template-columns: 1fr;">
                <div class="info-item">
                    <div class="info-label">Chicago Hub Campaign Management</div>
                    <div class="info-value">campaigns@chicagohub.media</div>
                    <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
                        Campaign ID: ${campaign.campaignId}<br>
                        Publication: ${publication.publicationName}
                    </p>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>Chicago Hub</strong> • Supporting Local Journalism • Press Forward Initiative</p>
            <p style="font-size: 12px; margin-top: 10px;">Generated: ${new Date().toLocaleDateString()}</p>
        </div>
    </div>
</body>
</html>
`;

    return html;
  }

  /**
   * Generate all publication insertion orders for a campaign
   */
  async generateAllPublicationInsertionOrders(campaign: Campaign): Promise<Array<{
    publicationId: number;
    publicationName: string;
    format: 'html' | 'markdown';
    content: string;
  }>> {
    const publications = campaign.selectedInventory?.publications || [];

    const insertionOrders = [];

    for (const pub of publications) {
      const html = await this.generatePublicationHTMLInsertionOrder(campaign, pub.publicationId);
      if (html) {
        insertionOrders.push({
          publicationId: pub.publicationId,
          publicationName: pub.publicationName,
          format: 'html' as const,
          content: html
        });
      }
    }

    return insertionOrders;
  }

  /**
   * Generate HTML Insertion Order for a Hub Package
   */
  async generateHTMLInsertionOrderForPackage(hubPackage: HubPackage): Promise<string> {
    // Calculate duration
    const duration = hubPackage.metadata?.builderInfo?.originalDuration || 6;
    const monthlyCost = hubPackage.pricing.breakdown.finalPrice;
    const totalCost = monthlyCost * duration;

    // Calculate totals
    const totalPublications = hubPackage.components.publications.length;
    const totalInventoryItems = hubPackage.components.publications.reduce(
      (sum, pub) => sum + (pub.inventoryItems?.length || 0), 
      0
    );

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Insertion Order - ${hubPackage.basicInfo.name}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 40px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #1e40af;
            margin: 0 0 10px 0;
            font-size: 28px;
        }
        .header .package-id {
            color: #64748b;
            font-size: 14px;
            font-weight: 600;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: #1e40af;
            font-size: 20px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        .section h3 {
            color: #475569;
            font-size: 16px;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }
        .info-item {
            padding: 12px;
            background: #f8fafc;
            border-left: 3px solid #2563eb;
        }
        .info-label {
            font-weight: 600;
            color: #475569;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .info-value {
            color: #1e293b;
            font-size: 14px;
            margin-top: 4px;
        }
        .placeholder {
            border-bottom: 1px solid #cbd5e1;
            min-width: 200px;
            display: inline-block;
            padding: 2px 4px;
        }
        .publication-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            background: #f9fafb;
        }
        .publication-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
        }
        .publication-name {
            font-size: 18px;
            font-weight: 700;
            color: #1e293b;
        }
        .publication-total {
            font-size: 18px;
            font-weight: 700;
            color: #059669;
        }
        .inventory-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .inventory-table th {
            background: #f1f5f9;
            padding: 10px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .inventory-table td {
            padding: 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
        }
        .inventory-table tr:last-child td {
            border-bottom: none;
        }
        .channel-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .channel-website { background: #dbeafe; color: #1e40af; }
        .channel-print { background: #f3e8ff; color: #6b21a8; }
        .channel-newsletter { background: #fef3c7; color: #92400e; }
        .channel-radio { background: #fed7aa; color: #c2410c; }
        .channel-podcast { background: #fecaca; color: #991b1b; }
        .channel-events { background: #d1fae5; color: #065f46; }
        .channel-streaming { background: #e0f2fe; color: #075985; }
        .channel-social { background: #fae8ff; color: #86198f; }
        .pricing-summary {
            background: #f0fdf4;
            border: 2px solid #10b981;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
        }
        .pricing-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 16px;
        }
        .pricing-row.total {
            border-top: 2px solid #10b981;
            margin-top: 10px;
            padding-top: 15px;
            font-size: 20px;
            font-weight: 700;
            color: #065f46;
        }
        .terms-list {
            list-style: none;
            padding: 0;
        }
        .terms-list li {
            padding: 8px 0 8px 24px;
            position: relative;
        }
        .terms-list li:before {
            content: "•";
            position: absolute;
            left: 8px;
            color: #2563eb;
            font-weight: bold;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 14px;
        }
        .highlight-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        @media print {
            body {
                background: white;
                margin: 0;
                padding: 0;
            }
            .container {
                box-shadow: none;
                padding: 20px;
            }
            .publication-card {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>Media Insertion Order</h1>
            <div class="package-id">Package: ${hubPackage.basicInfo.name}</div>
        </div>

        <!-- Client Information Section (To Be Filled) -->
        <div class="section">
            <h2>Client Information</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Company Name</div>
                    <div class="info-value"><span class="placeholder">&nbsp;</span></div>
                </div>
                <div class="info-item">
                    <div class="info-label">Contact Name</div>
                    <div class="info-value"><span class="placeholder">&nbsp;</span></div>
                </div>
                <div class="info-item">
                    <div class="info-label">Contact Email</div>
                    <div class="info-value"><span class="placeholder">&nbsp;</span></div>
                </div>
                <div class="info-item">
                    <div class="info-label">Contact Phone</div>
                    <div class="info-value"><span class="placeholder">&nbsp;</span></div>
                </div>
                <div class="info-item">
                    <div class="info-label">Campaign Start Date</div>
                    <div class="info-value"><span class="placeholder">&nbsp;</span></div>
                </div>
                <div class="info-item">
                    <div class="info-label">Campaign End Date</div>
                    <div class="info-value"><span class="placeholder">&nbsp;</span></div>
                </div>
            </div>
        </div>

        <!-- Package Information -->
        <div class="section">
            <h2>Package Information</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Package Name</div>
                    <div class="info-value">${hubPackage.basicInfo.name}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Package Category</div>
                    <div class="info-value">${hubPackage.basicInfo.category}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Duration</div>
                    <div class="info-value">${duration} months</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Hub</div>
                    <div class="info-value">${hubPackage.hubInfo.hubName}</div>
                </div>
            </div>
        </div>

        <!-- Package Description -->
        ${hubPackage.basicInfo.description ? `
        <div class="section">
            <h2>Package Description</h2>
            <p>${hubPackage.basicInfo.description}</p>
        </div>
        ` : ''}

        <!-- Key Benefits -->
        ${hubPackage.features?.keyBenefits && hubPackage.features.keyBenefits.length > 0 ? `
        <div class="section">
            <h2>Key Benefits</h2>
            <ul class="terms-list">
                ${hubPackage.features.keyBenefits.map(benefit => `<li>${benefit}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        <!-- Selected Publications and Inventory -->
        <div class="section">
            <h2>Included Publications & Inventory</h2>
            <p style="color: #64748b; margin-bottom: 20px;">
                ${totalPublications} publications • ${totalInventoryItems} ad placements
            </p>

            ${hubPackage.components.publications.map(pub => `
                <div class="publication-card">
                    <div class="publication-header">
                        <div class="publication-name">${pub.publicationName}</div>
                        <div class="publication-total">${this.formatCurrency(pub.publicationTotal)}</div>
                    </div>
                    
                    <table class="inventory-table">
                        <thead>
                            <tr>
                                <th>Channel</th>
                                <th>Ad Placement</th>
                                <th>Quantity</th>
                                <th>Audience Estimate</th>
                                <th>Item Cost</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pub.inventoryItems.filter(item => !item.isExcluded).map(item => {
                                const pricingModel = item.itemPricing?.pricingModel;
                                const monthlyImpressions = (item as any).monthlyImpressions;
                                const currentFreq = item.currentFrequency || item.quantity || 1;
                                const unitCost = item.itemPricing?.hubPrice || 0;
                                
                                // Calculate line total using shared utility
                                const lineTotal = calculateItemCost(item, currentFreq, 1);
                                
                                // Format quantity based on pricing model (match package style)
                                let quantityDisplay = '';
                                if (pricingModel === 'cpm' || pricingModel === 'cpv' || pricingModel === 'cpc') {
                                    quantityDisplay = `${currentFreq}% share`;
                                } else {
                                    quantityDisplay = `${currentFreq}× per month`;
                                }
                                
                                // Format audience info to match package style
                                let audienceInfo = 'N/A';
                                if (pricingModel === 'cpm' && monthlyImpressions) {
                                    // Calculate actual share: currentFreq% of total monthlyImpressions
                                    const actualShare = Math.round(monthlyImpressions * (currentFreq / 100));
                                    audienceInfo = `${actualShare.toLocaleString()} impressions/month`;
                                } else if (pricingModel === 'cpv' && monthlyImpressions) {
                                    const actualShare = Math.round(monthlyImpressions * (currentFreq / 100));
                                    audienceInfo = `${actualShare.toLocaleString()} views/month`;
                                } else if (pricingModel === 'cpc' && monthlyImpressions) {
                                    const actualShare = Math.round(monthlyImpressions * (currentFreq / 100));
                                    const clicks = Math.round(actualShare * 0.01);
                                    audienceInfo = `~${clicks.toLocaleString()} clicks/month`;
                                } else if (pricingModel === 'per_send' || pricingModel === 'per_newsletter') {
                                    // For newsletters, show sends if available
                                    const audienceSize = item.audienceMetrics?.subscribers || (item as any).subscribers;
                                    if (audienceSize && currentFreq) {
                                        audienceInfo = `${audienceSize.toLocaleString()} subscribers × ${currentFreq} sends`;
                                    } else {
                                        audienceInfo = `${currentFreq} sends per month`;
                                    }
                                } else if (pricingModel === 'per_spot' || pricingModel === 'per_ad') {
                                    const audienceSize = item.audienceMetrics?.listeners || item.audienceMetrics?.viewers || (item as any).circulation;
                                    if (audienceSize && currentFreq) {
                                        audienceInfo = `${audienceSize.toLocaleString()} listeners/viewers × ${currentFreq} spots`;
                                    } else {
                                        audienceInfo = `${currentFreq} placements per month`;
                                    }
                                } else if (pricingModel === 'monthly' || pricingModel === 'flat') {
                                    audienceInfo = 'Monthly rate';
                                }
                                
                                return `
                                <tr>
                                    <td>
                                        <span class="channel-badge channel-${item.channel}">${item.channel}</span>
                                    </td>
                                    <td>${item.itemName}</td>
                                    <td>${quantityDisplay}</td>
                                    <td style="font-size: 12px; color: #64748b;">${audienceInfo}</td>
                                    <td>${this.formatCurrency(unitCost)}</td>
                                    <td><strong>${this.formatCurrency(lineTotal)}</strong></td>
                                </tr>
                            `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `).join('')}
        </div>

        <!-- Investment Summary -->
        <div class="section">
            <h2>Investment Summary</h2>
            <div class="pricing-summary">
                <div class="pricing-row">
                    <span>Monthly Total:</span>
                    <span><strong>${this.formatCurrency(monthlyCost)}</strong></span>
                </div>
                <div class="pricing-row">
                    <span>Campaign Duration:</span>
                    <span><strong>${duration} months</strong></span>
                </div>
                <div class="pricing-row total">
                    <span>Total Package Investment:</span>
                    <span>${this.formatCurrency(totalCost)}</span>
                </div>
            </div>
        </div>

        <!-- Included Services -->
        ${hubPackage.features?.includedServices && hubPackage.features.includedServices.length > 0 ? `
        <div class="section">
            <h2>Included Services</h2>
            <ul class="terms-list">
                ${hubPackage.features.includedServices.map(service => `<li>${service}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        <!-- Terms and Conditions -->
        <div class="section">
            <h2>Terms & Conditions</h2>
            <ul class="terms-list">
                <li>Lead Time: ${hubPackage.campaignDetails.leadTime}</li>
                <li>Material Deadline: ${hubPackage.campaignDetails.materialDeadline}</li>
                <li>Cancellation Policy: ${hubPackage.campaignDetails.cancellationPolicy}</li>
                ${hubPackage.campaignDetails.modificationPolicy ? `<li>Modification Policy: ${hubPackage.campaignDetails.modificationPolicy}</li>` : ''}
                ${hubPackage.campaignDetails.minimumCommitment ? `<li>Minimum Commitment: ${hubPackage.campaignDetails.minimumCommitment}</li>` : ''}
                <li>All advertising materials must be submitted according to each publication's specifications</li>
                <li>Payment terms: Net 30 days from invoice date</li>
                <li>All pricing reflects Hub discounted rates</li>
                <li>Each publication reserves the right to reject advertising that doesn't meet their standards</li>
            </ul>
        </div>

        <!-- Contact Information -->
        <div class="section">
            <h2>Questions or Changes?</h2>
            <p>For questions about this insertion order or to make changes to your package, please contact:</p>
            <div class="info-item" style="margin-top: 15px;">
                <div class="info-label">${hubPackage.hubInfo.hubName} Package Support</div>
                <div class="info-value">Email: packages@${hubPackage.hubInfo.hubId}.media</div>
                <div class="info-value">Package: ${hubPackage.basicInfo.name}</div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>Generated on ${this.formatDate(new Date())}</p>
            <p>${hubPackage.hubInfo.hubName} • Supporting Local Journalism • Press Forward Initiative</p>
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Generate Markdown Insertion Order for a Hub Package
   */
  async generateMarkdownInsertionOrderForPackage(hubPackage: HubPackage): Promise<string> {
    // Calculate duration
    const duration = hubPackage.metadata?.builderInfo?.originalDuration || 6;
    const monthlyCost = hubPackage.pricing.breakdown.finalPrice;
    const totalCost = monthlyCost * duration;

    // Calculate totals
    const totalPublications = hubPackage.components.publications.length;
    const totalInventoryItems = hubPackage.components.publications.reduce(
      (sum, pub) => sum + (pub.inventoryItems?.length || 0), 
      0
    );

    const markdown = `# Media Insertion Order

**Package:** ${hubPackage.basicInfo.name}  
**Generated:** ${this.formatDate(new Date())}

---

## Client Information

| Field | Value |
|-------|-------|
| **Company Name** | ___________________________ |
| **Contact Name** | ___________________________ |
| **Contact Email** | ___________________________ |
| **Contact Phone** | ___________________________ |
| **Campaign Start Date** | ___________________________ |
| **Campaign End Date** | ___________________________ |

---

## Package Information

| Field | Value |
|-------|-------|
| **Package Name** | ${hubPackage.basicInfo.name} |
| **Package Category** | ${hubPackage.basicInfo.category} |
| **Duration** | ${duration} months |
| **Hub** | ${hubPackage.hubInfo.hubName} |

${hubPackage.basicInfo.description ? `\n## Package Description\n\n${hubPackage.basicInfo.description}\n` : ''}

${hubPackage.features?.keyBenefits && hubPackage.features.keyBenefits.length > 0 ? `
## Key Benefits

${hubPackage.features.keyBenefits.map(benefit => `- ${benefit}`).join('\n')}
` : ''}

---

## Included Publications & Inventory

**${totalPublications} publications • ${totalInventoryItems} ad placements**

${hubPackage.components.publications.map(pub => `
### ${pub.publicationName}
**Publication Total:** ${this.formatCurrency(pub.publicationTotal)}/month

| Channel | Ad Placement | Quantity | Audience Estimate | Item Cost | Total |
|---------|--------------|----------|-------------------|-----------|-------|
${pub.inventoryItems.filter(item => !item.isExcluded).map(item => {
  const pricingModel = item.itemPricing?.pricingModel;
  const monthlyImpressions = (item as any).monthlyImpressions;
  const currentFreq = item.currentFrequency || item.quantity || 1;
  
  // Format quantity based on pricing model
  let quantityDisplay = '';
  if (pricingModel === 'cpm' || pricingModel === 'cpv' || pricingModel === 'cpc') {
    quantityDisplay = `${currentFreq}% share`;
  } else {
    quantityDisplay = `${currentFreq}× per month`;
  }
  
  // Format audience info
  let audienceInfo = 'N/A';
  if (pricingModel === 'cpm' && monthlyImpressions) {
    audienceInfo = `${monthlyImpressions.toLocaleString()} impressions/month`;
  } else if (pricingModel === 'cpv' && monthlyImpressions) {
    audienceInfo = `${monthlyImpressions.toLocaleString()} views/month`;
  } else if (pricingModel === 'cpc' && monthlyImpressions) {
    const clicks = Math.round(monthlyImpressions * 0.01);
    audienceInfo = `~${clicks.toLocaleString()} clicks/month`;
  } else if (pricingModel === 'per_send' || pricingModel === 'per_newsletter') {
    const audienceSize = item.audienceMetrics?.subscribers || (item as any).subscribers;
    if (audienceSize && currentFreq) {
      audienceInfo = `${audienceSize.toLocaleString()} subscribers × ${currentFreq} sends`;
    } else {
      audienceInfo = `${currentFreq} sends per month`;
    }
  } else if (pricingModel === 'per_spot' || pricingModel === 'per_ad') {
    const audienceSize = item.audienceMetrics?.listeners || item.audienceMetrics?.viewers || (item as any).circulation;
    if (audienceSize && currentFreq) {
      audienceInfo = `${audienceSize.toLocaleString()} listeners/viewers × ${currentFreq} spots`;
    } else {
      audienceInfo = `${currentFreq} placements per month`;
    }
  } else if (pricingModel === 'monthly' || pricingModel === 'flat') {
    audienceInfo = 'Monthly rate';
  }
  
  // Calculate line total using shared utility
  const unitCost = item.itemPricing?.hubPrice || 0;
  const lineTotal = calculateItemCost(item, currentFreq, 1);
  
  return `| ${item.channel} | ${item.itemName} | ${quantityDisplay} | ${audienceInfo} | ${this.formatCurrency(unitCost)} | **${this.formatCurrency(lineTotal)}** |`;
}).join('\n')}
`).join('\n')}

---

## Investment Summary

**Monthly Total:** ${this.formatCurrency(monthlyCost)}  
**Campaign Duration:** ${duration} months  

### **Total Package Investment:** ${this.formatCurrency(totalCost)}

---

${hubPackage.features?.includedServices && hubPackage.features.includedServices.length > 0 ? `
## Included Services

${hubPackage.features.includedServices.map(service => `- ${service}`).join('\n')}

---
` : ''}

## Terms & Conditions

- Lead Time: ${hubPackage.campaignDetails.leadTime}
- Material Deadline: ${hubPackage.campaignDetails.materialDeadline}
- Cancellation Policy: ${hubPackage.campaignDetails.cancellationPolicy}
${hubPackage.campaignDetails.modificationPolicy ? `- Modification Policy: ${hubPackage.campaignDetails.modificationPolicy}\n` : ''}${hubPackage.campaignDetails.minimumCommitment ? `- Minimum Commitment: ${hubPackage.campaignDetails.minimumCommitment}\n` : ''}- All advertising materials must be submitted according to each publication's specifications
- Payment terms: Net 30 days from invoice date
- All pricing reflects Hub discounted rates
- Each publication reserves the right to reject advertising that doesn't meet their standards

---

## Questions or Changes?

For questions about this insertion order or to make changes to your package, please contact:

**${hubPackage.hubInfo.hubName} Package Support**  
Email: packages@${hubPackage.hubInfo.hubId}.media  
Package: ${hubPackage.basicInfo.name}

---

*${hubPackage.hubInfo.hubName} • Supporting Local Journalism • Press Forward Initiative*
`;

    return markdown;
  }
}

// Export singleton instance
export const insertionOrderGenerator = new InsertionOrderGenerator();


