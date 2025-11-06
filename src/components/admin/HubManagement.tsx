/**
 * HubManagement Component
 * 
 * Admin page for managing hubs
 */

import React, { useState } from 'react';
import { useHubs } from '@/hooks/useHubs';
import { Hub } from '@/integrations/mongodb/hubSchema';
import { hubsApi } from '@/api/hubs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { HubForm } from './HubForm';
import { HubPublicationsManager } from './HubPublicationsManager';
import { Plus, Pencil, Trash2, Eye, Building2, Newspaper } from 'lucide-react';
import { toast } from 'sonner';

export const HubManagement: React.FC = () => {
  const { hubs, loading, error, refetch } = useHubs({ includeInactive: true });
  const [selectedHub, setSelectedHub] = useState<Hub | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hubToDelete, setHubToDelete] = useState<Hub | null>(null);
  const [showAssignPublications, setShowAssignPublications] = useState(false);
  const [hubForAssignment, setHubForAssignment] = useState<Hub | null>(null);

  const handleCreate = () => {
    setSelectedHub(null);
    setShowForm(true);
  };

  const handleEdit = (hub: Hub) => {
    setSelectedHub(hub);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!hubToDelete) return;

    try {
      await hubsApi.delete(hubToDelete._id as string);
      toast.success('Hub archived successfully');
      refetch();
      setShowDeleteDialog(false);
      setHubToDelete(null);
    } catch (error) {
      console.error('Error deleting hub:', error);
      toast.error('Failed to archive hub');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedHub(null);
    refetch();
  };

  const handleAssignPublications = (hub: Hub) => {
    setHubForAssignment(hub);
    setShowAssignPublications(true);
  };

  const handleAssignmentUpdate = () => {
    refetch();
    setShowAssignPublications(false);
    setHubForAssignment(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'archived':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading hubs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading hubs</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={refetch} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Hub Management
              </CardTitle>
              <CardDescription>
                Manage regional hubs and their configurations
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Hub
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {hubs.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No hubs yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first hub to get started
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Hub
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hub</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Publications</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hubs.map((hub) => (
                  <TableRow key={hub._id as string}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                          style={{ backgroundColor: hub.branding?.primaryColor || '#0066cc' }}
                        >
                          {hub.basicInfo.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{hub.basicInfo.name}</div>
                          {hub.basicInfo.tagline && (
                            <div className="text-sm text-muted-foreground">
                              {hub.basicInfo.tagline}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {hub.hubId}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(hub.status)}>
                        {hub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {hub.geography?.primaryCity || hub.geography?.region || '-'}
                    </TableCell>
                    <TableCell>
                      <HubPublicationCount hubId={hub.hubId} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleAssignPublications(hub)}
                          title="Assign Publications"
                        >
                          <Newspaper className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(hub)}
                          title="Edit Hub"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setHubToDelete(hub);
                            setShowDeleteDialog(true);
                          }}
                          title="Archive Hub"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedHub ? 'Edit Hub' : 'Create New Hub'}
            </DialogTitle>
            <DialogDescription>
              {selectedHub
                ? 'Update hub information and settings'
                : 'Create a new regional hub for organizing publications'}
            </DialogDescription>
          </DialogHeader>
          <HubForm
            hub={selectedHub}
            onSuccess={handleFormSuccess}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Hub?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive "{hubToDelete?.basicInfo.name}" and set its status to archived.
              Publications will remain assigned but the hub will no longer appear as active.
              This action can be reversed by editing the hub status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Archive Hub
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Publication Assignment Dialog */}
      <Dialog open={showAssignPublications} onOpenChange={setShowAssignPublications}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Assign Publications to {hubForAssignment?.basicInfo.name}
            </DialogTitle>
            <DialogDescription>
              Select publications to add or remove from this hub. Publications can belong to multiple hubs.
            </DialogDescription>
          </DialogHeader>
          {hubForAssignment && (
            <HubPublicationsManager 
              hub={hubForAssignment} 
              onUpdate={handleAssignmentUpdate}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper component to show publication count
const HubPublicationCount: React.FC<{ hubId: string }> = ({ hubId }) => {
  const [count, setCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    hubsApi.getStats(hubId).then(stats => {
      setCount(stats.publicationCount);
    }).catch(() => {
      setCount(0);
    });
  }, [hubId]);

  if (count === null) {
    return <span className="text-muted-foreground">-</span>;
  }

  return <span>{count}</span>;
};

