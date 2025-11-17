import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { permissionsAPI } from '@/api/permissions';

interface UserInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: 'hub' | 'publication';
  resourceId: string;
  resourceName: string;
  onInviteSent?: () => void;
}

export function UserInviteDialog({
  open,
  onOpenChange,
  resourceType,
  resourceId,
  resourceName,
  onInviteSent,
}: UserInviteDialogProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const result = await permissionsAPI.inviteUser({
      email,
      resourceType,
      resourceId,
      resourceName,
    });

    setLoading(false);

    if (result.success) {
      toast({
        title: 'Invitation Sent',
        description: `An invitation has been sent to ${email}`,
      });
      setEmail('');
      onOpenChange(false);
      onInviteSent?.();
    } else {
      toast({
        title: 'Failed to Send Invitation',
        description: result.error || 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Invite a user to manage <strong>{resourceName}</strong>. They will receive an email with
            instructions to accept the invitation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  handleInvite();
                }
              }}
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">What they'll be able to do:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Manage {resourceType === 'hub' ? 'hub settings and publications' : 'publication details'}</li>
              <li>Invite other team members</li>
              <li>View analytics and insights</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={loading}>
            {loading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

