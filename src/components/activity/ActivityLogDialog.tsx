/**
 * Activity Log Dialog Component
 * 
 * Large dialog that displays filtered activity logs for a specific section
 * Reuses existing ActivityLog component logic with section-specific filtering
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActivityLog } from '@/components/admin/ActivityLog';

interface ActivityLogDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Name of the section for display in dialog title */
  sectionName: string;
  /** Array of activity types to filter by */
  activityTypes?: string[];
  /** Optional publication ID to filter by */
  publicationId?: string;
  /** Optional hub ID to filter by */
  hubId?: string;
  /** Optional user ID to filter by */
  userId?: string;
}

export function ActivityLogDialog({
  isOpen,
  onClose,
  sectionName,
  activityTypes,
  publicationId,
  hubId,
  userId
}: ActivityLogDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-sans">
            Activity Log
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto -mx-6 px-6">
          <ActivityLog
            publicationId={publicationId}
            hubId={hubId}
            userId={userId}
            showFilters={true}
            hideCard={true}
            // Note: ActivityLog component will need to accept activityTypes prop
            // or we'll need to modify it to support initial filter
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
