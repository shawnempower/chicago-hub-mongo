# Product Areas

This document organizes the Chicago Hub platform capabilities by product domain. It provides a complementary view to the phase-based [Roadmap](./ROADMAP.md), focusing on functional areas and their features.

---

## Table of Contents

1. [Overview](#overview)
2. [SAAS Platform (Core Products)](#saas-platform-core-products)
   - [Sales Assistant](#sales-assistant)
   - [Store](#store)
   - [Store Assistant](#store-assistant)
   - [Inventory](#inventory)
   - [Campaign](#campaign)
   - [Packages](#packages)
   - [Competition/Support](#competitionsupport)
3. [Local Media Store (Marketplace)](#local-media-store-marketplace)
4. [Network Infrastructure](#network-infrastructure)
   - [Our Network](#our-network)
   - [Demand](#demand)
5. [Supporting Systems](#supporting-systems)
   - [Publication](#publication)
   - [Payments/Estimates](#paymentsestimates)
   - [Hub](#hub)
   - [Custom Orders](#custom-orders)
6. [Cross-Reference Matrix](#cross-reference-matrix)

---

## Overview

The Chicago Hub platform is organized into distinct product areas that work together to enable local media advertising at scale. This document maps each product area, its current capabilities, and planned features.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCT AREAS MAP                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────── SAAS PLATFORM ──────────────────────────────┐     │
│  │                                                                         │     │
│  │  Sales       Store    Store      Inventory  Campaign  Packages  Comp/   │     │
│  │  Assistant            Assistant                                Support  │     │
│  │                                                                         │     │
│  └─────────────────────────────────────────────────────────────────────────┘     │
│                                                                                  │
│  ┌─── Our Network ───┐    ┌─── Demand ───┐    ┌─── LM Store ───┐               │
│  │ Marketplace       │    │ MCM          │    │ Marketplace    │               │
│  │ Storefront        │    │ D. Delivery  │    │ Login          │               │
│  │ Opt-in to Hubs    │    │              │    │                │               │
│  └───────────────────┘    └──────────────┘    └────────────────┘               │
│                                                                                  │
│  ┌──────────────────── SUPPORTING SYSTEMS ────────────────────────────────┐     │
│  │  Publication    │   Payments/Estimates   │   Hub    │   Custom Orders  │     │
│  └─────────────────────────────────────────────────────────────────────────┘     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## SAAS Platform (Core Products)

The main product modules that power the platform's core functionality.

### Sales Assistant

The Sales Assistant helps sales teams manage their pipeline and convert leads into customers.

| Aspect | Details |
|--------|---------|
| **Description** | Tools for sales teams to manage brands, track funnels, and convert prospects |
| **Primary Users** | Hub sales staff, Account executives |

#### Current Features

- Brand management interface
- Sales funnel tracking
- Lead qualification tools

#### Planned Features

| Feature | Description | Status |
|---------|-------------|--------|
| Testing | Comprehensive testing framework for sales workflows | Planned |
| Gateway | Entry-point interface for new sales prospects | Planned |
| Basic Preview | Quick preview of available inventory for prospects | Planned |

#### Dependencies

- Relies on [Inventory](#inventory) for available ad placements
- Integrates with [Campaign](#campaign) for proposal generation
- Feeds into [Packages](#packages) for bundled offerings

---

### Store

The Store module manages the publication-facing storefront capabilities.

| Aspect | Details |
|--------|---------|
| **Description** | Publication storefront management and customization |
| **Primary Users** | Publication administrators |

#### Current Features

- Storefront configuration
- Theme customization
- Section management
- SEO settings

#### Planned Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Premium/Free Tier Gate** | Tiered storefront access with free and premium versions | Planned |
| Testing | Testing tools for storefront configurations | Planned |
| Custom Themes | Fully customizable storefront themes | Planned |
| Shared Templates | Reusable storefront templates across publications | Planned |

#### Storefront Tiers

| Tier | Features Included |
|------|-------------------|
| **Free** | Basic storefront, standard theme, limited sections, basic SEO |
| **Premium** | Custom themes, unlimited sections, advanced SEO, Store Assistant AI chat, analytics dashboard, custom domain support |

#### Dependencies

- Works with [Store Assistant](#store-assistant) for AI chat functionality (Premium tier)
- Connects to [Publication](#publication) for content management
- Integrates with [Payments/Estimates](#paymentsestimates) for tier billing

#### Related User Stories

- PUB-STORE-001 to PUB-STORE-007

---

### Store Assistant

AI-powered assistant that helps advertisers discover and purchase inventory.

| Aspect | Details |
|--------|---------|
| **Description** | Conversational AI interface for inventory discovery and lead capture |
| **Primary Users** | Advertisers, Prospects |

#### Current Features

- AI chat widget on storefronts
- Inventory discovery via natural language
- Lead capture and qualification
- Context-aware responses

#### Planned Features

| Feature | Description | Status |
|---------|-------------|--------|
| Testing | Testing framework for AI responses | Planned |
| Social Events | Integration with social media events and promotions | Planned |
| Outlets | Support for outlet/retail advertising options | Planned |

#### Dependencies

- Requires [Inventory](#inventory) data for recommendations
- Feeds leads to [Sales Assistant](#sales-assistant)
- Powered by AI infrastructure

#### Related User Stories

- PUB-STORE-005, PUB-STORE-006
- HUB-CHAT-001 to HUB-CHAT-003

---

### Inventory

Central management for all advertising inventory across 9 channels.

| Aspect | Details |
|--------|---------|
| **Description** | Comprehensive inventory management for all ad channels |
| **Primary Users** | Publication admins, Hub operators |

#### Current Features

| Channel | Status |
|---------|--------|
| Website advertising | ✅ Complete |
| Newsletter advertising | ✅ Complete |
| Print advertising | ✅ Complete |
| Social media advertising | ✅ Complete |
| Event sponsorships | ✅ Complete |
| Podcast advertising | ✅ Complete |
| Radio advertising | ✅ Complete |
| Streaming video | ✅ Complete |
| Hub-specific pricing | ✅ Complete |

#### Planned Features

| Feature | Description | Status |
|---------|-------------|--------|
| Social Events | Enhanced social media event sponsorships | Planned |
| Outlets | Outlet/retail advertising channel | Planned |
| Newsletter Integrations | Deep newsletter platform integrations | Planned |
| Social Integrations | Direct social platform connections | Planned |
| Packages | Pre-built inventory packages | Planned |
| Episodes | Episodic content advertising (podcasts, video series) | Planned |
| Ad Manager Integration | Direct ad server connections | Planned |
| Direct Deals | Publisher-direct deal management | Planned |

#### Dependencies

- Core dependency for [Campaign](#campaign), [Packages](#packages), [Sales Assistant](#sales-assistant)
- Data flows to [Store Assistant](#store-assistant) for recommendations

#### Related User Stories

- PUB-INV-001 to PUB-INV-010

---

### Campaign

End-to-end campaign management from creation to fulfillment.

| Aspect | Details |
|--------|---------|
| **Description** | Campaign builder, management, and tracking |
| **Primary Users** | Hub operators, Account managers |

#### Current Features

- 5-step Campaign Builder wizard
- AI-powered inventory selection
- Multiple AI algorithms for optimization
- Package-based campaign creation
- Insertion order generation
- Creative asset management

#### Performance Tracking (Current)

| Capability | Description | Status |
|------------|-------------|--------|
| Placement status tracking | Track status of each placement in a campaign | ✅ Complete |
| Tracking tag generation | Auto-generate tracking pixels/tags for digital placements | ✅ Complete |
| Performance reporting | View campaign metrics and results | ✅ Complete |
| Proof of performance uploads | Publications upload proof of ad run | ✅ Complete |

#### Planned Features

| Feature | Description | Status |
|---------|-------------|--------|
| Testing | Campaign testing and preview tools | Planned |
| AI-driven Agent | Autonomous campaign optimization agent | Planned |
| Predictive Companies | AI-powered company/advertiser targeting | Planned |
| Forecasting | Campaign performance forecasting | Planned |
| Performance Report Automation | Auto-pull digital metrics from ad servers | Planned |
| Proof Generation | Auto-generate proofs from tracking data | Planned |
| Tag Testing Automation | Auto-verify tracking tags work correctly | Planned |
| Campaign Performance Prediction | Estimate results before launch | Planned |

#### Dependencies

- Requires [Inventory](#inventory) for available placements
- Uses [Packages](#packages) for bundled offerings
- Connects to [Payments/Estimates](#paymentsestimates) for pricing

#### Related User Stories

- HUB-CAMP-001 to HUB-CAMP-016 (Campaign management)
- PUB-ORD-005, PUB-ORD-006 (Placement status tracking)
- PUB-ORD-009 (Tracking tag generation)
- PUB-ORD-010 (Performance reporting)
- PUB-ORD-011 (Proof of performance)

---

### Packages

Pre-built and custom advertising packages for streamlined sales.

| Aspect | Details |
|--------|---------|
| **Description** | Package creation, management, and pricing |
| **Primary Users** | Hub operators, Sales teams |

#### Current Features

- Package builder with filters
- Package health scoring
- Geographic and demographic targeting
- Multi-channel bundling
- Package pricing management

#### Planned Features

| Feature | Description | Status |
|---------|-------------|--------|
| Testing | Package performance testing | Planned |
| AI Plan | AI-generated package recommendations | Planned |

#### Dependencies

- Aggregates [Inventory](#inventory) items
- Used by [Campaign](#campaign) for quick campaign creation
- Supports [Sales Assistant](#sales-assistant) proposals

#### Related User Stories

- HUB-PKG-001 to HUB-PKG-005

---

### Competition/Support

Competitive analysis and customer support tools.

| Aspect | Details |
|--------|---------|
| **Description** | Market intelligence and support infrastructure |
| **Primary Users** | Hub operators, Support staff |

#### Current Features

- Basic support ticketing
- Documentation access

#### Planned Features

| Feature | Description | Status |
|---------|-------------|--------|
| Testing | Support workflow testing | Planned |
| Backbone | Core support infrastructure and escalation | Planned |

#### Dependencies

- Cross-cuts all other product areas
- Integrates with user management

---

## Local Media Store (Marketplace)

The advertiser-facing marketplace platform for discovering and purchasing local media advertising.

| Aspect | Details |
|--------|---------|
| **Description** | Public marketplace for advertisers to discover publications and inventory |
| **Primary Users** | Advertisers, Media buyers |

### Current Features

- Publication discovery
- Inventory browsing
- AI-powered recommendations

### Planned Features

| Feature | Description | Status |
|---------|-------------|--------|
| Marketplace Login | Dedicated advertiser authentication | Planned |
| Marketplace Browsing | Enhanced search and filter capabilities | Planned |
| Self-service Booking | Direct advertiser booking without hub | Planned |
| Advertiser Accounts | Full advertiser account management | Planned |

### Dependencies

- Pulls from [Inventory](#inventory) across all publications
- Connects to [Payments/Estimates](#paymentsestimates) for transactions
- Integrates with [Campaign](#campaign) for order fulfillment

### Related User Stories

- Phase 2 and Phase 4 features in [Roadmap](./ROADMAP.md)

---

## Network Infrastructure

The underlying systems that connect publications, hubs, and demand sources.

### Our Network

The supply-side network infrastructure.

| Aspect | Details |
|--------|---------|
| **Description** | Network of publications and their integration with the platform |
| **Primary Users** | Publications, Hub operators |

#### Components

| Component | Description | Status |
|-----------|-------------|--------|
| Marketplace | Publication listing in the marketplace | ✅ Active |
| Eating/Content | Content syndication and distribution | Planned |
| Storefront | Publication storefront infrastructure | ✅ Active |
| Opt-in to Hubs | Publication-hub relationship management | ✅ Active |

#### Dependencies

- Supplies inventory to [Inventory](#inventory)
- Publications serve [Store](#store) storefronts

---

### Demand

The demand-side systems for campaign fulfillment.

| Aspect | Details |
|--------|---------|
| **Description** | Demand generation and delivery infrastructure |
| **Primary Users** | Hub operators, System |

#### Components

| Component | Description | Status |
|-----------|-------------|--------|
| MCM (Media Campaign Management) | Central campaign orchestration | ✅ Active |
| D. Delivery (Demand Delivery) | Campaign delivery and fulfillment | Planned |

#### Dependencies

- Receives campaigns from [Campaign](#campaign)
- Distributes to [Our Network](#our-network) publications

---

## Supporting Systems

Foundational systems that support the core product areas.

### Publication

Publication profile and content management.

| Aspect | Details |
|--------|---------|
| **Description** | Publication onboarding, profiles, and content management |
| **Primary Users** | Publication administrators |

#### Current Features

- Publication profile CRUD
- Contact information management
- Audience demographics
- Booking policies
- Data quality scoring

#### Planned Features

| Feature | Description | Status |
|---------|-------------|--------|
| Discovery Model | AI-powered publication discovery | Planned |
| Pages | Custom landing pages for publications | Planned |
| Info | Enhanced publication information display | Planned |
| Assist | AI-assisted publication setup | Planned |

#### Related User Stories

- PUB-PROF-001 to PUB-PROF-006

---

### Payments/Estimates

Financial operations including estimates, invoicing, and payment processing.

| Aspect | Details |
|--------|---------|
| **Description** | Financial workflow management |
| **Primary Users** | Hub finance, Publication finance |

#### Current Features

- Estimate generation
- Order pricing calculation
- Basic invoicing

#### Planned Features

| Feature | Description | Status |
|---------|-------------|--------|
| Payment Processing | Credit card / ACH payment processing | Planned |
| Automated Invoicing | Auto-generated invoices from orders | Planned |
| Revenue Sharing | Automated hub-publication splits | Planned |

#### Dependencies

- Receives orders from [Campaign](#campaign)
- Integrates with [Hub](#hub) for financial reporting

#### Related User Stories

- Phase 2: Self-service and payments

---

### Hub

Hub-level operations, branding, and configuration.

| Aspect | Details |
|--------|---------|
| **Description** | Hub management and customization |
| **Primary Users** | Hub administrators |

#### Current Features

- Hub dashboard with analytics
- Team management
- Pricing analytics
- Network overview

#### Planned Features

| Feature | Description | Status |
|---------|-------------|--------|
| Branding | White-label branding customization | Planned |
| Custom Domains | Hub-specific domain configuration | Planned |

#### Related User Stories

- HUB-DASH-001 to HUB-DASH-010
- HUB-TEAM-001 to HUB-TEAM-005

---

### Custom Orders

Specialized order types and fulfillment options.

| Aspect | Details |
|--------|---------|
| **Description** | Non-standard order types and configurations |
| **Primary Users** | Hub operators, Account managers |

#### Current Features

- Standard order workflow
- Multi-publication orders

#### Planned Features

| Feature | Description | Status |
|---------|-------------|--------|
| Kitting/Palettes | Bundled fulfillment packages | Planned |
| More Inventory Options | Extended inventory type support | Planned |
| Custom Pricing | Negotiated/custom pricing workflows | Planned |

#### Dependencies

- Extends [Campaign](#campaign) capabilities
- Uses [Inventory](#inventory) data

---

## Cross-Reference Matrix

### Product Areas to Roadmap Phases

| Product Area | Phase 0 (Foundation) | Phase 1 (Enhancement) | Phase 2 (Scale) | Phase 3 (Intelligence) | Phase 4 (Ecosystem) |
|--------------|---------------------|----------------------|-----------------|----------------------|---------------------|
| Sales Assistant | Basic lead mgmt | UX improvements | Automation | AI-driven agent | CRM integrations |
| Store | Storefront live | Theme polish | Self-service | Smart recommendations | Marketplace |
| Store Assistant | AI chat | Response tuning | Scale handling | NLP improvements | Multi-language |
| Inventory | 9 channels | Bulk updates | API sync | Predictive availability | External integrations |
| Campaign | Builder wizard | Workflow optimization | Automation | Forecasting, AI | Multi-hub campaigns |
| Packages | Package builder | Health scoring | Templates | AI recommendations | Network packages |
| Competition/Support | Basic | Enhanced | Automated | Predictive | Full support suite |
| LM Store | - | - | Advertiser portal | Discovery AI | Public marketplace |
| Network | Pub management | - | API | - | National distribution |
| Payments | Estimates | - | Processing | - | Revenue automation |
| Hub | Dashboard | Branding | White-label | Analytics | Multi-hub |
| Custom Orders | Basic workflow | Templates | Automation | - | - |

### Product Areas to User Story Categories

| Product Area | User Story Prefixes |
|--------------|---------------------|
| Sales Assistant | PUB-LEAD-*, HUB-CAMP-* |
| Store | PUB-STORE-* |
| Store Assistant | PUB-STORE-005/006, HUB-CHAT-* |
| Inventory | PUB-INV-* |
| Campaign | HUB-CAMP-* |
| Packages | HUB-PKG-* |
| Publication | PUB-PROF-*, PUB-DASH-* |
| Hub | HUB-DASH-*, HUB-TEAM-*, HUB-PRICE-* |

---

## Related Documentation

- [Roadmap](./ROADMAP.md) - Phase-based implementation roadmap
- [User Stories](./USER_STORIES.md) - Detailed user stories with acceptance criteria
- [Architecture](./ARCHITECTURE.md) - Technical architecture documentation

---

*Document based on product area whiteboard mapping. Last updated: January 2026*
