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
        className="flex items-center gap-3 rounded-md px-2 py-1.5 -ml-2 transition-colors hover:bg-[#EDEAE1]"
      >
        {/* Icon Container with Light Orange Background */}
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-50">
          <RootIcon className="w-4 h-4 text-orange-600" strokeWidth={2} />
        </div>
        {/* Root Label */}
        <span className="font-medium text-gray-700">{rootLabel}</span>
      </button>

      {/* Chevron Separator */}
      <ChevronRight className="w-4 h-4 text-gray-400" strokeWidth={1.5} />

      {/* Current Page Breadcrumb - Non-clickable, no icon */}
      <span className="font-medium text-gray-900">{currentLabel}</span>
    </div>
  );
};
