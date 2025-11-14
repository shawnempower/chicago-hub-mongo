# Chicago Hub Package Builder - User Experience Summary

**A sales tool for building customized media packages in minutes**

---

## OVERVIEW

### What It Does
Helps sales teams build, customize, and export media advertising packages across 31 Chicago news outlets with smart frequency controls that respect publication schedules.

### Key Innovation
**Smart Frequency Constraints**: System automatically enforces physical publication limits (daily papers = 12x/month, weekly = 4x/month, monthly = 1x/month) while giving maximum flexibility where it exists.

### Primary Users
- Sales team members
- Media buyers
- Account managers

### Time Savings
- **Before**: 30+ minutes to build package manually
- **After**: <5 minutes with Package Builder

---

## CORE USER FLOWS

### Flow 1: Budget-First Package Building

**User Goal**: "I have $30K budget - what can I get?"

```
1. Enter Parameters
   ↓
2. Click "Build Package"
   ↓
3. Review Results
   ↓
4. Adjust Frequencies (if needed)
   ↓
5. Save & Export
```

**Steps:**
1. **Input**: Monthly budget ($30,000), geography (South Side), channels (Newsletter + Print)
2. **Build**: System finds all matching inventory, applies standard frequencies
3. **Review**: See $28,500 package with 8 outlets, 87 items
4. **Adjust**: Click "Reduce to Half Frequency" → cost drops to $14,250
5. **Complete**: Save as "Q4 South Side Campaign", export CSV

---

### Flow 2: Specification-First Package Building

**User Goal**: "Client wants specific outlets, show me all inventory"

```
1. Select Outlets + Channels
   ↓
2. Click "Build Package"
   ↓
3. Review All Available Inventory
   ↓
4. Customize Frequencies
   ↓
5. Save & Export
```

**Steps:**
1. **Select**: Chicago Sun-Times, WBEZ, Chicago Reader
2. **Build**: System shows all inventory for those 3 outlets
3. **Review**: See $45,000 package with all channels
4. **Adjust**: Reduce Print to 6x, keep Newsletter at 12x
5. **Complete**: Final cost $38,000, save and export

---

### Flow 3: Reuse & Iterate

**User Goal**: "Use last client's package as starting point"

```
1. Go to Saved Packages
   ↓
2. Click "Duplicate"
   ↓
3. Modify as Needed
   ↓
4. Save As New
```

**Steps:**
1. **Find**: Locate "ABC Corp - South Side" package
2. **Duplicate**: Creates copy with all same settings
3. **Modify**: Change campaign duration from 3 to 6 months, remove 2 outlets
4. **Save**: "XYZ Foundation - South Side" (new package)

---

## MAIN INTERFACE WIREFRAMES

### 1. Package Builder (Initial Entry)

```
┌────────────────────────────────────────────────────┐
│  Chicago Hub Package Builder          [Saved Packages] │
├────────────────────────────────────────────────────┤
│                                                     │
│  ▼ PACKAGE PARAMETERS                              │
│                                                     │
│  Monthly Budget: $ [30,000]   Duration: [6▼] months│
│                                                     │
│  Target Outlets:                                   │
│  ( ) All Outlets                                   │
│  (●) Geography: ☑South Side ☐North Side ☐Citywide│
│  ( ) Specific: [Select outlets▼]                  │
│                                                     │
│  Channels:                                          │
│  ☑ Newsletter  ☑ Website  ☑ Print  ☑ Radio        │
│  ☐ Podcast  ☐ Events  ☐ Social  ☐ Streaming       │
│                                                     │
│  Frequency Strategy:                                │
│  (●) Standard - Publications at normal schedule    │
│  ( ) Reduced - Half the standard frequency         │
│  ( ) Minimum - 1x per publication only             │
│  ( ) Custom - Set individually later               │
│                                                     │
│              [Build Package]                        │
│                                                     │
└────────────────────────────────────────────────────┘
```

**Key UX Notes:**
- Simple, one-screen entry
- Two approaches: budget-first or specification-first
- Frequency strategy explained with tooltips
- Large, prominent "Build Package" button
- Pre-built smart defaults

---

### 2. Package Results & Summary

```
┌────────────────────────────────────────────────────┐
│  ◄ Edit Parameters                                 │
├────────────────────────────────────────────────────┤
│                                                     │
│  ▼ PACKAGE SUMMARY                                 │
│  ┌──────────────────────────────────────────────┐ │
│  │ Monthly: $28,500      Budget: $30,000        │ │
│  │ 6-Month Total: $171,000                      │ │
│  │ Budget Used: 95% ████████████████████░░       │ │
│  │                                               │ │
│  │ 8 Outlets • 3 Channels • 87 Units            │ │
│  │ Frequency: Standard                           │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
│  💡 Need to adjust cost?                           │
│  [Reduce to Half] [Reduce to 1x] [Customize▼]    │
│                                                     │
│  ─────────────────────────────────────────────────│
│                                                     │
│  ▼ BREAKDOWN                                       │
│  [By Channel] [By Outlet] [Line Items]            │
│                                                     │
│  Newsletter ($7,139) - 17 outlets, 46 units       │
│  Print ($17,871) - 8 outlets, 28 units            │
│  Website ($3,490) - 13 outlets, 13 units          │
│                                                     │
│  ─────────────────────────────────────────────────│
│                                                     │
│  Package Name: [Q4 South Side Campaign_______]     │
│  [Save Package] [Export CSV] [Generate Order]     │
│                                                     │
└────────────────────────────────────────────────────┘
```

**Key UX Notes:**
- Clear cost summary at top with visual budget gauge
- Quick adjustment buttons for common actions
- Three views: by channel, by outlet, by line item
- Save/export at bottom
- All key metrics visible without scrolling

---

### 3. Line Items Detail (Frequency Controls)

```
┌────────────────────────────────────────────────────┐
│  ▼ DAILY NEWSPAPERS (2 outlets) - $11,820/mo      │
│                                                     │
│  Chicago Sun-Times                                 │
│  ┌────────────────────────────────────────────┐   │
│  │ Full Page Ad                               │   │
│  │ Base: $1,950 per insertion                 │   │
│  │ Frequency: [12x per month ▼]              │   │
│  │           ├ 12x = $23,400 ●               │   │
│  │           ├ 6x  = $11,700                 │   │
│  │           ├ 4x  = $7,800                  │   │
│  │           └ 1x  = $1,950                  │   │
│  │ Monthly: $23,400                           │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  ─────────────────────────────────────────────────│
│                                                     │
│  ▼ WEEKLY NEWSPAPERS (5 outlets) - $5,460/mo      │
│                                                     │
│  Chicago Reader                                    │
│  ┌────────────────────────────────────────────┐   │
│  │ Full Page Ad                               │   │
│  │ Base: $1,950 per insertion                 │   │
│  │ Frequency: [4x per month ▼]               │   │
│  │           ├ 4x  = $7,800 ●                │   │
│  │           ├ 2x  = $3,900                  │   │
│  │           └ 1x  = $1,950                  │   │
│  │ ⚠️ Max 4x (weekly publication)           │   │
│  │ Monthly: $7,800                            │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  ─────────────────────────────────────────────────│
│                                                     │
│  ▼ MONTHLY MAGAZINES (1 outlet) - $600/mo         │
│                                                     │
│  H-F Chronicle                                     │
│  ┌────────────────────────────────────────────┐   │
│  │ Full Page Ad                               │   │
│  │ Base: $600 per insertion                   │   │
│  │ Frequency: 1x only (monthly publication)   │   │
│  │ Monthly: $600                              │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
└────────────────────────────────────────────────────┘
```

**Key UX Notes:**
- Grouped by publication type (Daily/Weekly/Monthly)
- Dropdown shows ONLY valid frequencies
- Real-time cost calculation
- Clear warnings for frequency limits
- No dropdown for monthly (fixed at 1x)

---

### 4. Quick Adjustment Modal

```
┌────────────────────────────────────────────────────┐
│  Confirm Frequency Reduction               [×]     │
├────────────────────────────────────────────────────┤
│                                                     │
│  You're about to reduce all inventory to half      │
│  frequency. This will affect:                      │
│                                                     │
│  BEFORE: $28,500/month                             │
│  AFTER:  $14,250/month                             │
│  SAVES:  $14,250/month 🎉                          │
│                                                     │
│  Sample Changes:                                    │
│  • Chicago Sun-Times Full Page: 12x → 6x          │
│  • Chicago Reader Full Page: 4x → 2x              │
│  • South Side Weekly: 2x → 1x                     │
│  • H-F Chronicle: 1x → 1x (no change)             │
│                                                     │
│  ... and 83 more items                             │
│  [View All Changes ▼]                             │
│                                                     │
│  [Cancel]              [Confirm Reduction]         │
│                                                     │
└────────────────────────────────────────────────────┘
```

**Key UX Notes:**
- Shows cost impact BEFORE applying
- Lists sample affected items
- Option to view all changes
- Clear savings amount highlighted
- Easy to cancel or confirm

---

### 5. Saved Packages List

```
┌────────────────────────────────────────────────────┐
│  Saved Packages                      [+ New Package]│
├────────────────────────────────────────────────────┤
│                                                     │
│  Search: [_______________]  Sort: [Newest ▼]      │
│                                                     │
│  ┌──────────────────┐  ┌──────────────────┐       │
│  │ ABC Corp Q4      │  │ XYZ Foundation   │       │
│  │ $28,500/mo       │  │ $15,200/mo       │       │
│  │ 6-mo: $171,000   │  │ 3-mo: $45,600    │       │
│  │ 8 outlets • 87 items│  │ 5 outlets • 43 items│       │
│  │ Updated 2 hrs ago│  │ Updated Nov 10   │       │
│  │                  │  │                  │       │
│  │ [View] [Edit]    │  │ [View] [Edit]    │       │
│  │ [Duplicate] [Delete]│  │ [Duplicate] [Delete]│       │
│  └──────────────────┘  └──────────────────┘       │
│                                                     │
│  ┌──────────────────┐  ┌──────────────────┐       │
│  │ Test Package     │  │ South Side Test  │       │
│  │ ...              │  │ ...              │       │
│                                                     │
└────────────────────────────────────────────────────┘
```

**Key UX Notes:**
- Card-based grid layout
- Key info at a glance
- Quick actions on each card
- Search and sort functionality
- One-click duplicate for similar packages

---

## CRITICAL UX FEATURES

### 1. Smart Frequency Constraints ⭐

**The Problem:**
Publications have physical limits:
- Daily papers: up to 12x/month (every 2.5 days)
- Weekly papers: max 4x/month (once per issue)
- Bi-weekly: max 2x/month (once per issue)
- Monthly: only 1x/month (one issue)

**The Solution:**
- Dropdowns show ONLY valid options per publication
- System prevents impossible selections
- Clear warnings when limits apply
- Automatic adjustment for bulk operations

**Example:**
User tries to set weekly paper to 12x → System shows max 4x options only

---

### 2. Bulk Frequency Adjustments ⭐

**The Problem:**
Manually adjusting 87 individual frequencies is tedious

**The Solution:**
One-click buttons that intelligently adjust all items:

**"Reduce to Half Frequency":**
- Daily 12x → 6x
- Weekly 4x → 2x
- Bi-weekly 2x → 1x
- Monthly stays 1x (can't go lower)

**"Reduce to Minimum (1x)":**
- Everything goes to 1x per publication

**"Reset to Standard":**
- Returns to natural frequency (daily=12x, weekly=4x, etc.)

---

### 3. Real-Time Cost Updates ⭐

**Immediate Feedback:**
- Change frequency → cost updates instantly
- No "Calculate" or "Submit" needed
- Budget gauge updates live
- Summary card refreshes

**Visual Indicators:**
- Green: Under budget
- Amber: Close to budget (90-110%)
- Red: Over budget (>110%)

---

### 4. Flexible Entry Points ⭐

**Budget-First:**
- "I have $30K, what can I get?"
- System finds best inventory within budget
- Prioritizes high-value, diverse outlets

**Specification-First:**
- "Show me everything for these 3 outlets"
- User reviews full inventory
- Adjusts to meet budget

**Both paths lead to same powerful editing tools**

---

## FREQUENCY LOGIC REFERENCE

### Publication Type → Max Frequency

| Publication Type | Max Frequency | Example |
|-----------------|---------------|---------|
| Daily | 30x/month | Chicago Sun-Times |
| Weekly | 4x/month | Chicago Reader |
| Bi-weekly | 2x/month | South Side Weekly |
| Monthly | 1x/month | H-F Chronicle |

### Frequency Strategies

**Standard (Default):**
- Daily pubs: 12x/month
- Weekly pubs: 4x/month
- Bi-weekly: 2x/month
- Monthly: 1x/month

**Reduced (Half):**
- Daily: 6x/month
- Weekly: 2x/month
- Bi-weekly: 1x/month
- Monthly: 1x/month

**Minimum:**
- Everything: 1x/month

**Custom:**
- User sets each individually

---

## MOBILE/TABLET CONSIDERATIONS

### iPad (Primary Mobile Use Case)
✅ Full functionality
✅ Touch-friendly controls (48px+ buttons)
✅ Collapsible sections
✅ Frequency dropdowns easy to tap
✅ Review packages during client meetings

### Phone (View Only)
✅ View saved packages
✅ See package details
❌ Building packages (use tablet/desktop)
❌ Complex frequency editing

**Design Decision:** Sales team builds on desktop/tablet, reviews on mobile

---

## KEY PERFORMANCE INDICATORS

### Speed
- **Build package:** <5 minutes (vs. 30+ before)
- **Adjust frequency:** Instant (<1 second)
- **Save/load:** <2 seconds

### Accuracy
- **Frequency constraints:** 100% enforced
- **Cost calculations:** 100% accurate
- **Data integrity:** Zero corruption

### Adoption
- **User satisfaction:** >90% target
- **Weekly packages:** 10+ (vs. 2-3 before)
- **Time savings:** 50%+

---

## FUTURE ENHANCEMENTS (V2)

### Planned Features
- Side-by-side package comparison
- Tiered discount pricing (when data available)
- Insertion order generation (formatted documents)
- Package templates
- Advanced filtering (price range, reach)
- Excel export option
- Email sharing

### Potential Features
- Client-facing package viewer
- Campaign performance tracking
- Multi-user collaboration
- CRM integration
- Budget forecasting tools

---

## DESIGN PRINCIPLES

1. **Speed First** - Every action should feel instant
2. **Constraint-Aware** - Never let users make impossible selections
3. **Feedback-Rich** - Always show impact before applying changes
4. **Error-Resistant** - Prevent problems rather than handle errors
5. **Progressive Disclosure** - Simple by default, detailed when needed
6. **Reuse-Friendly** - Easy to duplicate and modify packages
7. **Export-Ready** - Professional deliverables for clients

---

## SUCCESS METRICS

### User Experience
✅ Sales team can use without training
✅ Reduces support tickets by 80%
✅ Intuitive enough for new hires

### Business Impact
✅ 50% time savings per package
✅ Enables quick what-if scenarios
✅ Professional client deliverables
✅ Scales to high volume (10+ packages/week)

### Technical
✅ <3 second package builds
✅ <1 second frequency updates
✅ Zero data corruption
✅ Works on Chrome, Safari, Firefox

---

## SUMMARY

The Chicago Hub Package Builder transforms a 30-minute manual process into a 5-minute guided workflow. The key innovation—smart frequency constraints—ensures sales teams can never create impossible packages while maximizing their flexibility to customize. Combined with one-click bulk adjustments and a save/reuse workflow, this tool enables the sales team to serve more clients faster with higher accuracy.

**Core Value Proposition:** Build better packages in less time with zero errors.

---

*For full wireframe details, see: frequency_controls_wireframes.md*  
*For technical implementation, see: lovable_master_prompt.md*  
*For development plan, see: prototype_development_plan.md*
