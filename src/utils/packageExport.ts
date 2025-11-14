import { HubPackage, HubPackagePublication } from '@/integrations/mongodb/hubPackageSchema';

/**
 * Package Export Utilities
 * Professional CSV export functionality for built packages
 */

interface CSVExportOptions {
  includeSummary?: boolean;
  includeHeaders?: boolean;
  filename?: string;
}

/**
 * Generate CSV content from a package
 */
export function generatePackageCSV(
  packageData: HubPackage,
  options: CSVExportOptions = {}
): string {
  const {
    includeSummary = true,
    includeHeaders = true
  } = options;

  const rows: string[] = [];

  // Package header information
  if (includeHeaders) {
    rows.push(`Package: ${packageData.basicInfo.name}`);
    rows.push(`Tagline: ${packageData.basicInfo.tagline}`);
    rows.push(`Monthly Cost: $${packageData.pricing.breakdown.finalPrice.toLocaleString()}`);
    rows.push(`Category: ${packageData.basicInfo.category}`);
    rows.push('');
  }

  // Column headers
  rows.push('Publication,Channel,Item Name,Frequency,Unit Price,Monthly Cost');

  // Data rows
  let totalCost = 0;
  const channelTotals: Record<string, number> = {};
  const publicationTotals: Record<string, number> = {};

  for (const pub of packageData.components.publications) {
    for (const item of pub.inventoryItems) {
      const frequency = item.currentFrequency || item.quantity || 1;
      const unitPrice = item.itemPricing?.hubPrice || 0;
      const monthlyCost = unitPrice * frequency;
      
      totalCost += monthlyCost;
      channelTotals[item.channel] = (channelTotals[item.channel] || 0) + monthlyCost;
      publicationTotals[pub.publicationName] = (publicationTotals[pub.publicationName] || 0) + monthlyCost;

      // Escape quotes in strings
      const pubName = pub.publicationName.replace(/"/g, '""');
      const itemName = item.itemName.replace(/"/g, '""');

      rows.push(
        `"${pubName}","${item.channel}","${itemName}",${frequency}x,$${unitPrice.toFixed(2)},$${monthlyCost.toFixed(2)}`
      );
    }
  }

  // Summary section
  if (includeSummary) {
    rows.push('');
    rows.push('=== SUMMARY BY CHANNEL ===');
    for (const [channel, cost] of Object.entries(channelTotals).sort((a, b) => b[1] - a[1])) {
      rows.push(`${channel.toUpperCase()},,,,$${cost.toFixed(2)}`);
    }

    rows.push('');
    rows.push('=== SUMMARY BY PUBLICATION ===');
    for (const [pub, cost] of Object.entries(publicationTotals).sort((a, b) => b[1] - a[1])) {
      rows.push(`"${pub.replace(/"/g, '""')}",,,,$${cost.toFixed(2)}`);
    }

    rows.push('');
    rows.push(`TOTAL MONTHLY COST,,,,$${totalCost.toFixed(2)}`);
    
    // If duration is known, show total cost
    const duration = packageData.metadata?.builderInfo?.originalDuration;
    if (duration) {
      const totalPackageCost = totalCost * duration;
      rows.push(`TOTAL ${duration}-MONTH COST,,,,$${totalPackageCost.toFixed(2)}`);
    }
  }

  return rows.join('\n');
}

/**
 * Download CSV file in browser
 */
export function downloadPackageCSV(
  packageData: HubPackage,
  options: CSVExportOptions = {}
): void {
  const csvContent = generatePackageCSV(packageData, options);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  const filename = options.filename || 
    `${packageData.basicInfo.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Generate summary statistics for a package
 */
export interface PackageSummary {
  totalOutlets: number;
  totalChannels: number;
  totalItems: number;
  monthlyCost: number;
  totalCost: number;
  channelBreakdown: Record<string, {
    items: number;
    cost: number;
  }>;
  publicationBreakdown: Record<string, {
    items: number;
    cost: number;
  }>;
}

export function generatePackageSummary(
  publications: HubPackagePublication[],
  duration: number = 1
): PackageSummary {
  const channelBreakdown: Record<string, { items: number; cost: number }> = {};
  const publicationBreakdown: Record<string, { items: number; cost: number }> = {};
  const allChannels = new Set<string>();
  let monthlyCost = 0;
  let totalItems = 0;

  for (const pub of publications) {
    let pubCost = 0;
    let pubItems = 0;

    for (const item of pub.inventoryItems) {
      const frequency = item.currentFrequency || item.quantity || 1;
      const unitPrice = item.itemPricing?.hubPrice || 0;
      const itemCost = unitPrice * frequency;

      allChannels.add(item.channel);
      monthlyCost += itemCost;
      pubCost += itemCost;
      totalItems++;
      pubItems++;

      // Update channel breakdown
      if (!channelBreakdown[item.channel]) {
        channelBreakdown[item.channel] = { items: 0, cost: 0 };
      }
      channelBreakdown[item.channel].items++;
      channelBreakdown[item.channel].cost += itemCost;
    }

    // Update publication breakdown
    publicationBreakdown[pub.publicationName] = {
      items: pubItems,
      cost: pubCost
    };
  }

  return {
    totalOutlets: publications.length,
    totalChannels: allChannels.size,
    totalItems,
    monthlyCost,
    totalCost: monthlyCost * duration,
    channelBreakdown,
    publicationBreakdown
  };
}

/**
 * Generate insertion order document content
 */
export function generateInsertionOrder(packageData: HubPackage): string {
  const rows: string[] = [];

  // Header
  rows.push('='.repeat(80));
  rows.push('INSERTION ORDER');
  rows.push('='.repeat(80));
  rows.push('');
  rows.push(`Package: ${packageData.basicInfo.name}`);
  rows.push(`Date: ${new Date().toLocaleDateString()}`);
  rows.push('');
  
  // Client info section (to be filled)
  rows.push('CLIENT INFORMATION:');
  rows.push('Company Name: ___________________________');
  rows.push('Contact: ___________________________');
  rows.push('Email: ___________________________');
  rows.push('Phone: ___________________________');
  rows.push('');

  // Campaign details
  rows.push('CAMPAIGN DETAILS:');
  rows.push(`Package: ${packageData.basicInfo.name}`);
  rows.push(`Description: ${packageData.basicInfo.description}`);
  
  const duration = packageData.metadata?.builderInfo?.originalDuration;
  if (duration) {
    rows.push(`Duration: ${duration} months`);
  }
  
  rows.push(`Monthly Investment: $${packageData.pricing.breakdown.finalPrice.toLocaleString()}`);
  if (duration) {
    rows.push(`Total Investment: $${(packageData.pricing.breakdown.finalPrice * duration).toLocaleString()}`);
  }
  rows.push('');

  // Publications and inventory
  rows.push('INCLUDED PUBLICATIONS & ADVERTISING:');
  rows.push('-'.repeat(80));

  for (const pub of packageData.components.publications) {
    rows.push('');
    rows.push(`${pub.publicationName.toUpperCase()} - $${pub.publicationTotal.toFixed(2)}/month`);
    rows.push('');

    for (const item of pub.inventoryItems) {
      const frequency = item.currentFrequency || item.quantity || 1;
      const unitPrice = item.itemPricing?.hubPrice || 0;
      const monthlyCost = unitPrice * frequency;

      rows.push(`  - ${item.itemName}`);
      rows.push(`    Channel: ${item.channel}`);
      rows.push(`    Frequency: ${frequency}x per month`);
      rows.push(`    Unit Price: $${unitPrice.toFixed(2)}`);
      rows.push(`    Monthly Cost: $${monthlyCost.toFixed(2)}`);
      
      if (item.specifications) {
        const specs = Object.entries(item.specifications)
          .filter(([key, value]) => value)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        if (specs) {
          rows.push(`    Specifications: ${specs}`);
        }
      }
      rows.push('');
    }
  }

  rows.push('-'.repeat(80));
  rows.push('');

  // Terms
  rows.push('TERMS & CONDITIONS:');
  rows.push(`Lead Time: ${packageData.campaignDetails.leadTime}`);
  rows.push(`Material Deadline: ${packageData.campaignDetails.materialDeadline}`);
  rows.push(`Cancellation Policy: ${packageData.campaignDetails.cancellationPolicy}`);
  rows.push('');

  // Signatures
  rows.push('APPROVAL SIGNATURES:');
  rows.push('');
  rows.push('Client Signature: ___________________________  Date: _______________');
  rows.push('');
  rows.push('Sales Representative: ___________________________  Date: _______________');
  rows.push('');
  rows.push('='.repeat(80));

  return rows.join('\n');
}

/**
 * Download insertion order as text file
 */
export function downloadInsertionOrder(packageData: HubPackage): void {
  const content = generateInsertionOrder(packageData);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  
  const filename = `insertion-order-${packageData.basicInfo.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

