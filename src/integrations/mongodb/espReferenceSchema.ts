/**
 * ESP Reference Schema
 * 
 * Reference data for email service providers.
 * Used for publication configuration and tracking tag generation.
 * 
 * This schema helps determine HTML tag compatibility when generating
 * newsletter ad tags for different ESPs.
 */

import { ObjectId } from 'mongodb';

/**
 * HTML support levels for ESPs
 */
export type ESPHTMLSupport = 'full' | 'limited' | 'none';

/**
 * ESP Reference Document
 */
export interface ESPReference {
  _id?: string | ObjectId;
  name: string;                // Display name (e.g., "Mailchimp")
  slug: string;                // URL-safe identifier (e.g., "mailchimp")
  htmlSupport: ESPHTMLSupport;
  notes?: string;              // Known limitations or quirks
  isActive: boolean;           // Whether to show in UI dropdowns
}

// Type for creating new ESP references
export type ESPReferenceInsert = Omit<ESPReference, '_id'>;

/**
 * ESP HTML Support Labels for UI
 */
export const ESP_HTML_SUPPORT_LABELS: Record<ESPHTMLSupport, string> = {
  full: 'Full HTML Support',
  limited: 'Limited HTML Support',
  none: 'No HTML Support',
};

/**
 * ESP HTML Support Descriptions
 */
export const ESP_HTML_SUPPORT_DESCRIPTIONS: Record<ESPHTMLSupport, string> = {
  full: 'Supports full HTML including tracking pixels, complex layouts, and custom CSS',
  limited: 'Some HTML features may be stripped or modified. Test before deploying.',
  none: 'Does not support custom HTML. Only text-based or platform-native ads supported.',
};

/**
 * Pre-populated ESP data for seeding
 */
export const ESP_SEED_DATA: ESPReferenceInsert[] = [
  // Full HTML Support - Major Platforms
  { name: 'Mailchimp', slug: 'mailchimp', htmlSupport: 'full', isActive: true },
  { name: 'Constant Contact', slug: 'constant-contact', htmlSupport: 'full', isActive: true },
  { name: 'Campaign Monitor', slug: 'campaign-monitor', htmlSupport: 'full', isActive: true },
  { name: 'HubSpot', slug: 'hubspot', htmlSupport: 'full', isActive: true },
  { name: 'Klaviyo', slug: 'klaviyo', htmlSupport: 'full', isActive: true },
  { name: 'ActiveCampaign', slug: 'activecampaign', htmlSupport: 'full', isActive: true },
  { name: 'AWeber', slug: 'aweber', htmlSupport: 'full', isActive: true },
  { name: 'Drip', slug: 'drip', htmlSupport: 'full', isActive: true },
  { name: 'GetResponse', slug: 'getresponse', htmlSupport: 'full', isActive: true },
  { name: 'MailerLite', slug: 'mailerlite', htmlSupport: 'full', isActive: true },
  { name: 'SendGrid', slug: 'sendgrid', htmlSupport: 'full', isActive: true },
  { name: 'Brevo', slug: 'brevo', htmlSupport: 'full', isActive: true },
  { name: 'Emma', slug: 'emma', htmlSupport: 'full', isActive: true },
  { name: 'Sailthru', slug: 'sailthru', htmlSupport: 'full', isActive: true },
  { name: 'Pardot', slug: 'pardot', htmlSupport: 'full', isActive: true },
  { name: 'Second Street', slug: 'second-street', htmlSupport: 'full', isActive: true },
  
  // Full HTML Support - Additional Platforms
  { name: 'Benchmark', slug: 'benchmark', htmlSupport: 'full', isActive: true },
  { name: 'Campaigner', slug: 'campaigner', htmlSupport: 'full', isActive: true },
  { name: 'EmailOctopus', slug: 'emailoctopus', htmlSupport: 'full', isActive: true },
  { name: 'EngageBay', slug: 'engagebay', htmlSupport: 'full', isActive: true },
  { name: 'iContact', slug: 'icontact', htmlSupport: 'full', isActive: true },
  { name: 'Keap', slug: 'keap', htmlSupport: 'full', isActive: true },
  { name: 'Mailjet', slug: 'mailjet', htmlSupport: 'full', isActive: true },
  { name: 'Mailmodo', slug: 'mailmodo', htmlSupport: 'full', isActive: true },
  { name: 'MailPoet', slug: 'mailpoet', htmlSupport: 'full', isActive: true },
  { name: 'Moosend', slug: 'moosend', htmlSupport: 'full', isActive: true },
  { name: 'Ontraport', slug: 'ontraport', htmlSupport: 'full', isActive: true },
  { name: 'Oracle Eloqua', slug: 'oracle-eloqua', htmlSupport: 'full', isActive: true },
  { name: 'Sender', slug: 'sender', htmlSupport: 'full', isActive: true },
  { name: 'WhatCounts', slug: 'whatcounts', htmlSupport: 'full', isActive: true },
  { name: 'Zeta Global', slug: 'zeta-global', htmlSupport: 'full', isActive: true },
  { name: 'Zoho Campaigns', slug: 'zoho-campaigns', htmlSupport: 'full', isActive: true },
  { name: 'Indie Email', slug: 'indie-email', htmlSupport: 'full', isActive: true },
  { name: 'Customer.io', slug: 'customer-io', htmlSupport: 'full', isActive: true },
  { name: 'Intercom', slug: 'intercom', htmlSupport: 'full', isActive: true },
  { name: 'Iterable', slug: 'iterable', htmlSupport: 'full', isActive: true },
  
  // Limited HTML Support
  { 
    name: 'Beehiiv', 
    slug: 'beehiiv', 
    htmlSupport: 'limited', 
    notes: 'HTML support varies by subscription tier. Custom HTML may require paid plans.',
    isActive: true 
  },
  { 
    name: 'ConvertKit', 
    slug: 'convertkit', 
    htmlSupport: 'limited', 
    notes: 'Free tier has limited HTML. Paid tiers have full support. Now rebranded to Kit.',
    isActive: true 
  },
  { 
    name: 'Kit', 
    slug: 'kit', 
    htmlSupport: 'limited', 
    notes: 'Formerly ConvertKit. Limited HTML in free tier, full support in paid tiers.',
    isActive: true 
  },
  { 
    name: 'Rasa', 
    slug: 'rasa', 
    htmlSupport: 'limited', 
    notes: 'May strip tracking pixels in some cases. Test before deploying.',
    isActive: true 
  },
  { 
    name: 'Buttondown', 
    slug: 'buttondown', 
    htmlSupport: 'limited', 
    notes: 'Markdown-based. HTML supported but may be sanitized.',
    isActive: true 
  },
  { 
    name: 'Ghost', 
    slug: 'ghost', 
    htmlSupport: 'limited', 
    notes: 'Native newsletter feature has limited HTML embedding options.',
    isActive: true 
  },
  
  // No/Restricted Support
  { 
    name: 'Substack', 
    slug: 'substack', 
    htmlSupport: 'none', 
    notes: 'Does not support custom HTML. Only native ad placements through Substack platform.',
    isActive: true 
  },
  { 
    name: 'Revue', 
    slug: 'revue', 
    htmlSupport: 'none', 
    notes: 'Twitter Revue (discontinued). Limited HTML support when active.',
    isActive: false 
  },
];

/**
 * Get ESPs by support level
 */
export function getESPsBySupport(support: ESPHTMLSupport): ESPReferenceInsert[] {
  return ESP_SEED_DATA.filter(esp => esp.htmlSupport === support && esp.isActive);
}

/**
 * Get active ESPs
 */
export function getActiveESPs(): ESPReferenceInsert[] {
  return ESP_SEED_DATA.filter(esp => esp.isActive);
}

/**
 * Find ESP by slug
 */
export function findESPBySlug(slug: string): ESPReferenceInsert | undefined {
  return ESP_SEED_DATA.find(esp => esp.slug === slug.toLowerCase());
}

/**
 * Check if an ESP supports full HTML
 */
export function supportsFullHTML(slug: string): boolean {
  const esp = findESPBySlug(slug);
  return esp?.htmlSupport === 'full';
}
