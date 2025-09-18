import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedPackages } from "@/hooks/useSavedPackages";
import { useSavedOutlets } from "@/hooks/useSavedOutlets";
import { useAssistantConversation } from "@/hooks/useAssistantConversation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Package, Building2, MessageCircle, TrendingUp, Sparkles } from "lucide-react";
import { WelcomeModal } from "@/components/WelcomeModal";
import { QuickStartChecklist } from "@/components/QuickStartChecklist";
import { EmptyStates } from "@/components/EmptyStates";
import { supabase } from "@/integrations/supabase/client";

export function DashboardOverview() {
  const { user } = useAuth();
  const { savedPackages } = useSavedPackages();
  const { savedOutlets } = useSavedOutlets();
  const { messages } = useAssistantConversation();
  const [showWelcome, setShowWelcome] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);

  useEffect(() => {
    checkIfNewUser();
    loadProfileCompletion();
  }, [user]);

  const checkIfNewUser = async () => {
    if (!user) return;
    
    try {
      // Check if user has any activity
      const hasActivity = savedPackages.length > 0 || savedOutlets.size > 0 || messages.length > 1;
      
      // Check if this is their first visit today
      const lastVisit = localStorage.getItem(`last_visit_${user.id}`);
      const today = new Date().toDateString();
      const isFirstVisitToday = lastVisit !== today;
      
      if (!hasActivity && isFirstVisitToday) {
        setIsNewUser(true);
        setShowWelcome(true);
        localStorage.setItem(`last_visit_${user.id}`, today);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  };

  const loadProfileCompletion = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('profile_completion_score')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setProfileCompletion(data?.profile_completion_score || 0);
    } catch (error) {
      console.error('Error loading profile completion:', error);
    }
  };

  const stats = [
    {
      title: "Saved Packages",
      value: savedPackages.length,
      icon: Package,
      href: "/packages",
      color: "text-accent"
    },
    {
      title: "Saved Outlets",
      value: savedOutlets.size,
      icon: Building2,
      href: "/partners",
      color: "text-success"
    },
    {
      title: "Conversations",
      value: Math.max(0, messages.length - 1), // Exclude initial message
      icon: MessageCircle,
      href: "#",
      color: "text-primary"
    },
    {
      title: "Total Interactions",
      value: savedPackages.length + savedOutlets.size + Math.max(0, messages.length - 1),
      icon: TrendingUp,
      href: "#",
      color: "text-muted-foreground"
    }
  ];

  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'there';
  const shouldShowQuickStart = profileCompletion < 80 || savedPackages.length === 0 || savedOutlets.size === 0;

  return (
    <>
      <WelcomeModal 
        isOpen={showWelcome}
        onClose={() => setShowWelcome(false)}
        userName={firstName}
      />
      
      <div className="space-y-6">
        <div>
          <h2 className="section-title mb-2 flex items-center gap-2">
            Welcome back, {firstName}!
            {isNewUser && <Sparkles className="h-5 w-5 text-primary animate-pulse" />}
          </h2>
          <p className="body-large">
            {isNewUser 
              ? "Let's get you started with personalized media recommendations."
              : "Here's what's happening with your media planning."
            }
          </p>
        </div>

        {shouldShowQuickStart && (
          <QuickStartChecklist profileCompletion={profileCompletion} />
        )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="outlet-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="outlet-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-accent" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start">
              <Link to="/packages">
                Browse Ad Packages
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/partners">
                Explore Media Partners
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="outlet-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {savedPackages.length === 0 && savedOutlets.size === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-3">
                  Start exploring to see your activity here
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button size="sm" asChild>
                    <Link to="/packages">Browse Packages</Link>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.dispatchEvent(new CustomEvent('openAssistant'))}>
                    Get Recommendations
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    You've saved {savedPackages.length} packages and {savedOutlets.size} outlets
                  </p>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/dashboard?tab=saved">View All</Link>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Keep exploring to build your perfect media strategy!
                </p>
                {profileCompletion < 80 && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium text-foreground">
                      💡 Complete your profile to get better recommendations
                    </p>
                    <Button size="sm" variant="link" className="p-0 h-auto" asChild>
                      <Link to="/dashboard?tab=profile">Complete Profile ({profileCompletion}%)</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}