import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, Search } from "lucide-react";

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
  BrandDocuments: () => (
    <EmptyState
      title="No brand documents uploaded"
      description="Upload your logos, brand guidelines, or campaign examples to help manage your media presence."
      icon={FileText}
      action={{ label: "Upload Documents", href: "/dashboard?tab=profile" }}
    />
  ),

  SearchResults: ({ searchQuery }: { searchQuery?: string }) => (
    <EmptyState
      title="No results found"
      description={searchQuery ? `No items found matching "${searchQuery}". Try adjusting your search terms or filters.` : "No items match your current filters. Try broadening your search criteria."}
      icon={Search}
      action={{ label: "Clear Filters", onClick: () => window.location.reload() }}
    />
  ),

  UserProfile: () => (
    <EmptyState
      title="Complete your profile"
      description="Update your account information to improve your experience."
      icon={FileText}
      action={{ label: "Complete Profile", href: "/profile" }}
    />
  )
};