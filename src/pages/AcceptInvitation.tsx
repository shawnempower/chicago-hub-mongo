import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/CustomAuthContext';
import { permissionsAPI } from '@/api/permissions';
import { CheckCircle2, XCircle, Building2, FileText } from 'lucide-react';

export default function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, signIn, signUp, signOut, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Signup form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Signin form state
  const [signInPassword, setSignInPassword] = useState('');
  
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    if (!token) return;

    setLoading(true);
    const result = await permissionsAPI.getInvitation(token);

    if (result.invitation) {
      console.log('📧 [ACCEPT PAGE] Loaded invitation:', {
        email: result.invitation.invitedEmail,
        isExistingUser: result.invitation.isExistingUser,
        resourceType: result.invitation.resourceType,
        resourceName: result.invitation.resourceName
      });
      setInvitation(result.invitation);
    } else {
      setError(result.error || 'Failed to load invitation');
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !invitation) return;
    
    setFormError(null);
    
    // Validation
    if (!firstName || !lastName || !password) {
      setFormError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }
    
    setAccepting(true);
    
    try {
      // Sign up with the invited email
      const signUpResult = await signUp(invitation.invitedEmail, password, firstName, lastName);
      
      if (signUpResult.error) {
        setFormError(signUpResult.error);
        setAccepting(false);
        return;
      }
      
      // Accept the invitation
      const acceptResult = await permissionsAPI.acceptInvitation(token);
      
      if (acceptResult.success) {
        // Refresh user data to get updated permissions
        const refreshResult = await refreshUser();
        if (!refreshResult.success) {
          console.warn('Failed to refresh user after signup:', refreshResult.error);
        }
        
        setSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setFormError(acceptResult.error || 'Failed to accept invitation');
      }
    } catch (err) {
      console.error('Error during signup:', err);
      setFormError('An error occurred during signup');
    }
    
    setAccepting(false);
  };
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !invitation) return;
    
    setFormError(null);
    
    if (!signInPassword) {
      setFormError('Please enter your password');
      return;
    }
    
    setAccepting(true);
    
    try {
      // Sign in with the invited email
      const signInResult = await signIn(invitation.invitedEmail, signInPassword);
      
      if (signInResult.error) {
        setFormError(signInResult.error);
        setAccepting(false);
        return;
      }
      
      // Accept the invitation
      const acceptResult = await permissionsAPI.acceptInvitation(token);
      
      if (acceptResult.success) {
        // Refresh user data to get updated permissions
        const refreshResult = await refreshUser();
        if (!refreshResult.success) {
          console.warn('Failed to refresh user after signin:', refreshResult.error);
        }
        
        setSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setFormError(acceptResult.error || 'Failed to accept invitation');
      }
    } catch (err) {
      console.error('Error during sign in:', err);
      setFormError('An error occurred during sign in');
    }
    
    setAccepting(false);
  };
  
  const handleAcceptExistingUser = async () => {
    if (!token) return;

    setAccepting(true);
    
    try {
      const result = await permissionsAPI.acceptInvitation(token);

      if (result.success) {
        // Refresh user data to get updated permissions
        const refreshResult = await refreshUser();
        if (!refreshResult.success) {
          console.warn('Failed to refresh user after invite acceptance:', refreshResult.error);
        }
        
        setSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError(result.error || 'Failed to accept invitation');
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('An error occurred while accepting the invitation');
    }
    
    setAccepting(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Spinner size="lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-destructive" />
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <CardTitle>Invitation Accepted!</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <AlertDescription>
                You now have access to {invitation?.resourceName}. Redirecting...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    // Show a fallback UI instead of blank screen
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-destructive" />
              <CardTitle>Unable to Load Invitation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                We couldn't load the invitation details. The invitation may have expired or the link may be invalid.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const resourceIcon = invitation.resourceType === 'hub' ? Building2 : FileText;
  const ResourceIcon = resourceIcon;

  // If user is already signed in with the correct email
  if (user && user.email === invitation.invitedEmail) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[60vh] py-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>You've Been Invited!</CardTitle>
            <CardDescription>
              Accept this invitation to gain access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <ResourceIcon className="h-10 w-10 text-primary" />
              <div className="flex-1">
                <p className="font-medium">{invitation.resourceName}</p>
                <p className="text-sm text-muted-foreground">
                  {invitation.resourceType === 'hub' ? 'Hub' : 'Publication'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p>
                <strong>Invited by:</strong> {invitation.invitedByName || 'System Admin'}
              </p>
              <p>
                <strong>Your email:</strong> {invitation.invitedEmail}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleAcceptExistingUser} disabled={accepting} className="flex-1">
              {accepting ? <Spinner size="sm" /> : 'Accept Invitation'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // If user is signed in but with wrong email
  if (user && user.email !== invitation.invitedEmail) {
    const handleSignOut = async () => {
      setLoading(true);
      await signOut();
      // Reload the page to show the signup/signin form
      window.location.reload();
    };
    
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[60vh] py-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Wrong Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                This invitation is for <strong>{invitation.invitedEmail}</strong>, but you're signed in as{' '}
                <strong>{user.email}</strong>. Please sign out and use the correct account.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
              Go Home
            </Button>
            <Button
              onClick={handleSignOut}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Signing Out...' : 'Sign Out & Try Again'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Not signed in - show the appropriate form based on whether user exists
  return (
    <div className="container mx-auto flex items-center justify-center min-h-[60vh] py-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>You've Been Invited!</CardTitle>
          <CardDescription>
            {invitation.isExistingUser 
              ? 'Sign in to accept this invitation'
              : 'Create an account to accept this invitation'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
            <ResourceIcon className="h-10 w-10 text-primary" />
            <div className="flex-1">
              <p className="font-medium">{invitation.resourceName}</p>
              <p className="text-sm text-muted-foreground">
                {invitation.resourceType === 'hub' ? 'Hub' : 'Publication'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Invited by {invitation.invitedByName || 'System Admin'}
              </p>
            </div>
          </div>

          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          {/* Show Sign In form for existing users */}
          {invitation.isExistingUser ? (
            <form onSubmit={handleSignIn} className="space-y-4" autoComplete="off">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  value={invitation.invitedEmail}
                  disabled
                  className="bg-muted"
                  autoComplete="email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  name="current-password"
                  type="password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={accepting}>
                {accepting ? <Spinner size="sm" /> : 'Sign In & Accept'}
              </Button>
            </form>
          ) : (
            /* Show Create Account form for new users */
            <form onSubmit={handleSignUp} className="space-y-4" autoComplete="off">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={invitation.invitedEmail}
                  disabled
                  className="bg-muted"
                  autoComplete="email"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    autoComplete="given-name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={accepting}>
                {accepting ? <Spinner size="sm" /> : 'Create Account & Accept'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

