import React from 'react';
import { Check, Circle, X, Clock } from 'lucide-react';
import { OrderStatus } from './OrderStatusBadge';

interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: Date;
  changedBy?: string;
  notes?: string;
}

interface OrderTimelineProps {
  currentStatus: OrderStatus;
  statusHistory?: StatusHistoryEntry[];
  className?: string;
}

const workflowSteps: Array<{ status: OrderStatus; label: string }> = [
  { status: 'draft', label: 'Draft' },
  { status: 'sent', label: 'Sent to Publication' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'in_production', label: 'In Production' },
  { status: 'delivered', label: 'Delivered' }
];

export function OrderTimeline({ currentStatus, statusHistory = [], className = '' }: OrderTimelineProps) {
  const currentStepIndex = workflowSteps.findIndex(step => step.status === currentStatus);
  const isRejected = currentStatus === 'rejected';

  const getStepStatus = (stepIndex: number): 'completed' | 'current' | 'upcoming' => {
    if (isRejected) {
      return 'upcoming'; // Show all as upcoming if rejected
    }
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'upcoming';
  };

  const getStepIcon = (stepIndex: number) => {
    const status = getStepStatus(stepIndex);
    
    if (status === 'completed') {
      return <Check className="h-4 w-4 text-white" />;
    }
    if (status === 'current') {
      return <Clock className="h-4 w-4 text-white animate-pulse" />;
    }
    return <Circle className="h-4 w-4 text-gray-400" />;
  };

  const getStepDate = (status: OrderStatus): Date | undefined => {
    const entry = statusHistory.find(h => h.status === status);
    return entry?.timestamp;
  };

  const formatDate = (date?: Date): string => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`py-4 ${className}`}>
      {isRejected && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <X className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-900">Order Rejected</p>
            <p className="text-sm text-red-700 mt-1">
              {statusHistory.find(h => h.status === 'rejected')?.notes || 'This order has been rejected.'}
            </p>
          </div>
        </div>
      )}

      <div className="relative">
        {workflowSteps.map((step, index) => {
          const status = getStepStatus(index);
          const stepDate = getStepDate(step.status);
          const isLast = index === workflowSteps.length - 1;

          return (
            <div key={step.status} className="relative pb-8">
              {/* Connector line */}
              {!isLast && (
                <div
                  className={`absolute left-4 top-8 w-0.5 h-full ${
                    status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              )}

              {/* Step content */}
              <div className="relative flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    status === 'completed'
                      ? 'bg-green-500 border-green-500'
                      : status === 'current'
                      ? 'bg-blue-500 border-blue-500'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {getStepIcon(index)}
                </div>

                {/* Label and date */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p
                    className={`text-sm font-medium ${
                      status === 'completed' || status === 'current'
                        ? 'text-gray-900'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </p>
                  {stepDate && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(stepDate)}
                    </p>
                  )}
                  {status === 'current' && !isRejected && (
                    <p className="text-xs text-blue-600 mt-1 font-medium">
                      Current Status
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

