/**
 * Tracking Tag Transformation Utilities
 * 
 * Transforms base tracking tags into ad server and ESP-specific formats.
 * Base tags use placeholders (CACHE_BUSTER, EMAIL_ID) that get replaced
 * with the appropriate macros/merge tags for each platform.
 */

import { PublicationAdServer, PublicationESP } from '@/integrations/mongodb/schemas';

// ===== AD SERVER TRANSFORMATIONS (Web/Display) =====

/**
 * Ad server macro configurations
 */
export const AD_SERVER_MACROS: Record<PublicationAdServer, {
  name: string;
  clickMacro: string;      // Wraps the click URL for tracking
  cacheBuster: string;     // Dynamic timestamp macro
  instructions: string;
}> = {
  gam: {
    name: 'Google Ad Manager (DFP)',
    clickMacro: '%%CLICK_URL_UNESC%%',
    cacheBuster: '%%CACHEBUSTER%%',
    instructions: 'Paste this tag into a Third-Party Creative in GAM. The click macro will automatically track clicks through DFP.'
  },
  broadstreet: {
    name: 'Broadstreet',
    clickMacro: '{{click}}',
    cacheBuster: '[timestamp]',
    instructions: 'Paste this tag into a Custom HTML ad in Broadstreet. Click tracking is handled automatically.'
  },
  direct: {
    name: 'Direct / No Ad Server',
    clickMacro: '', // No wrapper needed
    cacheBuster: 'DIRECT_TIMESTAMP', // Placeholder - replaced with JS runtime value
    instructions: 'Paste this tag directly into your CMS or website HTML. Includes bot protection and lazy loading.'
  }
};

/**
 * Transform a base tag for a specific ad server
 * 
 * @param baseTag - The base HTML tag with CACHE_BUSTER placeholder
 * @param adServer - Target ad server (gam, broadstreet, direct)
 * @param clickUrl - The original click/landing page URL
 * @returns Transformed tag with ad server-specific macros
 */
export function transformForAdServer(
  baseTag: string,
  adServer: PublicationAdServer,
  clickUrl?: string
): string {
  const macros = AD_SERVER_MACROS[adServer];
  let transformed = baseTag;
  
  // For GAM and Broadstreet, simple macro replacement
  if (adServer !== 'direct') {
    // Replace cache buster placeholder
    transformed = transformed.replace(/CACHE_BUSTER/g, macros.cacheBuster);
    
    // Wrap click URLs with their tracking macros
    if (macros.clickMacro && clickUrl) {
      transformed = transformed.replace(
        /href="(https?:\/\/[^"]*\/c\?[^"]*)"/g,
        `href="${macros.clickMacro}$1"`
      );
    }
    return transformed;
  }
  
  // For Direct placement: Generate JavaScript-based implementation with bot protection
  // Extract URLs from the base tag
  const clickMatch = baseTag.match(/href="([^"]+)"/);
  const imgMatch = baseTag.match(/img src="([^"]+)"/);
  // Match impression pixel (1x1 image, typically at end of tag with display:none)
  const pixelMatch = baseTag.match(/<img src="(https:\/\/[^"]+)"[^>]*width="1"[^>]*height="1"/);
  const altMatch = baseTag.match(/alt="([^"]*)"/);
  const sizeMatch = baseTag.match(/width="(\d+)" height="(\d+)"/);
  
  const clickUrl_extracted = clickMatch?.[1]?.replace(/CACHE_BUSTER/g, "'+Date.now()+'") || '';
  const imgUrl = imgMatch?.[1] || '';
  const pixelUrl = pixelMatch?.[1]?.replace(/CACHE_BUSTER/g, "'+Date.now()+'") || '';
  const altText = altMatch?.[1] || 'Advertisement';
  const width = sizeMatch?.[1] || '300';
  const height = sizeMatch?.[2] || '250';

  // Return a JavaScript snippet with bot protection and lazy loading
  return `<!-- Direct Ad Tag with Bot Protection -->
<div id="ad-container-${Date.now()}" style="width:${width}px;height:${height}px;">
  <noscript>
    <!-- Fallback for no-JS (rare, but good practice) -->
    <a href="${clickUrl || '#'}"><img src="${imgUrl}" width="${width}" height="${height}" alt="${altText}" /></a>
  </noscript>
</div>
<script>
(function() {
  // Bot detection: Only fire if JS executes and basic checks pass
  var isBot = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit/i.test(navigator.userAgent);
  if (isBot) return;
  
  var container = document.currentScript.previousElementSibling;
  var fired = false;
  
  function renderAd() {
    if (fired) return;
    fired = true;
    var ts = Date.now();
    container.innerHTML = '<a href="${clickUrl_extracted}" target="_blank">' +
      '<img src="${imgUrl}" width="${width}" height="${height}" alt="${altText}" style="border:0;" />' +
      '</a>' +
      '<img src="${pixelUrl}" width="1" height="1" style="display:none;" />';
  }
  
  // Lazy load: Only render when in viewport
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting) {
        observer.disconnect();
        renderAd();
      }
    }, { threshold: 0.1 });
    observer.observe(container);
  } else {
    // Fallback for older browsers
    renderAd();
  }
})();
</script>`;
}

/**
 * Get instructions for a specific ad server
 */
export function getAdServerInstructions(adServer: PublicationAdServer): string {
  return AD_SERVER_MACROS[adServer]?.instructions || 'Paste this tag into your ad server.';
}


// ===== ESP TRANSFORMATIONS (Newsletter) =====

/**
 * ESP merge tag configurations
 * Each ESP has different syntax for merge tags
 */
export const ESP_MERGE_TAGS: Record<PublicationESP, {
  name: string;
  emailId: string;         // Merge tag for subscriber unique ID
  cacheBuster: string;     // Merge tag for timestamp/cache busting
  instructions: string;
}> = {
  mailchimp: {
    name: 'Mailchimp',
    emailId: '*|UNIQID|*',
    cacheBuster: '*|DATE:U|*',
    instructions: 'Paste into a Code block in your Mailchimp campaign. Merge tags will be replaced when sent.'
  },
  constant_contact: {
    name: 'Constant Contact',
    emailId: '[[CONTACT_ID]]',
    cacheBuster: '[[DATE]]',
    instructions: 'Use the Custom Code block in Constant Contact to paste this tag.'
  },
  campaign_monitor: {
    name: 'Campaign Monitor',
    emailId: '[subscriberkey]',
    cacheBuster: '[currentdatetimestamp]',
    instructions: 'Paste into an HTML block in Campaign Monitor.'
  },
  klaviyo: {
    name: 'Klaviyo',
    emailId: '{{ person.id }}',
    cacheBuster: '{{ now|date:"U" }}',
    instructions: 'Use a Custom HTML block in Klaviyo. Django-style merge tags will be processed.'
  },
  sailthru: {
    name: 'Sailthru',
    emailId: '{extid}',
    cacheBuster: '{date format="U"}',
    instructions: 'Paste into your Sailthru template HTML.'
  },
  active_campaign: {
    name: 'ActiveCampaign',
    emailId: '%SUBSCRIBERID%',
    cacheBuster: '%DATETIME%',
    instructions: 'Use the HTML block in ActiveCampaign to add this tag.'
  },
  sendgrid: {
    name: 'SendGrid',
    emailId: '{{contact.id}}',
    cacheBuster: '{{timestamp}}',
    instructions: 'Paste into your SendGrid dynamic template or design editor.'
  },
  beehiiv: {
    name: 'Beehiiv',
    emailId: '{{subscriber_id}}',
    cacheBuster: '{{timestamp}}',
    instructions: 'Use the Custom HTML block in Beehiiv newsletter editor.'
  },
  convertkit: {
    name: 'ConvertKit',
    emailId: '{{ subscriber.id }}',
    cacheBuster: '{{ "now" | date: "%s" }}',
    instructions: 'Paste into a Custom HTML block in your ConvertKit broadcast.'
  },
  emma: {
    name: 'Emma',
    emailId: '[[member_id]]',
    cacheBuster: '[[send_date]]',
    instructions: 'Use the Code block in Emma\'s email editor.'
  },
  hubspot: {
    name: 'HubSpot',
    emailId: '{{contact.hs_object_id}}',
    cacheBuster: '{{current_time}}',
    instructions: 'Paste into a Custom Module or HTML block in HubSpot.'
  },
  brevo: {
    name: 'Brevo (Sendinblue)',
    emailId: '{{contact.ID}}',
    cacheBuster: '{{today format="U"}}',
    instructions: 'Use the HTML block in Brevo\'s email designer.'
  },
  mailer_lite: {
    name: 'MailerLite',
    emailId: '{$subscriber_id}',
    cacheBuster: '{$timestamp}',
    instructions: 'Paste into a Custom HTML block in MailerLite.'
  },
  drip: {
    name: 'Drip',
    emailId: '{{ subscriber.id }}',
    cacheBuster: '{{ now | date: "%s" }}',
    instructions: 'Use Liquid tags in your Drip email template.'
  },
  aweber: {
    name: 'AWeber',
    emailId: '{!subscriber_id}',
    cacheBuster: '{!date_sent}',
    instructions: 'Paste into your AWeber message using the HTML editor.'
  },
  other: {
    name: 'Other / Unknown',
    emailId: 'EMAIL_ID',
    cacheBuster: 'CACHE_BUSTER',
    instructions: 'Replace EMAIL_ID with your ESP\'s subscriber ID merge tag, and CACHE_BUSTER with a timestamp merge tag.'
  }
};

/**
 * Transform a base tag for a specific ESP
 * 
 * @param baseTag - The base HTML tag with EMAIL_ID and CACHE_BUSTER placeholders
 * @param esp - Target Email Service Provider
 * @param customTags - Optional custom merge tags (for 'other' ESP)
 * @returns Transformed tag with ESP-specific merge tags
 */
export function transformForESP(
  baseTag: string,
  esp: PublicationESP,
  customTags?: { emailId?: string; cacheBuster?: string }
): string {
  const tags = ESP_MERGE_TAGS[esp];
  let transformed = baseTag;
  
  // Use custom tags if provided (for 'other' ESP), otherwise use the standard ones
  const emailIdTag = customTags?.emailId || tags.emailId;
  const cacheBusterTag = customTags?.cacheBuster || tags.cacheBuster;
  
  // Replace placeholders with ESP-specific merge tags
  transformed = transformed.replace(/EMAIL_ID/g, emailIdTag);
  transformed = transformed.replace(/CACHE_BUSTER/g, cacheBusterTag);
  
  return transformed;
}

/**
 * Get instructions for a specific ESP
 */
export function getESPInstructions(esp: PublicationESP): string {
  return ESP_MERGE_TAGS[esp]?.instructions || 'Paste this tag into your email platform.';
}

/**
 * Get the display name for an ESP
 */
export function getESPName(esp: PublicationESP): string {
  return ESP_MERGE_TAGS[esp]?.name || esp;
}

/**
 * Get the display name for an ad server
 */
export function getAdServerName(adServer: PublicationAdServer): string {
  return AD_SERVER_MACROS[adServer]?.name || adServer;
}


// ===== UTILITY FUNCTIONS =====

/**
 * Get all available ad server options for a dropdown
 */
export function getAdServerOptions(): Array<{ value: PublicationAdServer; label: string }> {
  return [
    { value: 'gam', label: 'Google Ad Manager (GAM)' },
    { value: 'broadstreet', label: 'Broadstreet' },
    { value: 'direct', label: 'Direct / No Ad Server' }
  ];
}

/**
 * Get all available ESP options for a dropdown
 */
export function getESPOptions(): Array<{ value: PublicationESP; label: string }> {
  return [
    { value: 'mailchimp', label: 'Mailchimp' },
    { value: 'constant_contact', label: 'Constant Contact' },
    { value: 'campaign_monitor', label: 'Campaign Monitor' },
    { value: 'klaviyo', label: 'Klaviyo' },
    { value: 'sailthru', label: 'Sailthru' },
    { value: 'active_campaign', label: 'ActiveCampaign' },
    { value: 'sendgrid', label: 'SendGrid' },
    { value: 'beehiiv', label: 'Beehiiv' },
    { value: 'convertkit', label: 'ConvertKit' },
    { value: 'emma', label: 'Emma' },
    { value: 'hubspot', label: 'HubSpot' },
    { value: 'brevo', label: 'Brevo (Sendinblue)' },
    { value: 'mailer_lite', label: 'MailerLite' },
    { value: 'drip', label: 'Drip' },
    { value: 'aweber', label: 'AWeber' },
    { value: 'other', label: 'Other / Custom' }
  ];
}

/**
 * Detect if a tag contains newsletter-specific placeholders
 */
export function isNewsletterTag(tag: string): boolean {
  return tag.includes('EMAIL_ID') || tag.includes('eid=');
}

/**
 * Detect if a tag contains web/display placeholders
 */
export function isDisplayTag(tag: string): boolean {
  return !isNewsletterTag(tag) && tag.includes('CACHE_BUSTER');
}
