import { useState, useEffect } from 'react';
import { adminApi } from '@/api/admin';
import type { UserProfile } from '@/types/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/api';
import { Shield } from 'lucide-react';

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());
  const [makingMeAdmin, setMakingMeAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllUsers();
      console.log('📋 Loaded users:', response.users);
      
      // Debug: Check which users are missing userId
      const usersWithoutUserId = response.users.filter(u => !u.userId);
      if (usersWithoutUserId.length > 0) {
        console.warn('⚠️ Users without userId:', usersWithoutUserId);
      }
      
      // Debug: Log user structure for Ron Fields
      const ronFields = response.users.find(u => 
        u.firstName?.toLowerCase().includes('ron') && 
        u.lastName?.toLowerCase().includes('fields')
      );
      if (ronFields) {
        console.log('🔍 Ron Fields data:', {
          userId: ronFields.userId,
          _id: ronFields._id,
          email: ronFields.email,
          firstName: ronFields.firstName,
          lastName: ronFields.lastName,
          isAdmin: ronFields.isAdmin,
          hasUserId: !!ronFields.userId,
          hasId: !!ronFields._id
        });
      }
      
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
    if (!user.userId) {
      console.error('Cannot update admin status: missing userId', user);
      toast({
        title: 'Error',
        description: 'User is missing required user ID.',
        variant: 'destructive',
      });
      return;
    }

    const userId = user.userId;
    const newAdminStatus = !user.isAdmin;

    console.log(`Attempting to ${newAdminStatus ? 'grant' : 'revoke'} admin status for user:`, {
      userId,
      email: user.email,
      currentStatus: user.isAdmin,
      newStatus: newAdminStatus
    });

    try {
      setUpdatingUsers(prev => new Set(prev).add(userId));
      
      const response = await adminApi.updateUserAdminStatus(userId, newAdminStatus);
      console.log('Admin status update response:', response);
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.userId === userId ? { ...u, isAdmin: newAdminStatus } : u
      ));

      toast({
        title: 'Success',
        description: `User ${newAdminStatus ? 'granted' : 'revoked'} admin privileges.`,
      });
    } catch (error: any) {
      console.error('Error updating admin status:', error);
      const errorMessage = error.message || 'Failed to update admin status. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
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

  const makeMeAdmin = async () => {
    try {
      setMakingMeAdmin(true);
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/admin/make-me-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to grant admin privileges');
      }

      const data = await response.json();
      console.log('Make me admin response:', data);

      toast({
        title: 'Success',
        description: 'You have been granted admin privileges! Please refresh the page.',
      });

      // Reload users after a short delay
      setTimeout(() => {
        loadUsers();
      }, 1000);
    } catch (error: any) {
      console.error('Error making yourself admin:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to grant admin privileges.',
        variant: 'destructive',
      });
    } finally {
      setMakingMeAdmin(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  const hasAdmins = users.some(u => u.isAdmin);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">User Management</h2>
        <div className="flex gap-2">
          <Button 
            onClick={makeMeAdmin} 
            variant="outline"
            disabled={makingMeAdmin}
            className="gap-2"
          >
            {makingMeAdmin ? (
              <Spinner size="sm" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            Make Me Admin
          </Button>
          <Button onClick={loadUsers} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {!hasAdmins && users.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                  No Admin Users Found
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  There are currently no admin users in the system. Click the "Make Me Admin" button above to grant yourself admin privileges, 
                  or use the command-line tool: <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">npm run make-admin your@email.com</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user._id?.toString() || user.userId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.companyName || user.email || 'Unknown User'
                    }
                  </CardTitle>
                  {(user.profileCompletionScore || 0) === 0 && (
                    <Badge variant="outline" className="text-xs">
                      No Profile
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {user.isAdmin && (
                    <Badge variant="destructive">Admin</Badge>
                  )}
                  <Button
                    onClick={() => toggleAdminStatus(user)}
                    disabled={!user.userId || updatingUsers.has(user.userId || '')}
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
                {user.email && (
                  <div><strong>Email:</strong> {user.email}</div>
                )}
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
                {user.profileCompletionScore !== undefined && user.profileCompletionScore > 0 && (
                  <div><strong>Profile Completion:</strong> {user.profileCompletionScore}%</div>
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

