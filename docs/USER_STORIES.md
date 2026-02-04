# Comprehensive User Stories

This document provides a complete catalog of user stories for the Chicago Hub platform, organized by user type. All stories are derived from the actual codebase implementation and include detailed acceptance criteria, scenarios, and business context.

---

## Table of Contents

1. [Publication User Stories](#publication-user-stories)
2. [Hub User Stories](#hub-user-stories)
3. [Shared User Stories](#shared-user-stories)
4. [Permission Model](#permission-model)
5. [Appendix: Workflows and Data Models](#appendix-workflows-and-data-models)

---

## Publication User Stories

Publication users are media outlet representatives who manage their publication's profile, inventory, and advertising orders within the platform. They receive insertion orders from hub users and are responsible for delivering advertising campaigns.

### PUB-AUTH: Authentication & Access

---

#### PUB-AUTH-001: Sign In to Publication Dashboard

**As a** publication user  
**I want to** sign in with my email and password  
**So that** I can access my publication dashboard and manage my advertising business

**Acceptance Criteria:**
- User can enter email address (case-insensitive)
- User can enter password (masked input)
- Successful login redirects to `/dashboard`
- Failed login displays "Invalid email or password" error
- Session persists across browser refresh (JWT stored in localStorage)
- Session expires after 24 hours, requiring re-authentication

**Business Context:**
Publications need secure access to manage their advertising inventory, respond to orders, and track campaign performance.

**Edge Cases:**
- Account locked after 5 failed attempts (if implemented)
- Unverified email shows verification prompt
- Password reset link available from login screen

---

#### PUB-AUTH-002: Select Publication to Manage

**As a** publication user with access to multiple publications  
**I want to** select which publication I'm currently managing  
**So that** I can switch between different publications I represent

**Acceptance Criteria:**
- Publication selector dropdown appears in the header when user has access to 2+ publications
- Dropdown shows publication names sorted alphabetically
- Selected publication is stored in localStorage and persists across sessions
- Switching publications immediately updates all dashboard data
- If only one publication assigned, selector does not appear
- Currently selected publication is highlighted in dropdown

**Scenarios:**

| Scenario | Action | Expected Result |
|----------|--------|-----------------|
| User with 1 publication | Login | Automatically selects the single publication |
| User with 3 publications | Click dropdown | Shows all 3 publications |
| User switches publication | Select different publication | Dashboard refreshes with new publication data |
| User refreshes page | Browser reload | Previously selected publication remains selected |

---

#### PUB-AUTH-003: Accept Publication Invitation

**As a** person invited to manage a publication  
**I want to** accept the invitation  
**So that** I can gain access to the publication's dashboard

**Acceptance Criteria:**
- Clicking invitation link from email navigates to `/accept-invitation/:token`
- Page displays invitation details: publication name, who invited, expiration date
- If user has account: shows login prompt, then accepts after authentication
- If user is new: shows registration form, creates account, then accepts
- After acceptance: user is redirected to publication dashboard
- Invitation marked as "accepted" and cannot be reused
- Invitation expires after 7 days if not accepted

**Error Handling:**
- Expired invitation shows "This invitation has expired" message with option to request new one
- Already-accepted invitation shows "This invitation has already been used"
- Invalid token shows "Invitation not found"

---

### PUB-DASH: Dashboard & Navigation

---

#### PUB-DASH-001: View Dashboard Overview

**As a** publication user  
**I want to** see a dashboard overview when I log in  
**So that** I can quickly understand what needs my attention

**Acceptance Criteria:**
- Dashboard loads within 3 seconds of login
- Displays publication name prominently at top
- Shows Action Center section with prioritized tasks
- Shows Data Quality section with completeness percentage
- Shows Knowledge Base section with uploaded files
- Shows Recent Activity section (last 10 activities)
- Empty states shown gracefully when no data exists

**Dashboard Sections:**

| Section | Purpose | Key Metrics |
|---------|---------|-------------|
| Action Center | Urgent tasks | Overdue reports, pending orders, starting campaigns |
| Data Quality | Profile completeness | Percentage score, items needing attention |
| Knowledge Base | Document management | File count, recent uploads |
| Recent Activity | Audit trail | Last 10 changes with timestamps |

---

#### PUB-DASH-002: Navigate Dashboard Sections

**As a** publication user  
**I want to** navigate between different sections of my dashboard  
**So that** I can manage all aspects of my publication

**Acceptance Criteria:**
- Vertical navigation sidebar on left side
- Navigation tabs: Dashboard, Publication, Inventory, Leads, Orders, Settings, Storefront
- Current tab highlighted with background color
- Clicking tab updates URL query parameter (`?tab=inventory`)
- Browser back/forward buttons work correctly
- Direct URL navigation works (e.g., `/dashboard?tab=orders`)

**Tab Icons:**
- Dashboard: LayoutDashboard
- Publication: Newspaper
- Inventory: Package
- Leads: Users
- Orders: FileText
- Settings: Settings
- Storefront: Store

---

#### PUB-DASH-003: View Action Center

**As a** publication user  
**I want to** see an action center highlighting urgent tasks  
**So that** I know exactly what needs my attention right now

**Acceptance Criteria:**
- Action items categorized by priority: Urgent (red), Soon (amber), Info (blue), Done (green)
- Each action item shows: title, subtitle, campaign name, action button
- Clicking action item navigates to relevant order detail
- Items grouped by order to avoid overwhelming list

**Action Types:**

| Type | Priority | Description | Action Label |
|------|----------|-------------|--------------|
| `overdue_report` | Urgent | Campaign ended, no results reported | "Report Now" |
| `missing_proof` | Urgent | Results submitted but no proof of performance | "Add Proof" |
| `needs_acceptance` | Urgent | New order waiting for review | "Review Order" |
| `ready_to_go_live` | Urgent/Soon | Placement accepted, campaign started/starting | "Go Live" |
| `awaiting_assets` | Info | Digital placement accepted, waiting for scripts | "View" |
| `starting_soon` | Soon | Campaign starts in next 7 days | "View Order" |
| `ending_soon` | Soon | Campaign ends in next 7 days | "View Order" |
| `completed` | Done | Placement fully reported with proof | "View" |

**Aggregation Rules:**
- Multiple placements of same type for same order are grouped
- Shows "3 placements need reports" instead of 3 separate items
- Grouped items expand to show individual placement names on hover

---

#### PUB-DASH-004: View Data Quality Metrics

**As a** publication user  
**I want to** see data quality metrics for my publication  
**So that** I can understand how complete my profile is and what needs improvement

**Acceptance Criteria:**
- Overall completeness score shown as percentage (0-100%)
- Score color-coded: Green (90%+), Yellow (70-89%), Red (<70%)
- Breakdown by category: Basic Info, Contact, Inventory, Pricing, Specifications
- Each category shows: items checked, items complete, percentage
- Recommendations shown for highest-impact improvements
- Click category to navigate to relevant editor section

**Quality Calculation:**
- Each inventory item checked for: name, pricing, performance metrics, specifications
- Missing required fields reduce score
- Hub-specific pricing adds bonus points
- Formula: (complete_fields / total_required_fields) * 100

---

#### PUB-DASH-005: View Full Publication Summary

**As a** publication user  
**I want to** view a full summary of my publication  
**So that** I can see all data in a comprehensive, printable format

**Acceptance Criteria:**
- Accessible via "View Full Summary" button on dashboard
- Displays all publication data in organized sections
- Sections: Basic Info, Contact, Website, Newsletters, Print, Social, Podcasts, Radio, Events, Streaming, Demographics
- Each section shows current values and data quality indicators
- Back button returns to dashboard overview
- Print-friendly layout available

---

### PUB-PROF: Publication Profile Management

---

#### PUB-PROF-001: View Publication Basic Information

**As a** publication user  
**I want to** view my publication's basic information  
**So that** I can verify the accuracy of our profile

**Acceptance Criteria:**
- Display publication name (required)
- Display website URL with clickable link
- Display publication type: daily, weekly, bi-weekly, monthly, quarterly, other
- Display content type: news, lifestyle, business, entertainment, sports, alternative, mixed
- Display geographic coverage: local, regional, state, national, international
- Display primary service area (city/region)
- Display secondary markets (array)
- Display founding year

---

#### PUB-PROF-002: Edit Publication Basic Information

**As a** publication user  
**I want to** edit my publication's basic information  
**So that** I can keep our profile accurate and up-to-date

**Acceptance Criteria:**
- All fields are editable inline or via modal
- Publication name: required, 3-100 characters
- Website URL: must be valid URL format
- Publication type: dropdown with predefined options
- Content type: dropdown with predefined options
- Geographic coverage: dropdown with predefined options
- Primary service area: autocomplete with city/region database
- Secondary markets: multi-select tags
- Save button confirms changes
- Cancel button discards changes
- Activity log updated with changes and user who made them

**Validation:**
- Website URL: must start with http:// or https://
- Publication name: cannot be empty
- Changes require at least one field modification

---

#### PUB-PROF-003: Manage Contact Information

**As a** publication user  
**I want to** manage contact information  
**So that** hub teams can reach the right people

**Acceptance Criteria:**
- Three contact types: Primary, Sales, Editorial
- Each contact includes: name, title, email, phone, preferred contact method
- Preferred contact method options: email, phone, text, linkedin
- Email validation: must be valid email format
- Phone validation: accepts various formats, normalized on save
- At least one contact required (primary)
- Contacts displayed on public storefront if enabled

**Contact Fields:**

| Field | Required | Validation |
|-------|----------|------------|
| Name | Yes | 2-100 characters |
| Title | No | 2-100 characters |
| Email | Yes | Valid email format |
| Phone | No | Phone number format |
| Preferred Contact | No | enum: email, phone, text, linkedin |

---

#### PUB-PROF-004: Update Audience Demographics

**As a** publication user  
**I want to** update audience demographics  
**So that** advertisers can understand our audience and campaigns can be better targeted

**Acceptance Criteria:**
- Age groups: percentage sliders for 18-24, 25-34, 35-44, 45-54, 55-64, 65+ (must sum to 100%)
- Gender distribution: percentage for male, female, other (must sum to 100%)
- Household income: percentage brackets (<$35k, $35-50k, $50-75k, $75-100k, $100-150k, $150k+)
- Education: percentage for high school, some college, bachelor's, graduate
- Interests: multi-select tags from predefined list + custom
- Target markets: multi-select geographic areas

**UI Controls:**
- Sliders that auto-adjust to maintain 100% total
- Visual pie charts showing distribution
- Ability to reset to "unknown" state

---

#### PUB-PROF-005: Configure Editorial Information

**As a** publication user  
**I want to** configure editorial information  
**So that** advertisers understand our content focus

**Acceptance Criteria:**
- Content focus: multi-select from predefined categories + custom
- Content pillars: free-form tags describing main themes
- Special sections: recurring special editions/supplements
- Signature features: notable columns or features
- Editorial team: editor-in-chief, managing editor, key writers
- Contributing writers: list of regular contributors

---

#### PUB-PROF-006: Set Booking Policies

**As a** publication user  
**I want to** set booking policies  
**So that** advertisers know our terms before booking

**Acceptance Criteria:**
- Minimum lead time: dropdown (24 hours, 48 hours, 1 week, 2 weeks, etc.)
- Cancellation policy: text area with common templates
- Material deadline: dropdown (same as lead time options)
- Payment terms: dropdown (Net 15, Net 30, Net 45, etc.) or custom
- Agency discount percentage: 0-25% slider
- Credit cards accepted: yes/no toggle
- Policies displayed on insertion orders and storefront

---

### PUB-INV: Inventory Management

---

#### PUB-INV-001: Manage Website Advertising Inventory

**As a** publication user  
**I want to** manage website advertising inventory  
**So that** I can offer digital ad placements to advertisers

**Acceptance Criteria:**
- Add new placement: name, format, location, pricing, specifications
- Edit existing placements inline
- Delete placements (with confirmation)
- Toggle availability on/off per placement

**Placement Fields:**

| Field | Description | Options/Format |
|-------|-------------|----------------|
| Name | Descriptive name | "Homepage Leaderboard", "Sidebar 300x250" |
| Ad Format | IAB standard or custom | 300x250, 728x90, 300x600, 970x250, native, video, takeover, custom |
| Location | Where on site | Header, Sidebar, Footer, In-article, Sticky |
| Pricing Model | How charged | CPM, Flat Rate, CPC, CPA, Contact |
| CPM Rate | Cost per 1000 impressions | $5.00 - $100.00 typical |
| Flat Rate | Fixed price | Per day, per week, per month |
| Monthly Impressions | Expected volume | Used for revenue calculations |
| Specifications | Creative requirements | Size, format, file size, animation rules |
| Third-party tags | Tag support | Yes/No with ad server integration |

**Performance Metrics:**
- Monthly impressions (estimated or guaranteed)
- Viewability percentage (if tracked)
- Average CTR (if known)

---

#### PUB-INV-002: Manage Newsletter Advertising Inventory

**As a** publication user  
**I want to** manage newsletter advertising inventory  
**So that** I can offer email ad placements to advertisers

**Acceptance Criteria:**
- Support multiple newsletters per publication
- Each newsletter has: name, frequency, send day/time, subscriber count, open rate, CTR
- Ad positions: header, footer, inline, dedicated send
- Pricing: per-send or monthly

**Newsletter Fields:**

| Field | Description |
|-------|-------------|
| Newsletter Name | "Daily Digest", "Weekly Roundup" |
| Subject Line Pattern | Template for subject lines |
| Frequency | Daily, Weekly, Bi-weekly, Monthly, Irregular |
| Send Day | Monday-Sunday |
| Send Time | HH:MM timezone |
| Subscribers | Active subscriber count |
| Open Rate | Percentage (10-50% typical) |
| Click-Through Rate | Percentage (1-10% typical) |

**Ad Position Options:**
- Header: Top of newsletter, highest visibility
- Footer: Bottom of newsletter
- Inline: Between content sections
- Dedicated: Entire newsletter sponsored

---

#### PUB-INV-003: Manage Print Advertising Inventory

**As a** publication user  
**I want to** manage print advertising inventory  
**So that** I can offer traditional print ad placements

**Acceptance Criteria:**
- Support multiple print products per publication
- Each product has: name, frequency, circulation, distribution area
- Ad formats: full page, half page (horizontal/vertical), quarter page, eighth page, business card, classified, insert
- Pricing tiers: 1x, 4x, 12x rates
- Color options: color, B&W, both with price differential

**Print Fields:**

| Field | Description |
|-------|-------------|
| Product Name | "Main Edition", "Weekend Magazine" |
| Frequency | Daily, Weekly, Bi-weekly, Monthly, Quarterly |
| Circulation | Total distribution |
| Paid Circulation | Paid subscribers |
| Free Circulation | Free distribution |
| Distribution Area | Geographic description |
| Distribution Points | List of locations |
| Print Schedule | Publication calendar |

**Ad Specifications:**
- Dimensions (width x height in inches or mm)
- Bleed requirements
- File format (PDF, EPS, AI preferred)
- Resolution (300 DPI minimum)
- Color space (CMYK)

---

#### PUB-INV-004: Manage Social Media Advertising Inventory

**As a** publication user  
**I want to** manage social media advertising inventory  
**So that** I can offer sponsored social posts to advertisers

**Acceptance Criteria:**
- Supported platforms: Facebook, Instagram, Twitter/X, LinkedIn, YouTube, TikTok, Pinterest, Snapchat, Threads
- Each platform tracks: handle, URL, follower count, engagement rate
- Ad formats: sponsored post, story, carousel, video, boosted post, takeover
- Pricing: per-post, per-story, monthly package

**Platform Metrics:**

| Platform | Key Metrics |
|----------|-------------|
| Facebook | Followers, page likes, average reach, engagement rate |
| Instagram | Followers, average likes, average comments, story views |
| Twitter/X | Followers, average retweets, average likes |
| LinkedIn | Followers, company page views |
| YouTube | Subscribers, average views, watch time |
| TikTok | Followers, average views, engagement rate |

---

#### PUB-INV-005: Manage Event Advertising Inventory

**As a** publication user  
**I want to** manage event advertising inventory  
**So that** I can offer sponsorship opportunities to advertisers

**Acceptance Criteria:**
- Multiple events per publication
- Event details: name, type, frequency, average attendance, target audience, location
- Sponsorship levels: title, presenting, supporting, vendor, booth
- Each level includes: benefits list, pricing
- Event calendar view available

**Sponsorship Benefits Examples:**
- Logo placement on materials
- Speaking opportunity
- Booth/table space
- Attendee list access
- Social media mentions
- Banner placement at event
- Product sampling rights

---

#### PUB-INV-006: Manage Podcast Advertising Inventory

**As a** publication user  
**I want to** manage podcast advertising inventory  
**So that** I can offer audio ad placements to advertisers

**Acceptance Criteria:**
- Multiple podcasts per publication
- Podcast details: name, description, frequency, average downloads, episode count
- Distribution platforms: Apple Podcasts, Spotify, Google Podcasts, Amazon Music, etc.
- Ad formats: pre-roll, mid-roll, post-roll, host-read, programmatic, sponsored content
- Pricing: CPM or flat rate per episode

**Ad Format Details:**

| Format | Duration | Typical CPM |
|--------|----------|-------------|
| Pre-roll | 15-30 seconds | $15-25 |
| Mid-roll | 60-90 seconds | $20-35 |
| Post-roll | 15-30 seconds | $10-15 |
| Host-read | Variable | $25-50 |

---

#### PUB-INV-007: Manage Radio Advertising Inventory

**As a** publication user  
**I want to** manage radio advertising inventory  
**So that** I can offer radio ad spots to advertisers

**Acceptance Criteria:**
- Support multiple stations and shows
- Station details: call sign, frequency, format, coverage area, listener count
- Show details: name, frequency, time slot, average listeners
- Ad formats: 30-second spot, 60-second spot, 15-second spot, live read, sponsorship, traffic/weather sponsor
- Time slots: drive time morning, drive time evening, midday, weekend, overnight
- Pricing: per-spot, weekly package, monthly package

**Show Frequency Options:**
- Daily
- Weekdays
- Weekly
- Bi-weekly
- Weekend-only
- Saturdays
- Sundays
- Weekdays-plus-Saturday
- Weekdays-plus-Sunday
- Custom

---

#### PUB-INV-008: Manage Streaming Video Advertising Inventory

**As a** publication user  
**I want to** manage streaming video advertising inventory  
**So that** I can offer video ad placements to advertisers

**Acceptance Criteria:**
- Platforms: YouTube, Twitch, Facebook Live, Instagram Live, LinkedIn Live, custom streaming
- Channel details: name, subscribers, average views, content type, streaming schedule
- Ad formats: pre-roll, mid-roll, post-roll, overlay, sponsored content, product placement, live mention
- Pricing: CPM, flat rate, or CPV (cost per view)

**Video Specifications:**
- Format: MP4, MOV, AVI
- Resolution: 1080p, 720p, 480p, 4K
- Aspect ratio: 16:9, 9:16, 1:1, 4:3

---

#### PUB-INV-009: Set Hub-Specific Pricing

**As a** publication user  
**I want to** set different pricing for different hubs  
**So that** I can offer competitive rates to hub partners

**Acceptance Criteria:**
- See list of hubs the publication belongs to
- For each hub, can override default pricing on any inventory item
- Hub pricing can be: different flat rate, different CPM, percentage discount
- Hub pricing editor shows side-by-side comparison with default
- Can enable/disable specific inventory items per hub
- Changes reflect immediately in hub's campaign builder

**Hub Pricing Fields:**
- Flat rate override
- CPM override
- Discount percentage (applied to default)
- Availability toggle
- Minimum commitment override

---

#### PUB-INV-010: Set Ad Specifications

**As a** publication user  
**I want to** set detailed ad specifications for each placement  
**So that** advertisers submit correct creative files

**Acceptance Criteria:**
- Specifications attached to each inventory item
- File formats: JPG, PNG, GIF, PDF, AI, PSD, INDD, MP3, WAV, MP4
- Maximum file size (in KB/MB)
- Dimensions (width x height in pixels or inches)
- Resolution requirements (DPI)
- Color space: RGB, CMYK, Grayscale
- Animation rules: static only, animated allowed, max duration, max file size
- Third-party tag support: yes/no, specific ad servers
- Specifications appear on insertion orders sent to hub

---

#### PUB-INV-011: Set Performance Metrics

**As a** publication user  
**I want to** set performance metrics for inventory items  
**So that** campaign builders can estimate reach and ROI

**Acceptance Criteria:**
- Impressions per month (for CPM-based items)
- Occurrences per month (for per-send, per-spot items)
- Audience size (base subscriber/circulation/follower count)
- Guaranteed vs estimated toggle
- Metrics used in campaign builder calculations
- Metrics displayed on hub inventory views

---

### PUB-ORD: Insertion Order Management

---

#### PUB-ORD-001: View All Insertion Orders

**As a** publication user  
**I want to** view all insertion orders for my publication  
**So that** I can track all advertising commitments

**Acceptance Criteria:**
- List view showing all orders, newest first
- Columns: Campaign Name, Advertiser, Status, Flight Dates, Total Value, Actions
- Status badge with color coding
- Filter by status: All, Sent, Confirmed, In Production, Delivered
- Filter by date range
- Search by campaign name or advertiser
- Click row to view order details

**Status Colors:**
| Status | Color | Description |
|--------|-------|-------------|
| Draft | Gray | Order created but not sent |
| Sent | Blue | Order sent, awaiting response |
| Confirmed | Green | Order accepted by publication |
| In Production | Purple | Creative being implemented |
| Delivered | Teal | Campaign completed, metrics reported |
| Rejected | Red | Order rejected by publication |

---

#### PUB-ORD-002: View Order Details

**As a** publication user  
**I want to** view complete insertion order details  
**So that** I understand exactly what I'm committing to

**Acceptance Criteria:**
- Order header: campaign name, advertiser, hub, status badge
- Timeline section: flight dates, duration, days remaining
- Placements section: list of all ad placements with details
- Pricing section: per-placement costs, subtotal, discounts, total
- Creative assets section: uploaded files for each placement
- Tracking section: tracking pixels and click URLs (for digital)
- Messaging section: conversation thread with hub team
- Performance section: reported metrics and proofs
- Hub terms section: advertising terms and legal disclaimer

**Placement Details:**
- Placement name and channel icon
- Dimensions/specifications
- Frequency (e.g., "Weekly" for newsletter)
- Unit cost and total cost
- Status badge (pending, accepted, rejected, in_production, delivered)
- Creative asset status (has asset, pending upload)

---

#### PUB-ORD-003: Confirm or Reject Order

**As a** publication user  
**I want to** confirm or reject an entire insertion order  
**So that** I can commit to or decline the advertising request

**Acceptance Criteria:**
- "Confirm Order" button prominent when status is "sent"
- Confirmation dialog asks for optional notes
- Confirming changes status to "confirmed"
- Hub team receives email notification
- "Reject Order" button available with required reason field
- Rejecting changes status to "rejected"
- Rejection reason sent to hub team
- Order cannot be modified after rejection (new order required)

**Confirmation Flow:**
1. Review all placements and terms
2. Click "Confirm Order"
3. (Optional) Add notes for hub team
4. Click "Confirm" in dialog
5. Status updates, notifications sent
6. Placements ready for production

---

#### PUB-ORD-004: Accept or Reject Individual Placements

**As a** publication user  
**I want to** accept or reject individual placements within an order  
**So that** I can partially accept orders when some placements won't work

**Acceptance Criteria:**
- Each placement row has Accept/Reject buttons when order is "sent"
- Accepting placement: changes to "accepted" status
- Rejecting placement: requires reason, changes to "rejected" status
- When ALL placements accepted: order auto-confirms
- When some placements rejected: order shows "partially_confirmed" (if implemented) or requires hub follow-up
- Hub receives notification for each status change

**Rejection Reasons:**
- Inventory unavailable
- Pricing disagreement
- Technical incompatibility
- Lead time insufficient
- Other (custom reason required)

---

#### PUB-ORD-005: Mark Placements as In Production

**As a** publication user  
**I want to** mark placements as "in production"  
**So that** hub teams know I'm working on implementing the ads

**Acceptance Criteria:**
- "Mark In Production" action available for accepted placements
- Bulk action to mark multiple placements at once
- Status changes to "in_production"
- Hub team receives notification
- Optional notes field for production status update
- Timestamp recorded for tracking

---

#### PUB-ORD-006: Mark Placements as Delivered

**As a** publication user  
**I want to** mark placements as "delivered"  
**So that** I can indicate the ad has run and report results

**Acceptance Criteria:**
- "Mark Delivered" action available for in_production placements
- Status changes to "delivered"
- Prompts user to report performance metrics
- Prompts user to upload proof of performance (for print/radio)
- Hub team receives notification
- Completion timestamp recorded

**Delivery Prompt:**
- For digital: "Would you like to report performance metrics now?"
- For print: "Please upload proof of performance (tearsheet/affidavit)"
- For radio: "Please upload proof (audio file or affidavit)"

---

#### PUB-ORD-007: Message Hub Team

**As a** publication user  
**I want to** send messages to the hub team about an order  
**So that** we can communicate about the campaign

**Acceptance Criteria:**
- Messaging tab within order detail view
- Conversation thread showing all messages chronologically
- Message input field at bottom
- Can attach files to messages
- Sender name and timestamp shown for each message
- Hub team receives email notification for new messages
- Unread message indicator shown
- Messages marked as read when viewed

**Message Features:**
- Rich text support (bold, italic, links)
- File attachments (images, PDFs, documents)
- @mentions (if implemented)
- Typing indicator (if real-time)

---

#### PUB-ORD-008: View Creative Assets

**As a** publication user  
**I want to** view and download creative assets for my placements  
**So that** I can implement the ads correctly

**Acceptance Criteria:**
- Assets grouped by specification (e.g., all 300x250 banners together)
- Each asset shows: thumbnail preview, file name, file size, upload date
- Download button for each asset
- "Download All" button for bulk download
- Assets linked to specific placements shown
- Missing assets indicated clearly

**Asset Status:**
- Asset uploaded: Green checkmark, download available
- Awaiting upload: Yellow clock icon, "Hub uploading creative"
- No asset required: Gray dash

---

#### PUB-ORD-009: View Tracking Tags

**As a** publication user  
**I want to** view tracking tags for digital placements  
**So that** I can implement impression and click tracking

**Acceptance Criteria:**
- Tracking section shows for digital placements only
- Impression pixel URL displayed with copy button
- Click tracking URL displayed with copy button
- Tags formatted for publication's ad server (GAM, Broadstreet, AdButler, Direct)
- Tags formatted for publication's ESP (Mailchimp, Constant Contact, etc.)
- "Test Tags" button to verify tags are working
- Instructions specific to ad server/ESP shown

**Tag Formats by Ad Server:**
| Ad Server | Impression Macro | Click Macro |
|-----------|------------------|-------------|
| Google Ad Manager | %%CACHEBUSTER%% | %%CLICK_URL_UNESC%% |
| Broadstreet | {{random}} | {{click_url}} |
| AdButler | [CACHEBUSTER] | [TRACKING_LINK] |
| Direct | CACHE_BUSTER | (manual redirect) |

**Tag Formats by ESP:**
| ESP | Email ID Macro | Cache Buster |
|-----|----------------|--------------|
| Mailchimp | *\|EMAIL_ID\|* | *\|DATE:d\|* |
| Constant Contact | [[EMAIL]] | [[TIMESTAMP]] |
| Klaviyo | {{ email }} | {{ now }} |
| Beehiiv | {{subscriber.id}} | {{timestamp}} |

---

#### PUB-ORD-010: Report Performance Metrics

**As a** publication user  
**I want to** report performance metrics for delivered placements  
**So that** hub teams can track campaign success

**Acceptance Criteria:**
- "Report Results" button available for delivered placements
- Form fields vary by channel type
- Date range selector for reporting period
- Required fields validated before submission
- Can submit multiple entries for same placement (different date ranges)
- Submission timestamped and attributed to user
- Hub team can view reported metrics

**Metrics by Channel:**

| Channel | Metrics |
|---------|---------|
| Website | Impressions, Clicks, CTR, Viewability |
| Newsletter | Sends, Opens, Clicks, CTR |
| Print | Insertions, Circulation reached |
| Radio | Spots aired, Estimated listeners |
| Podcast | Downloads, Listens, Completion rate |
| Social | Posts, Impressions, Engagements, Shares |
| Events | Attendance, Booth visits |
| Streaming | Views, Watch time, Completion rate |

---

#### PUB-ORD-011: Upload Proof of Performance

**As a** publication user  
**I want to** upload proof of performance documents  
**So that** hub teams can verify the ads ran as scheduled

**Acceptance Criteria:**
- Upload area accepts: PDF, JPG, PNG, TIFF, WAV, MP3
- Maximum file size: 50MB
- Multiple files can be uploaded per order
- Each file can have: description, proof type, associated placement
- Proof types: tearsheet, affidavit, screenshot, audio recording, other
- Upload progress indicator shown
- Successful upload confirmation
- Files viewable by hub team

**Proof Types:**
- Tearsheet: Physical page showing ad in publication
- Affidavit: Signed statement that ad ran
- Screenshot: Screen capture of digital placement
- Audio recording: Recording of radio/podcast ad
- Video clip: Recording of TV/streaming ad

---

#### PUB-ORD-012: Generate Print-Friendly Order

**As a** publication user  
**I want to** generate a print-friendly version of the order  
**So that** I can print or save as PDF for records

**Acceptance Criteria:**
- "Print" or "Download PDF" button in order detail
- Opens new tab with clean, print-optimized layout
- Includes: order header, placements, pricing, terms
- Excludes: navigation, action buttons
- Browser print dialog triggered or direct PDF download
- Footer includes generation date and order ID

---

#### PUB-ORD-013: Add Order Notes

**As a** publication user  
**I want to** add internal notes to an order  
**So that** I can track additional information not in the standard fields

**Acceptance Criteria:**
- "Add Note" button in order detail
- Notes are internal (not visible to hub team)
- Each note timestamped and attributed to user
- Notes displayed in chronological order
- Can add multiple notes
- Notes preserved across sessions

---

### PUB-LEAD: Lead Management

---

#### PUB-LEAD-001: View Publication Leads

**As a** publication user  
**I want to** view leads for my publication  
**So that** I can follow up with potential advertisers

**Acceptance Criteria:**
- List of all leads associated with publication
- Columns: Business Name, Contact, Source, Status, Budget, Date
- Lead source icons: storefront form, AI chat, manual entry
- Click row to view lead details
- Empty state with helpful message when no leads

**Lead Sources:**
- `storefront_form`: Submitted via publication storefront contact form
- `ai_chat`: Generated from AI chat conversation on storefront
- `manual_entry`: Added manually by publication user
- `other`: Imported or other sources

---

#### PUB-LEAD-002: Filter and Search Leads

**As a** publication user  
**I want to** filter and search leads  
**So that** I can find specific leads quickly

**Acceptance Criteria:**
- Search field: searches business name, contact name, email
- Status filter: dropdown with all status options
- Date range filter: from/to date pickers
- Show archived toggle: shows/hides archived leads
- Sort by: business name, contact name, budget, status, date (asc/desc)
- Filters persist in URL for sharing/bookmarking
- Clear filters button

---

#### PUB-LEAD-003: Update Lead Status

**As a** publication user  
**I want to** update lead status  
**So that** I can track progress through the sales pipeline

**Acceptance Criteria:**
- Status dropdown on lead card or detail view
- Status options: new, contacted, qualified, proposal_sent, closed_won, closed_lost
- Status change creates automatic note in activity log
- Optional note field when changing status
- Status badge color updates immediately

**Status Definitions:**
| Status | Description | Color |
|--------|-------------|-------|
| new | Fresh lead, not yet contacted | Blue |
| contacted | Initial contact made | Yellow |
| qualified | Good fit, worth pursuing | Purple |
| proposal_sent | Proposal/quote sent | Orange |
| closed_won | Deal closed, became customer | Green |
| closed_lost | Deal lost, not pursuing | Red |

---

#### PUB-LEAD-004: View Lead Details

**As a** publication user  
**I want to** view complete lead details  
**So that** I have all information needed for follow-up

**Acceptance Criteria:**
- Contact section: name, email, phone, business name, website
- Interest section: budget range, timeline, marketing goals, interested packages
- Conversation section: full chat history (if from AI chat)
- Activity section: notes, status changes, timestamps
- Back button returns to lead list

---

#### PUB-LEAD-005: Add Notes to Lead

**As a** publication user  
**I want to** add notes to a lead  
**So that** I can track interactions and important details

**Acceptance Criteria:**
- "Add Note" button in lead detail
- Text area for note content
- Note types: general note, status change, assignment, system
- Each note shows: content, author, timestamp
- Notes displayed in reverse chronological order
- Can add multiple notes
- Notes searchable (if implemented)

---

#### PUB-LEAD-006: Archive Leads

**As a** publication user  
**I want to** archive completed or irrelevant leads  
**So that** my active lead list stays clean

**Acceptance Criteria:**
- "Archive" action on lead card or detail
- Archived leads hidden from default list view
- "Show Archived" toggle reveals archived leads
- "Unarchive" action available on archived leads
- Archived timestamp recorded
- Archive reason optional

---

#### PUB-LEAD-007: View Lead Statistics

**As a** publication user  
**I want to** see lead statistics  
**So that** I understand my pipeline health

**Acceptance Criteria:**
- Statistics panel at top of leads page
- Total leads count
- Breakdown by status (with counts and percentages)
- Won/lost ratio
- Average time in each status (if calculated)
- Trend indicators (vs previous period, if available)

---

### PUB-SET: Settings & Team Management

---

#### PUB-SET-001: Invite Team Members

**As a** publication user  
**I want to** invite team members to manage my publication  
**So that** colleagues can help manage our advertising

**Acceptance Criteria:**
- "Invite User" button in Settings tab
- Email input field with validation
- Send invitation via email
- Invitation includes: publication name, inviter name, acceptance link
- Invitation expires after 7 days
- Pending invitations listed with status
- Can cancel pending invitations
- Can resend expired invitations

---

#### PUB-SET-002: View Team Members

**As a** publication user  
**I want to** view all team members with access  
**So that** I know who can manage the publication

**Acceptance Criteria:**
- List of all users with publication access
- Shows: name, email, access date
- Distinguishes between direct access and hub-inherited access
- Indicates who invited each user (if known)

---

#### PUB-SET-003: Remove Team Member Access

**As a** publication user  
**I want to** remove a team member's access  
**So that** former colleagues no longer have access

**Acceptance Criteria:**
- "Remove" action next to each team member
- Confirmation dialog before removal
- Cannot remove own access
- Removed user receives email notification
- Access revoked immediately
- Activity logged

---

#### PUB-SET-004: Cancel Pending Invitation

**As a** publication user  
**I want to** cancel a pending invitation  
**So that** I can revoke invitations sent in error

**Acceptance Criteria:**
- "Cancel" action next to pending invitations
- Confirmation dialog
- Invitation marked as cancelled
- Cancelled invitation cannot be accepted
- Can resend to same email with new invitation

---

#### PUB-SET-005: Configure Ad Server Settings

**As a** publication user  
**I want to** configure my ad server settings  
**So that** tracking tags are formatted correctly

**Acceptance Criteria:**
- Ad server dropdown: Google Ad Manager, Broadstreet, AdButler, Direct
- Selecting ad server updates tag format throughout application
- Instructions shown for each ad server
- Test tag functionality available
- Settings saved to publication profile

---

#### PUB-SET-006: Configure ESP Settings

**As a** publication user  
**I want to** configure my email service provider settings  
**So that** newsletter tracking tags work correctly

**Acceptance Criteria:**
- ESP dropdown with common providers
- ESP options: Mailchimp, Constant Contact, Campaign Monitor, Klaviyo, Sailthru, Active Campaign, SendGrid, Beehiiv, ConvertKit, Emma, HubSpot, Brevo, MailerLite, Drip, AWeber, Other
- When "Other" selected: custom merge tag fields appear
- Custom fields: email ID merge tag, cache buster merge tag
- Settings saved and used for all newsletter tracking tags

---

#### PUB-SET-007: View Activity Log

**As a** publication user  
**I want to** view the activity log for my publication  
**So that** I can see what changes have been made and by whom

**Acceptance Criteria:**
- Activity log section in Settings
- Shows all changes: profile updates, inventory changes, order actions, team changes
- Each entry: activity type, description, user, timestamp
- Filter by activity type
- Pagination for long histories
- Export to CSV (if implemented)

**Activity Types:**
- `publication_update`: Profile field changed
- `inventory_update`: Inventory item added/modified/removed
- `order_create`, `order_update`: Order actions
- `lead_create`, `lead_update`: Lead actions
- `settings_update`: Settings changed
- `storefront_update`: Storefront configuration changed

---

### PUB-STORE: Storefront Management

---

#### PUB-STORE-001: Configure Public Storefront

**As a** publication user  
**I want to** configure my public storefront  
**So that** advertisers can learn about my publication and inquire

**Acceptance Criteria:**
- Storefront editor accessible from Settings tab
- Live preview panel shows changes in real-time
- Save as draft vs publish options
- Storefront URL: `https://[domain]/storefront/[publication-id]` or custom domain
- Can disable storefront entirely

---

#### PUB-STORE-002: Customize Storefront Theme

**As a** publication user  
**I want to** customize my storefront theme  
**So that** it matches my publication's branding

**Acceptance Criteria:**
- Color pickers for: primary color, secondary color, accent color
- Color mode: light, dark, auto (follows system)
- Typography: font family selector
- Layout: border radius (sharp to rounded)
- Icon style: light, regular, bold, fill
- Preview updates in real-time
- Reset to defaults option

**Theme Fields:**
- Light Primary Color: used in light mode
- Dark Primary Color: used in dark mode
- Gradient Start/End: optional gradient overlay
- CTA Text Color: contrast color for buttons

---

#### PUB-STORE-003: Enable/Disable Storefront Sections

**As a** publication user  
**I want to** enable or disable storefront sections  
**So that** I can customize what information is shown

**Acceptance Criteria:**
- List of available sections with toggle switches
- Drag-and-drop to reorder sections
- Sections: Navbar, Hero, Audience, Testimonials, Inventory, Inventory Pricing, Campaign CTA, Contact/FAQ, About Us, Footer
- Disabled sections don't appear on storefront
- At least Navbar and one content section required

---

#### PUB-STORE-004: Configure Storefront SEO

**As a** publication user  
**I want to** configure SEO metadata  
**So that** my storefront appears well in search results

**Acceptance Criteria:**
- Page title field (shown in browser tab)
- Meta description field (shown in search results)
- Keywords field (comma-separated)
- Open Graph image upload
- Open Graph title (defaults to page title)
- Open Graph description (defaults to meta description)
- Preview of how page appears in search results

---

#### PUB-STORE-005: Enable AI Chat Widget

**As a** publication user  
**I want to** enable an AI chat widget on my storefront  
**So that** visitors can ask questions and generate leads

**Acceptance Criteria:**
- Toggle to enable/disable chat widget
- Position: bottom-right, bottom-left, top-right, top-left
- Widget title customization
- Subtitle/tagline customization
- Initial message (what bot says first)
- Primary/secondary colors for widget
- Leads generated from chat automatically saved

---

#### PUB-STORE-006: Configure AI Chat Behavior

**As a** publication user  
**I want to** configure the AI chat assistant's behavior  
**So that** it accurately represents my publication

**Acceptance Criteria:**
- Placeholder templates: variables replaced in AI prompts
- Publication context: JSON data injected into AI context
- Prepend instructions: text added before base instructions
- Append instructions: text added after base instructions
- Test chat functionality to verify behavior

---

#### PUB-STORE-007: Set Up Analytics Tracking

**As a** publication user  
**I want to** add analytics tracking to my storefront  
**So that** I can measure visitor behavior

**Acceptance Criteria:**
- Google Analytics ID field
- Facebook Pixel ID field
- Tracking codes automatically injected into storefront
- Verify codes are firing correctly (test mode)

---

#### PUB-STORE-008: Upload Storefront Images

**As a** publication user  
**I want to** upload images for my storefront  
**So that** it looks professional and branded

**Acceptance Criteria:**
- Logo upload: recommended size, formats accepted
- Favicon upload: .ico or .png
- Hero background image
- Section background images
- Image cropping/resizing tools
- Images stored securely and served via CDN

---

### PUB-FILE: Knowledge Base & Files

---

#### PUB-FILE-001: Upload Publication Files

**As a** publication user  
**I want to** upload files for my publication  
**So that** important documents are easily accessible

**Acceptance Criteria:**
- Drag-and-drop file upload
- Accepted formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG, GIF
- Maximum file size: 50MB
- File type categorization: media kit, rate card, logo, spec sheet, other
- Description field for each file
- Upload progress indicator

---

#### PUB-FILE-002: Manage Uploaded Files

**As a** publication user  
**I want to** manage uploaded files  
**So that** I can keep documents organized and current

**Acceptance Criteria:**
- List view of all uploaded files
- Columns: name, type, size, uploaded by, date
- View/download file action
- Edit description action
- Delete file action (with confirmation)
- Sort by name, date, type
- Search files

---

#### PUB-FILE-003: Set File Visibility

**As a** publication user  
**I want to** control file visibility  
**So that** some files are public and others are private

**Acceptance Criteria:**
- Public/private toggle per file
- Public files: accessible on storefront, no login required
- Private files: only visible to team members
- Visibility indicated in file list
- Public files section on storefront (if enabled)

---

## Hub User Stories

Hub users are marketplace administrators who manage a geographic hub, create advertising campaigns, and coordinate with publications to deliver campaigns.

### HUB-AUTH: Authentication & Access

---

#### HUB-AUTH-001: Sign In to Hub Central

**As a** hub user  
**I want to** sign in with my credentials  
**So that** I can access the Hub Central dashboard

**Acceptance Criteria:**
- Same login page as publication users
- After authentication, redirected to `/hubcentral`
- If user has both hub and publication access, default to Hub Central
- Role-based navigation shown in header

---

#### HUB-AUTH-002: Select Hub to Manage

**As a** hub user with access to multiple hubs  
**I want to** select which hub I'm managing  
**So that** I can switch between different markets

**Acceptance Criteria:**
- Hub selector dropdown in header when multiple hubs assigned
- Shows hub name and initial/logo
- Selecting hub updates all dashboard data
- Selected hub stored in localStorage
- URL doesn't change (state managed by context)

---

#### HUB-AUTH-003: Accept Hub Invitation

**As a** person invited to manage a hub  
**I want to** accept the invitation  
**So that** I can gain access to the hub

**Acceptance Criteria:**
- Same flow as publication invitation
- Shows hub name and branding in invitation preview
- After acceptance, redirected to Hub Central
- Gains access to all publications in the hub automatically

---

### HUB-DASH: Dashboard & Analytics

---

#### HUB-DASH-001: View Hub Dashboard Overview

**As a** hub user  
**I want to** see a dashboard overview for my hub  
**So that** I can understand hub performance at a glance

**Acceptance Criteria:**
- Hub name and branding displayed prominently
- Key statistics cards across top
- Inventory breakdown pie chart
- Audience reach metrics by channel
- Pricing insights panels
- Geographic and content distribution
- Inventory quality score
- Quick action buttons

---

#### HUB-DASH-002: View Key Hub Statistics

**As a** hub user  
**I want to** see key statistics  
**So that** I understand hub activity levels

**Acceptance Criteria:**
- New Leads: count of leads in "new" status
- Publications: total publications in hub
- Conversations: AI chat conversations count
- Unread Messages: messages from publications needing response (clickable to orders)

**Card Behavior:**
- Cards show loading spinners while fetching
- Error state if fetch fails
- Click unread messages card to navigate to orders

---

#### HUB-DASH-003: View Inventory Breakdown

**As a** hub user  
**I want to** see inventory breakdown by channel  
**So that** I understand what advertising options are available

**Acceptance Criteria:**
- Pie chart showing distribution across channels
- Legend with channel names and counts
- Hover tooltips showing percentages
- Channels: Website, Newsletter, Print, Social, Events, Podcasts, Streaming, Radio, Cross-Channel

---

#### HUB-DASH-004: View Audience Reach Metrics

**As a** hub user  
**I want to** see audience reach across all publications  
**So that** I can communicate total reach to advertisers

**Acceptance Criteria:**
- Aggregated metrics from all hub publications
- Metrics: Website visitors, Newsletter subscribers, Print circulation, Social followers, Podcast listeners, Streaming subscribers, Radio listeners
- Numbers formatted with commas
- Click metric to see publication breakdown

---

#### HUB-DASH-005: View Pricing Insights

**As a** hub user  
**I want to** see pricing insights  
**So that** I understand inventory value and revenue potential

**Acceptance Criteria:**
- Two pricing panels: Default Potential vs Hub Potential
- Timeframe toggle: per day, per month, per quarter
- Breakdown by channel: website, newsletter, print, podcast, streaming, radio
- Total value at bottom
- Tooltip explaining calculation methodology

**Calculation Notes:**
- Default: uses publication's standard pricing
- Hub: uses hub-specific pricing where set
- Normalized to monthly rates for comparison

---

#### HUB-DASH-006: View Inventory Quality Score

**As a** hub user  
**I want to** see inventory quality score  
**So that** I know how complete publication data is

**Acceptance Criteria:**
- Overall percentage score
- Complete items / total items count
- Score color: green (90%+), yellow (70-89%), red (<70%)
- Clickable to see detailed breakdown by publication
- Per-publication scores shown in expanded view

---

#### HUB-DASH-007: View Geographic Coverage

**As a** hub user  
**I want to** see geographic coverage distribution  
**So that** I understand the hub's geographic reach

**Acceptance Criteria:**
- Counts by coverage type: Local, Regional, State, National
- Displayed as vertical list with counts

---

#### HUB-DASH-008: View Content Type Distribution

**As a** hub user  
**I want to** see content type distribution  
**So that** I understand the variety of publications

**Acceptance Criteria:**
- Counts by content type: News, Business, Lifestyle, Mixed, Other
- Displayed as vertical list with counts

---

#### HUB-DASH-009: Export Hub Inventory

**As a** hub user  
**I want to** export hub inventory to CSV  
**So that** I can analyze data in spreadsheets

**Acceptance Criteria:**
- "Export CSV" button in dashboard header
- Downloads CSV file with all publications and inventory
- Filename: `{hub-name}-inventory-{date}.csv`
- Columns include: publication name, channel, item name, pricing, metrics

---

#### HUB-DASH-010: View Detailed Inventory Quality

**As a** hub user  
**I want to** see detailed inventory quality breakdown  
**So that** I can identify which publications need attention

**Acceptance Criteria:**
- Expanded panel at bottom of dashboard
- Lists each publication with quality score
- Shows missing fields per inventory item
- Recommendations for high-impact improvements
- Filter to show only publications below threshold

---

### HUB-LEAD: Lead Management

---

#### HUB-LEAD-001: View All Hub Leads

**As a** hub user  
**I want to** view all leads across hub publications  
**So that** I can manage the hub's sales pipeline

**Acceptance Criteria:**
- All leads from all publications in hub
- Hub-level leads (not tied to specific publication) included
- Same columns as publication leads plus Publication column
- Can distinguish between hub leads and publication leads

---

#### HUB-LEAD-002: Filter and Search Hub Leads

**As a** hub user  
**I want to** filter and search leads  
**So that** I can find specific leads quickly

**Acceptance Criteria:**
- All publication user filters plus:
- Publication filter: dropdown with all hub publications
- Source filter: storefront, AI chat, manual, other
- Assigned to filter: user who owns the lead

---

#### HUB-LEAD-003 through HUB-LEAD-006

(Same as publication lead management stories - status updates, details, notes, archive)

---

#### HUB-LEAD-007: Assign Leads to Users

**As a** hub user  
**I want to** assign leads to team members  
**So that** leads are followed up by the right person

**Acceptance Criteria:**
- "Assign" action on lead card
- User dropdown showing all hub team members
- Assignment creates activity note
- Assigned user receives notification (email and/or in-app)
- Lead card shows assignee name/avatar

---

### HUB-PKG: Package Management

---

#### HUB-PKG-001: View Hub Packages

**As a** hub user  
**I want to** view all hub packages  
**So that** I can see available pre-built offerings

**Acceptance Criteria:**
- List view of all packages
- Columns: name, category, price range, publications count, status
- Status: active, draft, archived
- Health score indicator per package
- Search and filter by status

---

#### HUB-PKG-002: Create Hub Package

**As a** hub user  
**I want to** create a new advertising package  
**So that** I can offer bundled inventory to advertisers

**Acceptance Criteria:**
- Package builder wizard interface
- Step 1: Set budget, duration, channels, geography filters
- Step 2: System finds matching inventory across publications
- Step 3: Review and adjust included items (add/remove/modify quantities)
- Step 4: Set package name, description, pricing tiers
- Step 5: Save as draft or publish

**Package Fields:**
- Basic info: name, tagline, description
- Category: Bronze, Silver, Gold, Custom
- Publications: list of included publications with inventory
- Pricing: single price or tiered (1-month, 3-month, 6-month)
- Targeting: geographic, demographic, interest-based

---

#### HUB-PKG-003: Edit Hub Package

**As a** hub user  
**I want to** edit an existing package  
**So that** I can update offerings as inventory changes

**Acceptance Criteria:**
- Open package in edit mode
- All fields editable
- Add/remove publications and inventory items
- Adjust pricing
- Save changes
- Activity logged

---

#### HUB-PKG-004: View Package Health

**As a** hub user  
**I want to** view package health  
**So that** I know if packages are complete and sellable

**Acceptance Criteria:**
- Health score: 0-100%
- Checks: all included inventory exists, pricing set, descriptions complete
- Issues listed with severity (error, warning, info)
- "Fix Issues" suggestions
- Modal view with detailed breakdown

---

#### HUB-PKG-005: Delete/Archive Package

**As a** hub user  
**I want to** delete or archive a package  
**So that** I can remove outdated offerings

**Acceptance Criteria:**
- Soft delete (archive) available
- Permanent delete available for drafts
- Confirmation dialog with package name
- Archived packages hidden from default view
- Can restore archived packages

---

### HUB-CAMP: Campaign Management

---

#### HUB-CAMP-001: View Hub Campaigns

**As a** hub user  
**I want to** view all campaigns for my hub  
**So that** I can track all advertising activity

**Acceptance Criteria:**
- List of all campaigns, newest first
- Columns: name, advertiser, status, flight dates, budget, publications count
- Status badges with colors
- Filter by status
- Search by name or advertiser
- Click row to view details

**Campaign Statuses:**
| Status | Color | Description |
|--------|-------|-------------|
| Draft | Gray | Created, not yet active |
| Active | Green | Orders generated, campaign running |
| Paused | Yellow | Temporarily suspended |
| Completed | Blue | Campaign finished |
| Cancelled | Red | Campaign terminated early |
| Archived | Gray | Historical record |

---

#### HUB-CAMP-002: Create Campaign via Campaign Builder

**As a** hub user  
**I want to** create a campaign using the Campaign Builder  
**So that** I can efficiently build multi-publication campaigns

**Acceptance Criteria:**
- 5-step wizard interface
- Progress indicator showing current step
- Can navigate back to previous steps
- Draft auto-saved periodically
- Can save and exit, returning later

---

#### HUB-CAMP-003: Enter Campaign Basics (Step 1)

**As a** hub user  
**I want to** enter campaign basic information  
**So that** the campaign is properly identified

**Acceptance Criteria:**
- Campaign name (required, 5-100 characters)
- Campaign description (optional)
- Advertiser name (required)
- Advertiser website (optional, validated URL)
- Contact name (required)
- Contact email (required, validated)
- Contact phone (optional)
- Contact company (optional)

---

#### HUB-CAMP-004: Set Campaign Objectives (Step 2)

**As a** hub user  
**I want to** set campaign objectives  
**So that** inventory selection is optimized

**Acceptance Criteria:**
- Primary goal dropdown: brand awareness, consideration, conversion
- Target audience text area: describe ideal customer
- Geographic targeting: multi-select regions/cities
- Budget amount: number input with currency
- Billing cycle: monthly, one-time, quarterly
- Channels: multi-select from available channels
- "Include all outlets" toggle for Press Forward support
- Algorithm selection (if AI method): all-inclusive, budget-friendly, little-guys, proportional

---

#### HUB-CAMP-005: Select Inventory Method

**As a** hub user  
**I want to** choose how inventory is selected  
**So that** I can use AI or pre-built packages

**Acceptance Criteria:**
- Two methods available:
  - Package Selection: choose from pre-built hub packages
  - AI Analysis: let AI select optimal inventory
- Selection affects Step 3 content

---

#### HUB-CAMP-006: Select Package (Step 3 - Package Method)

**As a** hub user  
**I want to** select a pre-built package  
**So that** I can quickly create a campaign

**Acceptance Criteria:**
- List of available hub packages
- Package cards show: name, description, price, publications, channels
- Click to select package
- Selected package highlighted
- Package details expanded
- "Use This Package" button proceeds to next step
- Timeline auto-populated based on package duration

---

#### HUB-CAMP-007: Run AI Analysis (Step 3 - AI Method)

**As a** hub user  
**I want to** have AI analyze and select optimal inventory  
**So that** campaigns are intelligently optimized

**Acceptance Criteria:**
- "Analyze Campaign" button triggers AI
- Loading state with progress indication
- AI processes: fetches inventory, applies algorithm, returns selections
- Results show: selected publications, placements, pricing, AI reasoning
- Can view detailed rationale for selections
- Total estimated cost shown
- Estimated performance metrics shown

**AI Algorithms:**
| Algorithm | Description |
|-----------|-------------|
| all-inclusive | Includes all outlets, maximizes reach across ecosystem |
| budget-friendly | Optimizes for lowest cost per impression |
| little-guys | Prioritizes smaller publications |
| proportional | Allocates proportionally by publication size |

---

#### HUB-CAMP-008: Review and Adjust Inventory

**As a** hub user  
**I want to** review and adjust selected inventory  
**So that** I can fine-tune the campaign

**Acceptance Criteria:**
- Inventory grouped by publication
- Each placement shows: name, channel, quantity, frequency, cost
- Remove placement button
- Adjust quantity/frequency
- Running total updates in real-time
- "Add Publication" to include more
- Pricing recalculates on changes

---

#### HUB-CAMP-009: View Performance Estimates

**As a** hub user  
**I want to** see estimated campaign performance  
**So that** I can set expectations with advertiser

**Acceptance Criteria:**
- Estimated reach (unique audience)
- Estimated impressions
- Estimated CPM (cost per 1000 impressions)
- Engagement estimates by channel
- Disclaimers about estimate accuracy

---

#### HUB-CAMP-010: Set Campaign Timeline (Step 4)

**As a** hub user  
**I want to** set the campaign timeline  
**So that** flight dates are defined

**Acceptance Criteria:**
- Start date picker: cannot be in past
- End date picker: must be after start date
- Duration auto-calculated
- Pre-set duration buttons: 1 month, 3 months, 6 months
- Calendar view option
- Timeline validation before proceeding

---

#### HUB-CAMP-011: Review and Create Campaign (Step 5)

**As a** hub user  
**I want to** review and create the campaign  
**So that** I can finalize before sending orders

**Acceptance Criteria:**
- Summary of all campaign details
- Advertiser info, objectives, timeline
- Selected inventory with costs
- Total campaign value
- "Create Campaign" button
- Campaign created in draft status
- Redirect to campaign detail page

---

#### HUB-CAMP-012: View Campaign Details

**As a** hub user  
**I want to** view complete campaign details  
**So that** I have all information in one place

**Acceptance Criteria:**
- Header: name, advertiser, status, flight dates
- Tabs: Overview, Inventory, Creative Assets, Orders, Performance
- Overview: summary cards, timeline, budget
- Inventory: all placements by publication
- Creative Assets: uploaded files by specification
- Orders: per-publication insertion order status
- Performance: delivery metrics, pacing

---

#### HUB-CAMP-013: Edit Campaign

**As a** hub user  
**I want to** edit a campaign  
**So that** I can make corrections or updates

**Acceptance Criteria:**
- "Edit" button on campaign detail
- Can edit: basics, objectives, timeline
- Cannot edit inventory after orders generated
- Changes saved with activity log

---

#### HUB-CAMP-014: Update Campaign Status

**As a** hub user  
**I want to** update campaign status  
**So that** I can manage campaign lifecycle

**Acceptance Criteria:**
- Status dropdown: draft, active, paused, completed, cancelled
- Status change confirmation
- Notifications sent to relevant parties
- Activity logged

---

#### HUB-CAMP-015: Generate Insertion Orders

**As a** hub user  
**I want to** generate insertion orders  
**So that** publications receive their specific orders

**Acceptance Criteria:**
- "Generate Orders" button on draft campaign
- Creates master insertion order (full campaign)
- Creates per-publication orders (each publication's portion)
- Orders saved to database
- Campaign status changes to "active"
- Publications receive email notifications
- Order count shown in campaign detail

---

#### HUB-CAMP-016: Delete Campaign

**As a** hub user  
**I want to** delete a campaign  
**So that** I can remove cancelled or test campaigns

**Acceptance Criteria:**
- "Delete" button on campaign detail
- Soft delete: marks as deleted, hides from list
- Permanent delete: removes all related records (orders, assets, etc.)
- Confirmation dialog required
- Cannot delete active campaigns without cancelling first

---

#### HUB-CAMP-017: View Campaign Performance

**As a** hub user  
**I want to** view campaign performance  
**So that** I can track delivery and results

**Acceptance Criteria:**
- Performance dashboard within campaign detail
- Delivery progress by channel (digital vs offline)
- Impressions, clicks, CTR totals
- Breakdown by publication
- Daily trend charts
- Pacing status: ahead, on track, behind, at risk
- Comparison to goals (if set)

---

### HUB-ORD: Order Management

---

#### HUB-ORD-001: View All Hub Orders

**As a** hub user  
**I want to** view all orders across hub publications  
**So that** I can track order status

**Acceptance Criteria:**
- List of all insertion orders
- Columns: publication, campaign, status, value, messages
- Unread message indicator badge
- Filter by status
- Filter by publication
- Filter by date range
- Search by campaign or publication name

---

#### HUB-ORD-002: Filter and Search Orders

(Same as publication - filters for status, date, search)

---

#### HUB-ORD-003: View Hub Order Details

**As a** hub user  
**I want to** view order details from the hub perspective  
**So that** I can monitor delivery

**Acceptance Criteria:**
- Same detail view as publication sees
- Plus: can see all publication responses
- Can see performance data reported by publication
- Can see proof of performance documents
- Read-only for hub user (publication takes actions)

---

#### HUB-ORD-004: Message Publications

**As a** hub user  
**I want to** send messages to publications about orders  
**So that** we can communicate about campaigns

**Acceptance Criteria:**
- Same messaging interface
- Messages sent from "hub" perspective
- Publication receives notification
- Conversation thread preserved

---

#### HUB-ORD-005: Mark Orders as Viewed

**As a** hub user  
**I want to** mark orders as viewed  
**So that** I can track what I've reviewed

**Acceptance Criteria:**
- Unread indicator on orders with new publication messages
- Viewing order marks as read
- Unread count updates in header
- "Mark all as read" option (if implemented)

---

#### HUB-ORD-006: View Order Performance

**As a** hub user  
**I want to** view order-level performance  
**So that** I can track delivery by publication

**Acceptance Criteria:**
- Performance tab within order detail
- Metrics reported by publication
- Delivery progress against goals
- Proof of performance documents
- Timeline of reporting

---

### HUB-PRICE: Pricing Analytics

---

#### HUB-PRICE-001: View Pricing Analytics Dashboard

**As a** hub user  
**I want to** view pricing analytics  
**So that** I understand inventory value across the hub

**Acceptance Criteria:**
- Dedicated pricing tab in Hub Central
- Channel-by-channel pricing statistics
- Pricing model distribution
- Trend over time (if historical data available)

---

#### HUB-PRICE-002: View Channel Pricing Statistics

**As a** hub user  
**I want to** see pricing statistics by channel  
**So that** I can benchmark and identify opportunities

**Acceptance Criteria:**
- Per channel: average, median, min, max prices
- Sample size (number of items)
- Distribution chart (histogram or box plot)
- Filter by channel
- Compare hub pricing vs default pricing

---

#### HUB-PRICE-003: View Pricing Model Analysis

**As a** hub user  
**I want to** see pricing model distribution  
**So that** I understand how publications price inventory

**Acceptance Criteria:**
- Counts by pricing model: CPM, flat rate, per-send, per-spot, etc.
- Average price per model
- Recommendations for standardization

---

#### HUB-PRICE-004: View Unit Economics

**As a** hub user  
**I want to** see unit economics  
**So that** I can identify value opportunities

**Acceptance Criteria:**
- Price per 1000 audience members by channel
- Efficiency rankings by publication
- Outliers highlighted (very cheap or expensive)
- Recommendations for budget allocation

---

#### HUB-PRICE-005: Compare Default vs Hub Pricing

**As a** hub user  
**I want to** compare default and hub-specific pricing  
**So that** I understand hub discount levels

**Acceptance Criteria:**
- Side-by-side totals
- Discount percentage overall
- Discount by channel
- Publications without hub pricing flagged

---

### HUB-CHAT: AI Inventory Chat

---

#### HUB-CHAT-001: Query Inventory via AI Chat

**As a** hub user  
**I want to** ask questions about inventory using natural language  
**So that** I can quickly find information

**Acceptance Criteria:**
- Chat interface in Hub Central
- Can ask: "What print options do we have under $500?"
- AI responds with relevant inventory information
- Responses include publication names, pricing, specifications
- Conversation history preserved

---

#### HUB-CHAT-002: Get Inventory Recommendations

**As a** hub user  
**I want to** get AI recommendations for campaign needs  
**So that** I can quickly identify good options

**Acceptance Criteria:**
- Can describe campaign needs in natural language
- AI suggests publications and placements
- Recommendations include rationale
- Can refine by asking follow-up questions

---

#### HUB-CHAT-003: Compare Publications

**As a** hub user  
**I want to** ask AI to compare publications  
**So that** I can make informed recommendations

**Acceptance Criteria:**
- Can ask: "Compare Block Club and Chicago Reader for restaurant advertising"
- AI provides structured comparison
- Includes: audience, reach, pricing, channels
- Pros/cons highlighted

---

### HUB-TEAM: Team Management

---

#### HUB-TEAM-001 through HUB-TEAM-005

(Same as publication team management stories, but for hub team members)

---

## Shared User Stories

These stories apply to all user types.

### AUTH: Authentication

---

#### AUTH-001: Sign Up for Account

**As a** new user  
**I want to** create an account  
**So that** I can access the platform

**Acceptance Criteria:**
- Registration form: email, password, first name, last name
- Password requirements: minimum 6 characters
- Email validation: must be valid format
- Duplicate email check: shows error if already registered
- Account created with "standard" role
- Logged in automatically after registration
- Welcome email sent

---

#### AUTH-002: Sign In

**As a** registered user  
**I want to** sign in  
**So that** I can access my account

(Already covered in PUB-AUTH-001)

---

#### AUTH-003: Sign Out

**As a** logged-in user  
**I want to** sign out  
**So that** my session is ended securely

**Acceptance Criteria:**
- Sign out button in user menu
- Session token cleared from localStorage
- Redirect to login page
- Confirmation message (optional)

---

#### AUTH-004: Reset Password

**As a** user who forgot my password  
**I want to** reset it  
**So that** I can regain access to my account

**Acceptance Criteria:**
- "Forgot Password" link on login page
- Enter email address
- Receive email with reset link (valid 1 hour)
- Reset link opens password entry form
- New password must meet requirements
- All existing sessions invalidated
- Confirmation email sent
- Redirect to login page

---

#### AUTH-005: Verify Email

**As a** new user  
**I want to** verify my email address  
**So that** my account is fully activated

**Acceptance Criteria:**
- Verification email sent after registration
- Email contains verification link
- Clicking link verifies email
- Account marked as verified
- Unverified accounts may have limited functionality

---

### NOTIF: Notifications

---

#### NOTIF-001: Receive In-App Notifications

**As a** user  
**I want to** receive in-app notifications  
**So that** I'm aware of important events

**Acceptance Criteria:**
- Bell icon in header
- Unread count badge
- Click to see notification list
- Notifications show: icon, title, message, time
- Mark individual as read
- "Mark all as read" option
- Click notification to navigate to relevant content

**Notification Types:**
- New order received
- Order confirmed/rejected
- Placement status changed
- New message received
- Invitation received
- Access granted/revoked

---

#### NOTIF-002: Receive Email Notifications

**As a** user  
**I want to** receive email notifications  
**So that** I'm notified even when not logged in

**Acceptance Criteria:**
- Email sent for each notification type
- Emails are well-formatted HTML
- Include action links to relevant content
- Unsubscribe link (if preferences implemented)
- From address: noreply@domain.com

---

#### NOTIF-003: Navigate from Notification

**As a** user  
**I want to** click notifications to navigate  
**So that** I can quickly access relevant content

**Acceptance Criteria:**
- Each notification has associated URL
- Clicking in-app notification navigates
- Email notification includes clickable link
- Context preserved (correct tab, scroll position)

---

### PROF: User Profile

---

#### PROF-001: View Profile

**As a** user  
**I want to** view my profile  
**So that** I can see my account information

**Acceptance Criteria:**
- Profile page accessible from user menu
- Shows: name, email, role, company
- Shows assigned hubs and publications
- Shows account creation date

---

#### PROF-002: Update Profile

**As a** user  
**I want to** update my profile  
**So that** my information stays current

**Acceptance Criteria:**
- Edit fields: first name, last name, phone, company name
- Email cannot be changed (requires verification process)
- Save button confirms changes
- Changes reflected immediately

---

## Permission Model

### User Roles

| Role | Code | Description | Typical User |
|------|------|-------------|--------------|
| Admin | `admin` | Full system access | Platform operators |
| Hub User | `hub_user` | Manage assigned hubs and their publications | Hub/market managers |
| Publication User | `publication_user` | Manage assigned publications only | Publication sales reps |
| Standard | `standard` | Basic account, no management access | Advertisers, visitors |

### Access Scopes

| Scope | Code | Description |
|-------|------|-------------|
| All | `all` | Complete system access (admin only) |
| Hub Level | `hub_level` | Automatic access to all publications in assigned hubs |
| Group Level | `group_level` | Access via publication groups/networks |
| Individual | `individual` | Direct assignment to specific publications |

### Permission Rules

1. **Admins bypass all permission checks** - They have unrestricted access to all resources.

2. **Hub users get automatic publication access** - When assigned to a hub, they automatically have access to all publications where `hubIds` includes that hub.

3. **Publication users need explicit assignment** - Must be directly assigned to each publication via `individualPublicationIds` or group membership.

4. **Self-removal prevention** - Users cannot remove their own access to prevent accidental lockout.

5. **Invitation expiration** - Invitations expire after 7 days for security.

6. **Cascading access revocation** - Removing hub access removes access to all publications in that hub (unless individually assigned).

### Permission Inheritance Diagram

```
Admin (role: 'admin', accessScope: 'all')
    └── Full access to everything

Hub User (role: 'hub_user', accessScope: 'hub_level')
    └── hubAccess: [{ hubId: 'chicago-hub', accessLevel: 'full' }]
        └── Can access all publications where hubIds includes 'chicago-hub'
        └── Can create campaigns, manage orders, view analytics

Publication User (role: 'publication_user', accessScope: 'individual')
    └── individualPublicationIds: ['1035', '1042']
        └── Can only access publications 1035 and 1042
        └── Cannot access other publications or hub features

Standard User (role: 'standard')
    └── No management permissions
    └── Can view public content only
```

---

## Appendix: Workflows and Data Models

### Insertion Order Workflow

```
Campaign Created (draft)
        │
        ▼
Generate Orders (button click)
        │
        ▼
Orders Created (draft → sent)
        │
        ├──────────────────────────────┐
        ▼                              ▼
Publication Confirms             Publication Rejects
        │                              │
        ▼                              ▼
Order Confirmed                  Order Rejected (end)
        │
        ▼
Placements In Production
        │
        ▼
Placements Delivered
        │
        ▼
Performance Reported + Proof Uploaded
        │
        ▼
Campaign Completed
```

### Placement Status Workflow

```
pending
    │
    ├──► accepted ──► in_production ──► delivered
    │
    └──► rejected (end)
```

### Lead Status Workflow

```
new ──► contacted ──► qualified ──► proposal_sent
                                        │
                            ┌───────────┴───────────┐
                            ▼                       ▼
                       closed_won              closed_lost
```

### Key Data Models

**User**: Account with authentication credentials and role.
- `email`, `passwordHash`, `firstName`, `lastName`
- `role`: admin, hub_user, publication_user, standard
- `isEmailVerified`, `lastLoginAt`

**UserPermissions**: RBAC permissions for resource access.
- `userId`, `role`, `accessScope`
- `hubAccess`: array of hub assignments with access level
- `individualPublicationIds`: direct publication assignments
- `canInviteUsers`, `canManageGroups`

**Publication**: Media outlet profile with inventory.
- `publicationId`: unique numeric identifier
- `hubIds`: array of hub memberships
- `basicInfo`: name, website, type, coverage
- `distributionChannels`: website, newsletters, print, social, events, podcasts, radio, streaming
- `audienceDemographics`, `bookingPolicies`, `adDeliverySettings`

**Hub**: Geographic marketplace.
- `hubId`: unique slug (e.g., "chicago-hub")
- `basicInfo`: name, tagline, description
- `branding`: colors, logo
- `geography`: region, city, state, DMAs
- `advertisingTerms`: standard terms for all campaigns

**Campaign**: AI-generated advertising campaign.
- `campaignId`: unique string
- `hubId`, `hubName`
- `basicInfo`: name, description, advertiser info
- `objectives`: goals, audience, budget, channels
- `timeline`: startDate, endDate, duration
- `selectedInventory`: AI-selected publications and placements
- `pricing`: subtotal, discounts, total
- `status`: draft, active, paused, completed, cancelled

**PublicationInsertionOrder**: Per-publication order.
- `campaignId`, `publicationId`
- `status`: draft, sent, confirmed, rejected, in_production, delivered
- `placements`: inventory items with status
- `creativeAssets`: linked creative files
- `messages`: conversation thread
- `performanceEntries`: reported metrics
- `proofs`: proof of performance files

**Lead**: Prospective advertiser inquiry.
- `leadSource`: storefront_form, ai_chat, manual_entry
- `hubId`, `publicationId` (optional associations)
- `contactName`, `contactEmail`, `businessName`
- `budgetRange`, `timeline`, `marketingGoals`
- `status`: new, contacted, qualified, proposal_sent, closed_won, closed_lost

---

---

## Related Documentation

- [Architecture Documentation](./ARCHITECTURE.md) - System architecture, technology stack, data flows, and deployment
- [Product Roadmap](./ROADMAP.md) - High-level roadmap organized by strategic phases

---

*Document generated from codebase analysis. Last updated: January 2026*
