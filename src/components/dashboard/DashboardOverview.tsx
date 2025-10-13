import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/CustomAuthContext";
import { usePublication } from "@/contexts/PublicationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { 
  Package, 
  Building2, 
  MessageCircle, 
  TrendingUp, 
  Globe,
  Mail,
  Newspaper,
  Users,
  Calendar,
  FileText,
  Eye,
  Settings,
  Printer,
  Play
} from "lucide-react";
// MongoDB services removed - using API calls instead

export function DashboardOverview() {
  const { user } = useAuth();
  const { selectedPublication } = usePublication();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPublication) {
      // Simulate data loading when publication changes
      setLoading(true);
      const timer = setTimeout(() => setLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [selectedPublication]);

  if (!selectedPublication) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No publication selected</p>
      </div>
    );
  }

  const publication = selectedPublication;

  // Calculate metrics from publication data
  const calculateNewsletterSubscribers = () => {
    if (!publication.distributionChannels?.newsletters) return 0;
    return publication.distributionChannels.newsletters.reduce((total, newsletter) => 
      total + (newsletter.subscribers || 0), 0);
  };

  const calculateSocialFollowers = () => {
    if (!publication.distributionChannels?.socialMedia) return 0;
    return publication.distributionChannels.socialMedia.reduce((total, profile) => 
      total + (profile.metrics?.followers || 0), 0);
  };

  const calculatePodcastListeners = () => {
    if (!publication.distributionChannels?.podcasts) return 0;
    return publication.distributionChannels.podcasts.reduce((total, podcast) => 
      total + (podcast.averageListeners || 0), 0);
  };

  const calculateStreamingSubscribers = () => {
    if (!publication.distributionChannels?.streamingVideo) return 0;
    return publication.distributionChannels.streamingVideo.reduce((total, stream) => 
      total + (stream.subscribers || 0), 0);
  };

  const stats = [
    {
      title: "Monthly Visitors",
      value: publication.distributionChannels?.website?.metrics?.monthlyVisitors?.toLocaleString() || "-",
      icon: Globe,
      color: "text-blue-500"
    },
    {
      title: "Newsletter Subscribers",
      value: calculateNewsletterSubscribers() > 0 ? calculateNewsletterSubscribers().toLocaleString() : "-",
      icon: Mail,
      color: "text-green-500"
    },
    {
      title: "Social Followers",
      value: calculateSocialFollowers() > 0 ? calculateSocialFollowers().toLocaleString() : "-",
      icon: Users,
      color: "text-pink-500"
    },
    {
      title: "Podcast Listeners",
      value: calculatePodcastListeners() > 0 ? calculatePodcastListeners().toLocaleString() : "-",
      icon: MessageCircle,
      color: "text-orange-500"
    }
  ];

  // Additional stats for streaming and print (if they exist)
  const additionalStats = [];
  
  if (publication.distributionChannels?.print?.circulation) {
    additionalStats.push({
      title: "Print Circulation",
      value: publication.distributionChannels.print.circulation.toLocaleString(),
      icon: Newspaper,
      color: "text-purple-500"
    });
  }

  if (calculateStreamingSubscribers() > 0) {
    additionalStats.push({
      title: "Streaming Subscribers",
      value: calculateStreamingSubscribers().toLocaleString(),
      icon: Play,
      color: "text-red-500"
    });
  }

  const allStats = [...stats, ...additionalStats];

  const recentActivity = [
    { type: "booking", message: "New ad booking for Newsletter Header", time: "2 hours ago" },
    { type: "inquiry", message: "Inquiry for Website Banner placement", time: "5 hours ago" },
    { type: "file", message: "Media kit updated", time: "1 day ago" },
    { type: "payment", message: "Payment received for Print Ad", time: "2 days ago" }
  ];

  const quickActions = [
    { 
      title: "Manage Inventory", 
      description: "Update advertising slots and pricing",
      icon: Package,
      tab: "inventory"
    },
    { 
      title: "Upload Files", 
      description: "Add media kits and resources",
      icon: FileText,
      tab: "knowledgebase"
    },
    { 
      title: "Edit Profile", 
      description: "Update publication information",
      icon: Building2,
      tab: "profile"
    },
    { 
      title: "Settings", 
      description: "Configure publication settings",
      icon: Settings,
      tab: "settings"
    }
  ];

  const handleQuickAction = (tab: string) => {
    navigate(`/dashboard?tab=${tab}`);
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {allStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground font-sans">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <div className="animate-pulse bg-muted h-8 w-16 rounded"></div>
                ) : (
                  stat.value
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-sans text-base">
              <Package className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <Button 
                key={action.title} 
                variant="outline" 
                className="w-full justify-start h-auto p-4"
                onClick={() => handleQuickAction(action.tab)}
              >
                <action.icon className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-sans text-base">
              <MessageCircle className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              View All Activity
            </Button>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}