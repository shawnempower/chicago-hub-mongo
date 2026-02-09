# Hub Sales Assistant — Implementation Overview

## For Shawn Chapman

**From:** Steven  
**Date:** January 2026  
**Goal:** Get a working minimum version this afternoon

---

## The Short Version

The current Hub Assistant has generic instructions and limited data access. We want to upgrade it to:

1. **Research brands** using web search (name + URL → strategic research)
2. **Accept document uploads** (RFPs, brand decks) for context
3. **Plan campaigns** using actual inventory and pricing data
4. **Generate proposals** in Markdown (exportable to PDF)
5. **Export packages** as CSV for inventory management
6. **Handle identity** (EmpowerLocal vs. CMC based on Hub context)

We believe this is mostly a **prompt + data access** problem, not a new system build.

---

## What I'm Providing

### 1. System Prompt
`Hub_Sales_Assistant_System_Prompt.md`

Comprehensive instructions covering:
- How to handle each scenario (research, RFP, planning, proposals, packages)
- Tone and style guidance
- Data usage expectations
- Output formatting
- Identity handling (EmpowerLocal vs. CMC)
- Error handling and user guidance

**Action:** Replace current generic prompt with this one.

---

### 2. Data Access Requirements
`Hub_Sales_Assistant_Data_Requirements.md`

Specifies exactly what data the agent needs:
- Publisher roster (names, IDs, descriptions)
- Audience data (reach, demographics)
- Community segments (with publisher mappings)
- Geographic coverage
- Inventory catalog (placements, pricing, availability)
- Aggregate metrics
- Hub configuration (branding, defaults)
- User context (which Hub, permissions)

**Action:** Ensure agent can query this data. Options:
- Direct database access
- API endpoints
- Pre-loaded context (for commonly-used data)

---

### 3. Output Format Specifications
`Hub_Sales_Assistant_Output_Formats.md`

Detailed templates for:
- Proposals (Markdown structure, all sections)
- Research briefs (Markdown structure)
- Package exports (CSV columns, values, examples)

**Action:** Agent uses these formats for all outputs.

---

## Capability Checklist

| Capability | Requirement | Notes |
|------------|-------------|-------|
| **Web search** | Agent can search the web | For brand research |
| **Document upload** | User can upload files, agent can read them | For RFPs, brand decks |
| **Publisher data** | Agent can query all publishers in Hub | Names, details, segments |
| **Inventory data** | Agent can query available placements | Formats, pricing, availability |
| **Audience data** | Agent can query reach/demographics | For recommendations |
| **Markdown output** | Agent can generate structured Markdown | For proposals |
| **CSV output** | Agent can generate CSV | For package exports |
| **Hub context** | Agent knows which Hub user is in | For identity/branding |

---

## Data Access Options

### Option A: Load into context
Load key data into the system prompt or context window:
- Full publisher roster with details
- Inventory catalog
- Segment definitions
- Hub configuration

**Pros:** Fast queries, no API calls needed  
**Cons:** Context length limits, may need summarization

### Option B: API calls
Agent calls Hub API endpoints as needed:
- `GET /publishers` — List publishers
- `GET /publishers/{id}/inventory` — Get inventory for publisher
- `GET /segments` — List community segments
- etc.

**Pros:** Always current, no context limits  
**Cons:** Latency, need to handle errors

### Option C: Hybrid (Recommended)
- Load aggregate data and publisher roster into context
- API calls for detailed inventory lookups and pricing
- This balances speed with flexibility

---

## Identity Handling

The agent should adapt branding based on Hub context:

| Hub | Display Name | Key Positioning |
|-----|--------------|-----------------|
| Chicago Media Collective | "Chicago Media Collective" | 39 Chicago publishers, community trust |
| EmpowerLocal (default) | "EmpowerLocal" or Hub-specific | Adapt to Hub configuration |

**Detection:**
1. Check user's current Hub assignment
2. Or detect from explicit user statement
3. Or infer from publisher names mentioned

**Implementation:** Hub configuration should include `display_name`, `tagline`, and positioning text.

---

## Minimum Test Scenarios

Once implemented, test these flows:

### Test 1: Brand Research
```
User: "Research Portillo's. Website is portillos.com."

Expected: Agent searches web, returns research brief with:
- Company overview
- Brand positioning
- Chicago locations
- Strategic alignment with Hub publishers
- Discovery questions
```

### Test 2: Campaign Planning
```
User: "Plan a campaign for Portillo's. Budget is $50K/month for 3 months. 
       They want to reach families, especially in suburbs where they have locations."

Expected: Agent queries inventory, returns plan with:
- Recommended publishers
- Specific placements with pricing
- Channel allocation
- Total investment breakdown
```

### Test 3: Proposal Generation
```
User: "Generate a proposal for this campaign."

Expected: Agent outputs Markdown proposal with:
- All sections from template
- Actual publisher names and reach
- Actual pricing from inventory
- Professional formatting
```

### Test 4: Package Export
```
User: "Export this as a CSV package."

Expected: Agent outputs CSV with:
- All line items from proposal
- Correct column structure
- Publisher and placement IDs
- Summary section
```

### Test 5: Document Upload
```
User: [Uploads RFP PDF] "Help me respond to this RFP."

Expected: Agent reads document, extracts:
- Requirements and objectives
- Budget parameters
- Timeline
- Evaluation criteria
Then develops tailored response strategy
```

---

## What We're NOT Doing (Yet)

Explicitly deferring these for later:

| Feature | Why Deferring |
|---------|---------------|
| Persistent brand profiles | Need database entity; use chat context for now |
| Pipeline/CRM tracking | Manual or separate system for now |
| Package building in dashboard UI | Export CSV for now, iterate later |
| Proposal history/versioning | Track manually for now |
| Multi-brand comparison | Single brand focus for MVP |

---

## Next Steps After MVP

Once the minimum version is working:

1. **Gather feedback** from Will and Amber on what's missing
2. **Add brand profiles** as persistent entities
3. **Build package management** into dashboard UI
4. **Add proposal versioning** and history
5. **Connect to campaign workflow** (proposal → IO → campaign)

---

## Questions for Quick Sync

Before or during implementation:

1. **Data loading:** What's the best way to give the agent access to publisher/inventory data?

2. **Web search:** Is this already available to the agent, or needs to be enabled?

3. **Document upload:** Is parsing already handled, or needs work?

4. **Output handling:** How should Markdown/CSV exports be delivered to user? Download button? Copy to clipboard?

5. **Hub detection:** How does the agent know which Hub the user is in?

---

## Files Included

| File | Purpose |
|------|---------|
| `Hub_Sales_Assistant_System_Prompt.md` | Core instructions for the agent |
| `Hub_Sales_Assistant_Data_Requirements.md` | What data access is needed |
| `Hub_Sales_Assistant_Output_Formats.md` | Proposal and CSV templates |
| `Hub_Sales_Assistant_Implementation_Overview.md` | This document |

---

Let me know what questions come up as you dig in. Happy to jump on a call.

— Steven
