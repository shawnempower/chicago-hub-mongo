import React from 'react';
import { Badge } from '@/components/ui/badge';

export type OrderStatus = 'draft' | 'sent' | 'confirmed' | 'rejected' | 'in_production' | 'delivered';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const statusConfig: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  draft: {
    label: 'Draft',
    variant: 'outline',
    color: 'text-gray-600'
  },
  sent: {
    label: 'Sent',
    variant: 'secondary',
    color: 'text-blue-600'
  },
  confirmed: {
    label: 'Confirmed',
    variant: 'default',
    color: 'text-green-600'
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
    color: 'text-red-600'
  },
  in_production: {
    label: 'In Production',
    variant: 'default',
    color: 'text-purple-600'
  },
  delivered: {
    label: 'Delivered',
    variant: 'default',
    color: 'text-emerald-600'
  }
};

export function OrderStatusBadge({ status, className = '' }: OrderStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={`${config.color} ${className}`}>
      {config.label}
    </Badge>
  );
}

