import React from 'react';
import { Badge } from './badge';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type HealthStatus = 'healthy' | 'needs-attention' | 'critical';

interface HealthBadgeProps {
  status: HealthStatus;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const healthConfig = {
  healthy: {
    label: 'Healthy',
    icon: CheckCircle2,
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-300',
  },
  'needs-attention': {
    label: 'Needs Attention',
    icon: AlertTriangle,
    variant: 'secondary' as const,
    className: 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300',
  },
  critical: {
    label: 'Critical',
    icon: XCircle,
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800 hover:bg-red-100 border-red-300',
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function HealthBadge({ 
  status, 
  className, 
  showIcon = true,
  size = 'md' 
}: HealthBadgeProps) {
  const config = healthConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        config.className,
        sizeClasses[size],
        'flex items-center gap-1.5 font-medium border',
        className
      )}
    >
      {showIcon && <Icon className={cn(
        'flex-shrink-0',
        size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
      )} />}
      {config.label}
    </Badge>
  );
}

// Export helper to get color class for styling other elements
export function getHealthColorClass(status: HealthStatus): string {
  return {
    healthy: 'text-green-600',
    'needs-attention': 'text-amber-600',
    critical: 'text-red-600',
  }[status];
}

// Export helper to get background color class
export function getHealthBgClass(status: HealthStatus): string {
  return {
    healthy: 'bg-green-50 border-green-200',
    'needs-attention': 'bg-amber-50 border-amber-200',
    critical: 'bg-red-50 border-red-200',
  }[status];
}

