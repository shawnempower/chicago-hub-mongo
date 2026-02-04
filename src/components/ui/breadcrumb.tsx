import { ChevronRight, LucideIcon } from 'lucide-react';

interface BreadcrumbProps {
  rootLabel: string;
  rootIcon: LucideIcon;
  currentLabel: string;
  onBackClick: () => void;
}

export const Breadcrumb = ({
  rootLabel,
  rootIcon: RootIcon,
  currentLabel,
  onBackClick,
}: BreadcrumbProps) => {
  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Root Breadcrumb - Clickable with hover state */}
      <button
        onClick={onBackClick}
        className="flex items-center gap-3 rounded-md px-2 py-1.5 -ml-2 transition-colors hover:bg-muted"
      >
        {/* Icon Container - Brand primary */}
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
          <RootIcon className="w-4 h-4 text-primary" strokeWidth={2} />
        </div>
        {/* Root Label */}
        <span className="font-medium text-foreground">{rootLabel}</span>
      </button>

      {/* Chevron Separator */}
      <ChevronRight className="w-4 h-4 text-gray-400" strokeWidth={1.5} />

      {/* Current Page Breadcrumb - Non-clickable, no icon */}
      <span className="font-medium text-foreground">{currentLabel}</span>
    </div>
  );
};
