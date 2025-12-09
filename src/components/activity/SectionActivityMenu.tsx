/**
 * Section Activity Menu Component
 * 
 * Reusable dropdown menu with "..." button for section-level actions
 * Currently includes Activity Log, designed to be extensible for future actions
 */

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Activity } from 'lucide-react';

interface SectionActivityMenuProps {
  /** Callback when Activity Log is clicked */
  onActivityLogClick: () => void;
  /** Optional additional menu items for future extensibility */
  additionalMenuItems?: Array<{
    label: string;
    icon?: React.ComponentType<any>;
    onClick: () => void;
  }>;
  /** Optional button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function SectionActivityMenu({ 
  onActivityLogClick, 
  additionalMenuItems = [],
  size = 'sm'
}: SectionActivityMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size={size}
          className="gap-2"
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onActivityLogClick}>
          <Activity className="mr-2 h-4 w-4" />
          Activity Log
        </DropdownMenuItem>
        {additionalMenuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={index} onClick={item.onClick}>
              {Icon && <Icon className="mr-2 h-4 w-4" />}
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
