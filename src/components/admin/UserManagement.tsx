import { useState, useEffect } from 'react';
import { adminApi } from '@/api/admin';
import type { UserProfile } from '@/types/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllUsers();
      setUsers(response.users);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (user: UserProfile) => {
    if (!user.userId || !user._id) return;

    const userId = user.userId;
    const newAdminStatus = !user.isAdmin;

    try {
      setUpdatingUsers(prev => new Set(prev).add(userId));
      
      await adminApi.updateUserAdminStatus(userId, newAdminStatus);
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.userId === userId ? { ...u, isAdmin: newAdminStatus } : u
      ));

      toast({
        title: 'Success',
        description: `User ${newAdminStatus ? 'granted' : 'revoked'} admin privileges.`,
      });
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update admin status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">User Management</h2>
        <Button onClick={loadUsers} variant="outline">
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user._id?.toString() || user.userId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user.companyName || 'Unknown User'
                  }
                </CardTitle>
                <div className="flex items-center gap-2">
                  {user.isAdmin && (
                    <Badge variant="destructive">Admin</Badge>
                  )}
                  <Button
                    onClick={() => toggleAdminStatus(user)}
                    disabled={!user.userId || updatingUsers.has(user.userId)}
                    variant={user.isAdmin ? "destructive" : "default"}
                    size="sm"
                  >
                    {updatingUsers.has(user.userId || '') ? (
                      <Spinner size="sm" />
                    ) : (
                      user.isAdmin ? 'Remove Admin' : 'Make Admin'
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div><strong>User ID:</strong> {user.userId}</div>
                {user.companyName && (
                  <div><strong>Company:</strong> {user.companyName}</div>
                )}
                {user.industry && (
                  <div><strong>Industry:</strong> {user.industry}</div>
                )}
                {user.role && (
                  <div><strong>Role:</strong> {user.role}</div>
                )}
                <div>
                  <strong>Created:</strong> {' '}
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No users found.
        </div>
      )}
    </div>
  );
}

