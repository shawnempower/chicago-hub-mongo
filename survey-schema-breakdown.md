# Complete Survey Schema Breakdown

This document shows a fully populated survey submission with explanations for each section.

## Survey Structure Overview

The survey is designed to capture comprehensive advertising inventory information from Chicago-area media outlets. It consists of 8 main steps plus metadata and admin fields.

## Detailed Field Breakdown

### 1. Metadata (Auto-generated)
```json
"metadata": {
  "respondentId": "1759520000000",          // Timestamp-based unique ID
  "collectorId": "web-form-v2",             // Form version identifier
  "startDate": "2025-10-03T19:00:00.000Z",  // When user started survey
  "endDate": "2025-10-03T19:15:30.000Z",    // When user completed survey
  "ipAddress": "192.168.1.100",            // User's IP address
  "userAgent": "Mozilla/5.0...",           // Browser information
  "referrer": "https://google.com/...",    // Where user came from
  "source": "web_form",                    // Always "web_form" for this survey
  "utmSource": "google",                   // UTM tracking parameters
  "utmMedium": "organic",
  "utmCampaign": "chicago-media-outreach"
}
```

### 2. Contact Information (Step 1 - Required)
```json
"contactInformation": {
  "firstName": "Sarah",                           // Optional
  "lastName": "Johnson",                          // Optional  
  "fullName": "Sarah M. Johnson",                 // Alternative to first/last
  "title": "Marketing Director & Publisher",      // Job title/position
  "email": "sarah.johnson@chicagovoice.com",     // Primary email (REQUIRED)
  "emailAddress": "sarah.johnson@chicagovoice.com", // Alternative email field
  "companyName": "Chicago Voice Media Group",    // Organization name
  "mediaOutletNames": "Chicago Voice Weekly, Neighborhood Spotlight, ChiTown Business Journal" // REQUIRED - Media outlet names
}
```

### 3. Website & Digital Advertising (Step 2)
```json
"websiteAdvertising": {
  "monthlyUniqueVisitors": 85000,                    // Website traffic
  "hasWebsiteAdvertising": true,                     // Boolean - do they offer web ads?
  "largestDigitalAdSize": "728x90 pixels (Leaderboard)",     // Primary ad size
  "secondLargestDigitalAdSize": "300x250 pixels (Medium Rectangle)", // Secondary ad size
  "largestAdWeeklyRate": 750,                        // Weekly rate for largest ad
  "largestAdMonthlyRate": 2800,                      // Monthly rate for largest ad
  "secondLargestAdWeeklyRate": 450,                  // Weekly rate for second ad
  "secondLargestAdMonthlyRate": 1600,                // Monthly rate for second ad
  "websiteTakeoverCost": 12000,                      // Full website takeover cost
  "mediaKitLink": "https://chicagovoice.com/advertise/media-kit-2025.pdf" // Link to media kit
}
```

### 4. Print Advertising (Step 3)
```json
"printAdvertising": {
  "hasPrintProduct": true,                    // Boolean - do they have print?
  "mainPrintProductName": "Chicago Voice Weekly",  // Name of main publication
  "printFrequency": "weekly",                 // How often published (daily/weekly/bi-weekly/monthly/quarterly/other)
  "averagePrintRun": 25000,                   // How many copies printed
  "distributionOutlets": 450,                 // Number of distribution points
  "fullPageAdSize": "10 x 13 inches",        // Full page ad dimensions
  "halfPageAdSize": "10 x 6.5 inches",       // Half page ad dimensions
  "fullPageRate1x": 3200,                    // Full page rate for 1 insertion
  "fullPageRate6x": 2900,                    // Full page rate for 6 insertions
  "fullPageRate12x": 2600,                   // Full page rate for 12 insertions
  "halfPageRate1x": 1800,                    // Half page rate for 1 insertion
  "halfPageRate6x": 1600,                    // Half page rate for 6 insertions
  "halfPageRate12x": 1400,                   // Half page rate for 12 insertions
  "printRatesComparable": "Our rates are competitive with similar Chicago-area publications..." // Free text comparison
}
```

### 5. Newsletter Advertising (Step 4)
```json
"newsletterAdvertising": {
  "hasNewsletter": true,                           // Boolean - do they have newsletter?
  "newsletterSubscribers": 15000,                  // Number of subscribers
  "newsletterFrequency": "bi-weekly",              // How often sent
  "newsletterAdSizeLargest": "600x200 pixels (Header Banner)", // Largest ad size
  "newsletterAdSizeSecond": "300x150 pixels (Sidebar)",       // Second ad size
  "newsletterLargestAdRate1x": 650,                // One-time rate for largest ad
  "newsletterLargestAdRateMonthly": 2200,          // Monthly rate for largest ad
  "newsletterSecondAdRate1x": 350,                 // One-time rate for second ad
  "newsletterSecondAdRateMonthly": 1200,           // Monthly rate for second ad
  "newsletterTakeoverCost": 4500,                  // Newsletter takeover cost
  "newsletterRatesComparable": "Our newsletter rates are 15-20% below market average..." // Rate comparison
}
```

### 6. Radio, Podcast & Video Advertising (Step 5)
```json
"radioPodcastAdvertising": {
  "hasRadioStation": true,                    // Boolean - do they have radio?
  "hasPodcast": true,                         // Boolean - do they have podcast?
  "radio30SecondAdsCost10x": 2200,            // Cost for 10x 30-second radio ads
  "radio60SecondAdsCost10x": 3800,            // Cost for 10x 60-second radio ads
  "podcast30SecondAdsCost10x": 1200,          // Cost for 10x 30-second podcast ads
  "podcastListenersPerShow": 8500,            // Average listeners per podcast episode
  "podcastSpecialTakeoversCost": 5500,        // Cost for special podcast takeovers
  "video30SecondAdCost": 800,                 // Cost for 30-second video ad
  "video60SecondAdCost": 1400,                // Cost for 60-second video ad
  "videoAverageViews": 12000                  // Average views per video
}
```

### 7. Social Media (Step 6)
```json
"socialMedia": {
  "facebookFollowers": 28000,                 // Facebook follower count
  "instagramFollowers": 18500,                // Instagram follower count
  "twitterFollowers": 12000,                  // Twitter/X follower count
  "tiktokFollowers": 22000,                   // TikTok follower count
  "linkedinFollowers": 8500,                  // LinkedIn follower count
  "otherSocialFollowers": "YouTube: 15,000 subscribers, Threads: 3,200 followers", // Other platforms
  "socialMediaAdvertisingOptions": "Sponsored posts, story takeovers, live event coverage..." // Services offered
}
```

### 8. Event Marketing (Step 7)
```json
"eventMarketing": {
  "hostsEvents": true,                        // Boolean - do they host events?
  "annualEventCount": 12,                     // Number of events per year
  "eventAttendanceRange": "150-800 attendees", // Typical attendance range
  "largestSponsorshipLevel": 15000,           // Highest sponsorship tier cost
  "smallestSponsorshipLevel": 500,            // Lowest sponsorship tier cost
  "eventSponsorshipDetails": "We host monthly networking events, quarterly business forums..." // Event details
}
```

### 9. Branded Content & Additional Services (Step 8)
```json
"brandedContent": {
  "offersBrandedContent": true,               // Boolean - do they offer branded content?
  "printBrandedContentCost": 4500,            // Cost for print branded content
  "websiteBrandedContentCost3Month": 8500,    // Cost for 3-month website branded content
  "shortFormContentCost": 2200,               // Cost for short-form content/interviews
  "brandedContentAdditionalInfo": "Our branded content team includes experienced journalists..." // Additional info
},
"additionalServices": {
  "offersOttMarketing": true,                 // Boolean - OTT (Over-the-Top) marketing
  "offersVirtualWebinars": true,              // Boolean - virtual webinars
  "producesOtherVideos": true,                // Boolean - other video production
  "videoProductionDetails": "Full-service video production including corporate videos...", // Video services details
  "customData": "We also provide consulting services for digital marketing strategy..." // Any additional services
}
```

### 10. Legacy Survey Responses (Optional - for data migration)
```json
"surveyResponses": {
  "responseIndicators": {
    "response1": true,                        // Various boolean/string indicators
    "response2": "high_engagement",           // from legacy survey systems
    "response3": true,
    "response4": "premium_tier",
    "response5": true,
    "response6": "multi_platform",
    "response7": true,
    "response10": "established_2018",
    "response13": true
  },
  "openEndedResponses": {
    "openEndedResponse1": "Our unique value proposition is hyperlocal Chicago coverage...",
    "openEndedResponse2": "We differentiate through authentic community engagement...",
    "generalResponse": "Chicago Voice Media Group has been serving the Chicago business community..."
  },
  "conditionalResponses": {
    "ifYes1Explanation": "We maintain strict editorial standards and clearly separate editorial content...",
    "ifYes2Explanation": "Our premium advertising packages include performance analytics..."
  },
  "parsedExtra": "Additional context: Strong focus on sustainability and local economic development..."
}
```

### 11. Application Status (Admin-managed)
```json
"application": {
  "status": "new",                            // new | reviewing | approved | rejected | follow_up_needed
  "reviewNotes": null,                        // Admin review notes
  "reviewedBy": null,                         // Email of admin who reviewed
  "reviewedAt": null                          // Timestamp of review
},
"createdAt": "2025-10-03T19:15:30.000Z",     // When survey was submitted
"updatedAt": "2025-10-03T19:15:30.000Z"      // When survey was last updated
```

## Survey Flow Logic

1. **Step 1 (Contact)**: Always shown, email and mediaOutletNames required
2. **Step 2 (Website)**: Always shown, conditional fields based on `hasWebsiteAdvertising`
3. **Step 3 (Print)**: Always shown, conditional fields based on `hasPrintProduct`
4. **Step 4 (Newsletter)**: Always shown, conditional fields based on `hasNewsletter`
5. **Step 5 (Radio/Podcast)**: Always shown, conditional fields based on `hasRadioStation`/`hasPodcast`
6. **Step 6 (Social Media)**: Always shown, all fields optional
7. **Step 7 (Events)**: Always shown, conditional fields based on `hostsEvents`
8. **Step 8 (Content/Services)**: Always shown, conditional fields based on `offersBrandedContent`

## Data Types

- **Strings**: Text fields, URLs, descriptions
- **Numbers**: Follower counts, rates, costs (stored as number or string for flexibility)
- **Booleans**: Yes/No questions (hasWebsiteAdvertising, hasPrintProduct, etc.)
- **Enums**: printFrequency has specific allowed values
- **Dates**: ISO 8601 format timestamps
- **Mixed**: Some cost fields allow null for "N/A" responses

## Validation Rules

- `contactInformation.mediaOutletNames` is required
- At least one email field (`email` or `emailAddress`) is required
- Boolean fields trigger conditional field visibility
- Numeric fields accept both numbers and strings for flexibility
- All other fields are optional to accommodate partial submissions

