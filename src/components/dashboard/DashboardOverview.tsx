import { useAuth } from "@/contexts/AuthContext";
import { useSavedPackages } from "@/hooks/useSavedPackages";
import { useSavedOutlets } from "@/hooks/useSavedOutlets";
import { useAssistantConversation } from "@/hooks/useAssistantConversation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Package, Building2, MessageCircle, TrendingUp } from "lucide-react";

export function DashboardOverview() {
  const { user } = useAuth();
  const { savedPackages } = useSavedPackages();
  const { savedOutlets } = useSavedOutlets();
  const { messages } = useAssistantConversation();

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title mb-2">Welcome back, {firstName}!</h2>
        <p className="body-large">Here's what's happening with your media planning.</p>
      </div>

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
              <p className="text-muted-foreground">
                Start exploring packages and outlets to see your activity here.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  You've saved {savedPackages.length} packages and {savedOutlets.size} outlets
                </p>
                <p className="text-sm text-muted-foreground">
                  Keep exploring to build your perfect media strategy!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}