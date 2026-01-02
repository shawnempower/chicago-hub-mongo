/**
 * Orders Components Index
 * 
 * Exports all order-related components for easy importing.
 */

// Status badges
export { OrderStatusBadge } from './OrderStatusBadge';
export type { OrderStatus } from './OrderStatusBadge';
export { PlacementStatusBadge } from './PlacementStatusBadge';
export type { PlacementStatus } from './PlacementStatusBadge';

// Placement trafficking
export { PlacementTraffickingCard } from './PlacementTraffickingCard';
export { extractTraffickingInfo, formatCurrency, formatNumber, formatDateRange, groupWebsitePlacements } from './placementTrafficking.utils';
export type {
  PlacementTraffickingInfo,
  WebsiteTraffickingInfo,
  NewsletterTraffickingInfo,
  PrintTraffickingInfo,
  RadioTraffickingInfo,
  PodcastTraffickingInfo,
  StreamingTraffickingInfo,
  EventsTraffickingInfo,
  SocialTraffickingInfo,
  GenericTraffickingInfo,
  BasePlacementInfo,
} from './placementTrafficking.types';

// Other order components
export { AdSpecsForm } from './AdSpecsForm';
export { CreativeAssetCard } from './CreativeAssetCard';
export { OrderMessaging } from './OrderMessaging';
export { OrderTimeline } from './OrderTimeline';


