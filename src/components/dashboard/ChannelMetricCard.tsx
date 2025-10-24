import React from 'react';
import { Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';
import { ActiveChannel, ChannelMetricValue } from '@/utils/channelMetrics';

interface ChannelMetricCardProps {
  channel: ActiveChannel;
}

const getSocialIcon = (platform: string) => {
  const iconClass = "w-3.5 h-3.5";
  switch (platform.toLowerCase()) {
    case 'facebook':
      return <Facebook className={iconClass} />;
    case 'instagram':
      return <Instagram className={iconClass} />;
    case 'twitter':
      return <Twitter className={iconClass} />;
    case 'linkedin':
      return <Linkedin className={iconClass} />;
    default:
      return <span className="text-xs font-bold">{platform.charAt(0).toUpperCase()}</span>;
  }
};

const renderMetricValue = (metric: ChannelMetricValue, borderColor: string) => {
  // Handle special rendering cases
  if (metric.special === 'platforms' && metric.data) {
    return (
      <div className={`border-l-4 ${borderColor} pl-3 py-1`}>
        <div className="flex flex-wrap gap-2">
          {metric.data.map((platform: any, idx: number) => (
            <div 
              key={idx} 
              className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5"
            >
              <div className="text-purple-600">
                {getSocialIcon(platform.platform)}
              </div>
              <div className="text-xs">
                <span className="font-sans font-medium text-gray-700 capitalize">
                  {platform.platform}
                </span>
                <span className="text-gray-500 ml-1">
                  {platform.followers?.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {metric.label}
        </p>
      </div>
    );
  }
  
  if (metric.special === 'events-list' && metric.data) {
    return (
      <div className={`border-l-4 ${borderColor} pl-3 py-1`}>
        <ul className="space-y-2">
          {metric.data.map((event: any, idx: number) => (
            <li key={idx} className="text-sm">
              <strong className="text-gray-900">{event.name}:</strong>{' '}
              <span className="text-gray-700">
                {event.attendance?.toLocaleString()} attendees, {event.frequency || 'N/A'}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-gray-600 mt-2">
          {metric.label}
        </p>
      </div>
    );
  }
  
  // Standard numeric or string value with left border bar
  const displayValue = typeof metric.value === 'number' 
    ? metric.value.toLocaleString() 
    : (metric.value || 'N/A');
  
  return (
    <div className={`border-l-4 ${borderColor} pl-3 py-1`}>
      <p className="text-2xl font-bold text-gray-900 leading-tight">
        {displayValue}
      </p>
      <p className="text-sm text-gray-600 mt-1">
        {metric.label}
      </p>
    </div>
  );
};

export const ChannelMetricCard: React.FC<ChannelMetricCardProps> = ({ channel }) => {
  const Icon = channel.icon;
  
  // Map channel colors to border colors
  const borderColorMap: Record<string, string> = {
    'blue': 'border-blue-500',
    'slate': 'border-slate-600',
    'indigo': 'border-indigo-500',
    'purple': 'border-purple-500',
    'rose': 'border-rose-500',
    'amber': 'border-amber-500',
    'red': 'border-red-500',
    'cyan': 'border-cyan-500',
    'green': 'border-green-500'
  };
  
  const borderColor = borderColorMap[channel.color] || 'border-gray-500';
  
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className={`${channel.bgColor} p-2 rounded-lg`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h3 className={`text-sm font-sans font-medium ${channel.textColor}`}>
          {channel.label}
        </h3>
      </div>
      
      {/* Render metrics based on type */}
      {channel.metrics.length === 1 && channel.metrics[0].special ? (
        // Special single metric (like events list or platforms)
        <div>
          {renderMetricValue(channel.metrics[0], borderColor)}
        </div>
      ) : (
        // Always 3-column grid layout
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {channel.metrics.map((metric, idx) => {
            if (metric.special === 'platforms') {
              // Special handling for platforms - takes 2 columns
              return (
                <div key={idx} className="md:col-span-2">
                  {renderMetricValue(metric, borderColor)}
                </div>
              );
            }
            
            return (
              <div key={idx}>
                {renderMetricValue(metric, borderColor)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

