import { usePublication } from "@/contexts/PublicationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  Package, 
  Building2, 
  MessageCircle, 
  FileText,
  Settings
} from "lucide-react";
// MongoDB services removed - using API calls instead

export function DashboardOverview() {
  const { selectedPublication } = usePublication();
  const navigate = useNavigate();

  if (!selectedPublication) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No publication selected</p>
      </div>
    );
  }

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