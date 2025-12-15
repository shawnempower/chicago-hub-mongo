import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/CustomAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useConfetti } from '@/hooks/useConfetti';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Info } from 'lucide-react';
import { authAPI } from '@/api/auth';
import empowerLogo from '@/assets/empower-logo.png';
import sideloginImage from '@/assets/sidelogin.png';

export default function Auth() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { triggerLoginConfetti } = useConfetti();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });
      // Trigger confetti after successful login
      setTimeout(() => {
        triggerLoginConfetti();
      }, 100);
    }
    
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);

    const result = await authAPI.requestPasswordReset(resetEmail);

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setResetSent(true);
      toast({
        title: "Email Sent!",
        description: "Check your inbox for password reset instructions.",
      });
    }

    setResetLoading(false);
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
    setResetEmail('');
    setResetSent(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12 bg-background relative">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div>
            <img 
              src={empowerLogo} 
              alt="Chicago Media Hub" 
              className="h-8 w-auto"
            />
          </div>

          {/* Sign in heading */}
          <div>
            <h2 className="text-3xl font-sans font-semibold text-foreground" style={{ letterSpacing: '-0.03em' }}>
              Sign in to your account
            </h2>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSignIn} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-white border-[#E7E5DF]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 bg-white border-[#E7E5DF]"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Forgot Password */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-orange-500 hover:text-orange-600 font-semibold hover:underline"
            >
              Forgot password?
            </button>
          </div>

          {/* Horizontal Separator */}
          <div className="border-t" style={{ borderColor: '#E7E5DF' }}></div>

          {/* Info Banner */}
          <div className="rounded-lg p-4 flex items-start gap-3" style={{ backgroundColor: '#F0EEE8' }}>
            <Info className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#6F6D66' }} />
            <p className="text-sm" style={{ color: '#6F6D66' }}>
              Don't have an account? New accounts are created by invitation only. Contact your administrator to get access.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src={sideloginImage}
          alt="Welcome"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <DialogTitle className="font-sans">Reset Password</DialogTitle>
            </div>
            <DialogDescription>
              {resetSent
                ? "We've sent you an email with password reset instructions."
                : "Enter your email address and we'll send you a link to reset your password."}
            </DialogDescription>
          </DialogHeader>

          {!resetSent ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail">Email Address</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseForgotPassword}
                  disabled={resetLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={resetLoading}>
                  {resetLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <Mail className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  If an account exists with <strong>{resetEmail}</strong>, you will receive a password reset email shortly.
                </AlertDescription>
              </Alert>
              <DialogFooter>
                <Button onClick={handleCloseForgotPassword} className="w-full">
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}