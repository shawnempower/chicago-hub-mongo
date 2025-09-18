import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Package, Building2, MessageCircle, FileText, Search, Heart } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondary?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ title, description, icon: Icon, action, secondary }: EmptyStateProps) {
  return (
    <Card className="outlet-card text-center py-8">
      <CardContent className="space-y-4">
        <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">{description}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          {action && (
            action.href ? (
              <Button asChild>
                <Link to={action.href}>{action.label}</Link>
              </Button>
            ) : (
              <Button onClick={action.onClick}>{action.label}</Button>
            )
          )}
          {secondary && (
            secondary.href ? (
              <Button variant="outline" asChild>
                <Link to={secondary.href}>{secondary.label}</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={secondary.onClick}>{secondary.label}</Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Predefined empty states for common scenarios
export const EmptyStates = {
  SavedPackages: () => (
    <EmptyState
      title="No saved packages yet"
      description="Start exploring our curated advertising packages and save the ones that match your goals."
      icon={Package}
      action={{ label: "Browse Packages", href: "/packages" }}
      secondary={{ label: "Get Recommendations", onClick: () => window.dispatchEvent(new CustomEvent('openAssistant')) }}
    />
  ),

  SavedOutlets: () => (
    <EmptyState
      title="No saved media partners yet"
      description="Discover Chicago's top media outlets and save your favorites for easy access."
      icon={Building2}
      action={{ label: "Explore Partners", href: "/partners" }}
      secondary={{ label: "Ask Assistant", onClick: () => window.dispatchEvent(new CustomEvent('openAssistant')) }}
    />
  ),

  ConversationHistory: () => (
    <EmptyState
      title="No conversations yet"
      description="Start chatting with our AI assistant to get personalized media recommendations and expert advice."
      icon={MessageCircle}
      action={{ label: "Start Conversation", onClick: () => window.dispatchEvent(new CustomEvent('openAssistant')) }}
      secondary={{ label: "View Quick Tips", href: "/dashboard?tab=overview" }}
    />
  ),

  BrandDocuments: () => (
    <EmptyState
      title="No brand documents uploaded"
      description="Upload your logos, brand guidelines, or campaign examples to get more personalized recommendations."
      icon={FileText}
      action={{ label: "Upload Documents", href: "/dashboard?tab=profile" }}
    />
  ),

  SearchResults: ({ searchQuery }: { searchQuery?: string }) => (
    <EmptyState
      title="No results found"
      description={searchQuery ? `No packages found matching "${searchQuery}". Try adjusting your search terms or filters.` : "No packages match your current filters. Try broadening your search criteria."}
      icon={Search}
      action={{ label: "Clear Filters", onClick: () => window.location.reload() }}
      secondary={{ label: "Browse All", href: "/packages" }}
    />
  ),

  UserProfile: () => (
    <EmptyState
      title="Complete your profile"
      description="Tell us about your business to unlock personalized recommendations and better AI assistance."
      icon={FileText}
      action={{ label: "Complete Profile", href: "/dashboard?tab=profile" }}
      secondary={{ label: "Skip for Now", href: "/packages" }}
    />
  )
};