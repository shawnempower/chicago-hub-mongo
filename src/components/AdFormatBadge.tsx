import React from 'react';
import { 
  NewsletterAdOpportunity, 
  getAdDimensions, 
  getCategoryLabel,
  getDisplayDimensions,
  getAllDimensions
} from '../types/newsletterAdFormat';

interface AdFormatBadgeProps {
  ad: NewsletterAdOpportunity;
  showCategory?: boolean;
  showDimensions?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AdFormatBadge({ 
  ad, 
  showCategory = true, 
  showDimensions = true,
  size = 'md'
}: AdFormatBadgeProps) {
  const { category, dimensions } = getAdDimensions(ad);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm'
  };

  const badgeClass = `inline-flex items-center rounded-full font-medium ${sizeClasses[size]}`;

  // If no format yet (legacy data), show old dimensions
  if (!category) {
    return (
      <span className={`${badgeClass} bg-gray-100 text-gray-800`}>
        {ad.format?.dimensions || 'Not specified'}
      </span>
    );
  }

  const colorClasses = getCategoryColor(category);

  const allDims = dimensions ? getAllDimensions(dimensions) : [];
  const showMultipleBadges = allDims.length > 1 && allDims.length <= 3;

  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      {showCategory && (
        <span className={`${badgeClass} ${colorClasses}`}>
          {getCategoryLabel(category)}
        </span>
      )}
      {showDimensions && dimensions && category !== 'takeover' && (
        <>
          {showMultipleBadges ? (
            // Show individual badges if 2-3 dimensions
            allDims.map(dim => (
              <span key={dim} className={`${badgeClass} bg-gray-100 text-gray-800`}>
                {dim}
              </span>
            ))
          ) : allDims.length > 3 ? (
            // Show count badge if more than 3
            <span className={`${badgeClass} bg-gray-100 text-gray-800`}>
              {allDims.length} sizes
            </span>
          ) : (
            // Show single badge
            <span className={`${badgeClass} bg-gray-100 text-gray-800`}>
              {allDims[0]}
            </span>
          )}
        </>
      )}
    </div>
  );
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    "iab-standard": "bg-blue-100 text-blue-800",
    "email-standard": "bg-green-100 text-green-800",
    "custom-display": "bg-purple-100 text-purple-800",
    "native": "bg-yellow-100 text-yellow-800",
    "responsive": "bg-indigo-100 text-indigo-800",
    "takeover": "bg-red-100 text-red-800"
  };
  return colors[category] || "bg-gray-100 text-gray-800";
}

// Compact version for tables/lists
export function AdFormatBadgeCompact({ ad }: { ad: NewsletterAdOpportunity }) {
  const displayDimensions = getDisplayDimensions(ad);
  const { category } = getAdDimensions(ad);
  
  if (!category) {
    return <span className="text-sm text-gray-600">{displayDimensions}</span>;
  }

  const colorClasses = getCategoryColor(category);
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClasses}`}>
      {displayDimensions}
    </span>
  );
}

