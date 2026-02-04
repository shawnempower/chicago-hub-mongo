/**
 * PlacementStatusBadge
 * 
 * Displays the status of an individual placement within an order.
 * Different from OrderStatusBadge which shows overall order status.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, CheckCircle2, X, Clock } from 'lucide-react';

export type PlacementStatus = 'pending' | 'accepted' | 'rejected' | 'in_production' | 'delivered';

interface PlacementStatusBadgeProps {
  status: PlacementStatus | string;
  className?: string;
}

export function PlacementStatusBadge({ status, className = '' }: PlacementStatusBadgeProps) {
  switch (status) {
    case 'accepted':
      return (
        <Badge className={`bg-green-50 text-green-700 border border-green-200 pointer-events-none ${className}`}>
          <Check className="h-3 w-3 mr-1" /> Accepted
        </Badge>
      );
    case 'in_production':
      return (
        <Badge className={`bg-blue-50 text-blue-700 border border-blue-200 pointer-events-none ${className}`}>
          <Loader2 className="h-3 w-3 mr-1" /> In Production
        </Badge>
      );
    case 'delivered':
      return (
        <Badge className={`bg-green-50 text-green-700 border border-green-200 pointer-events-none ${className}`}>
          <CheckCircle2 className="h-3 w-3 mr-1" /> Delivered
        </Badge>
      );
    case 'rejected':
      return (
        <Badge className={`bg-red-50 text-red-700 border border-red-200 pointer-events-none ${className}`}>
          <X className="h-3 w-3 mr-1" /> Rejected
        </Badge>
      );
    case 'pending':
    default:
      return (
        <Badge className={`bg-amber-50 text-amber-700 border border-amber-200 pointer-events-none ${className}`}>
          <Clock className="h-3 w-3 mr-1" /> Pending Review
        </Badge>
      );
  }
}

export default PlacementStatusBadge;





