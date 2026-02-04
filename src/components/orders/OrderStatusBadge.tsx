import React from 'react';
import { Badge } from '@/components/ui/badge';

export type OrderStatus = 'draft' | 'sent' | 'confirmed' | 'rejected' | 'in_production' | 'delivered';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700 border-gray-200'
  },
  sent: {
    label: 'Sent',
    className: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  confirmed: {
    label: 'Confirmed',
    className: 'bg-green-100 text-green-700 border-green-200'
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700 border-red-200'
  },
  in_production: {
    label: 'In Production',
    className: 'bg-amber-100 text-amber-700 border-amber-200'
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-green-100 text-green-700 border-green-200'
  }
};

export function OrderStatusBadge({ status, className = '' }: OrderStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={`${config.className} ${className}`}>
      {config.label}
    </Badge>
  );
}

