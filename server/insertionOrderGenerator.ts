/**
 * Insertion Order Generator
 * 
 * Generates professional insertion orders in HTML and Markdown formats
 */

import { Campaign } from '../src/integrations/mongodb/campaignSchema';

class InsertionOrderGenerator {
  
  /**
   * Format currency
   */
  private formatCurrency(amount: number): string {
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
                ${Array.isArray(campaign.selectedInventory) ? campaign.selectedInventory.length : 0} publications • 
                ${Array.isArray(campaign.selectedInventory) 
                  ? campaign.selectedInventory.reduce((sum, pub) => sum + (pub.inventoryItems?.length || 0), 0) 
                  : 0} ad placements
            </p>

            ${(Array.isArray(campaign.selectedInventory) ? campaign.selectedInventory : []).map(pub => `
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
                                <th>Duration</th>
                                <th>Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pub.inventoryItems.map(item => `
                                <tr>
                                    <td>
                                        <span class="channel-badge channel-${item.channel}">${item.channel}</span>
                                    </td>
                                    <td>${item.itemName}</td>
                                    <td>${item.quantity}× ${item.frequency || ''}</td>
                                    <td>${item.duration || 'Campaign duration'}</td>
                                    <td>${this.formatCurrency(item.itemPricing?.hubPrice || 0)}</td>
                                </tr>
                            `).join('')}
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

**${Array.isArray(campaign.selectedInventory) ? campaign.selectedInventory.length : 0} publications • ${Array.isArray(campaign.selectedInventory) ? campaign.selectedInventory.reduce((sum, pub) => sum + (pub.inventoryItems?.length || 0), 0) : 0} ad placements**

${(Array.isArray(campaign.selectedInventory) ? campaign.selectedInventory : []).map(pub => `
### ${pub.publicationName}
**Publication Total:** ${this.formatCurrency(pub.publicationTotal)}

| Channel | Ad Placement | Quantity | Duration | Cost |
|---------|--------------|----------|----------|------|
${pub.inventoryItems.map(item => 
  `| ${item.channel} | ${item.itemName} | ${item.quantity}× ${item.frequency || ''} | ${item.duration || 'Campaign duration'} | ${this.formatCurrency(item.itemPricing?.hubPrice || 0)} |`
).join('\n')}
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
    // Find the publication in the campaign
    const publication = Array.isArray(campaign.selectedInventory)
      ? campaign.selectedInventory.find(p => p.publicationId === publicationId)
      : null;

    if (!publication) {
      console.error(`Publication ${publicationId} not found in campaign`);
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
                        <th style="text-align: center;">Duration</th>
                        <th style="text-align: right;">Cost</th>
                    </tr>
                </thead>
                <tbody>
                    ${(publication.inventoryItems || []).map(item => `
                    <tr>
                        <td><strong>${item.channel}</strong></td>
                        <td>${item.itemName}</td>
                        <td style="text-align: center;">${item.quantity}× ${item.frequency || 'one-time'}</td>
                        <td style="text-align: center;">${item.duration || 'Campaign duration'}</td>
                        <td style="text-align: right;">${this.formatCurrency(item.itemPricing?.hubPrice || 0)}</td>
                    </tr>
                    `).join('')}
                    <tr class="total-row">
                        <td colspan="4" style="text-align: right;">Total for ${publication.publicationName}:</td>
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
    const publications = Array.isArray(campaign.selectedInventory) 
      ? campaign.selectedInventory 
      : [];

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
}

// Export singleton instance
export const insertionOrderGenerator = new InsertionOrderGenerator();


