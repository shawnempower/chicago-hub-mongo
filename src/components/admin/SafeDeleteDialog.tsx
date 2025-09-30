import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Users, Trash2, Archive } from 'lucide-react';
import { packagesApi } from '@/api/packages';
import { useToast } from '@/hooks/use-toast';

interface SafeDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  packageId: string;
  packageName: string;
}

interface UsageStats {
  saved_count: number;
  users_with_saves: string[];
}

export function SafeDeleteDialog({ 
  isOpen, 
  onClose, 
  onSuccess, 
  packageId, 
  packageName 
}: SafeDeleteDialogProps) {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cascadeSaves, setCascadeSaves] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && packageId) {
      fetchUsageStats();
    }
  }, [isOpen, packageId]);

  const fetchUsageStats = async () => {
    setLoading(true);
    try {
      // For now, return basic stats - in a real app you'd implement usage tracking
      setUsageStats({ saved_count: 0, users_with_saves: [] });
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      setUsageStats({ saved_count: 0, users_with_saves: [] });
      toast({
        title: "Error",
        description: "Failed to load package usage statistics.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      // Soft delete the package
      await packagesApi.delete(packageId, false);

      toast({
        title: "Package Archived",
        description: "Package has been archived and can be restored later.",
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error archiving package:', error);
      toast({
        title: "Error",
        description: "Failed to archive package. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete the package (permanent or soft based on forceDelete flag)
      await packagesApi.delete(packageId, forceDelete);

      toast({
        title: "Package Deleted",
        description: forceDelete ? "Package has been permanently deleted." : "Package has been archived.",
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deleting package:', error);
      toast({
        title: "Error",
        description: "Failed to delete package. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const hasUsage = usageStats && usageStats.saved_count > 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Package: {packageName}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            {loading ? (
              <div>Loading package usage information...</div>
            ) : (
              <>
                {hasUsage && (
                  <Alert className="border-warning bg-warning/10">
                    <Users className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Warning:</strong> This package has been saved by{' '}
                      <Badge variant="secondary">{usageStats.saved_count}</Badge> user(s):
                      <div className="mt-2 text-sm">
                        {usageStats.users_with_saves.map((user, index) => (
                          <Badge key={index} variant="outline" className="mr-1 mb-1">
                            {user}
                          </Badge>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <p>Choose how to handle this package:</p>
                  
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      onClick={handleArchive}
                      disabled={isArchiving || isDeleting}
                      className="w-full justify-start"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive Package (Recommended)
                    </Button>
                    <p className="text-sm text-muted-foreground pl-6">
                      Safely hide the package while preserving user data. Can be restored later.
                    </p>
                  </div>

                  {hasUsage && (
                    <div className="space-y-2 border-t pt-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="cascade"
                          checked={cascadeSaves}
                          onCheckedChange={(checked) => setCascadeSaves(checked as boolean)}
                        />
                        <label htmlFor="cascade" className="text-sm">
                          Also remove user saved references ({usageStats.saved_count})
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="force"
                          checked={forceDelete}
                          onCheckedChange={(checked) => setForceDelete(checked as boolean)}
                        />
                        <label htmlFor="force" className="text-sm">
                          Force permanent deletion (dangerous)
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isArchiving || isDeleting}>
            Cancel
          </AlertDialogCancel>
          
          {(!hasUsage || forceDelete) && (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isArchiving || isDeleting || loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Permanently Delete'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}