import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, User, Package, Building2, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedPackages } from "@/hooks/useSavedPackages";
import { useSavedOutlets } from "@/hooks/useSavedOutlets";
import { useAssistantConversation } from "@/hooks/useAssistantConversation";
import { supabase } from "@/integrations/supabase/client";

interface QuickStartChecklistProps {
  profileCompletion: number;
}

export function QuickStartChecklist({ profileCompletion }: QuickStartChecklistProps) {
  const { user } = useAuth();
  const { savedPackages } = useSavedPackages();
  const { savedOutlets } = useSavedOutlets();
  const { messages } = useAssistantConversation();
  const [hasDocuments, setHasDocuments] = useState(false);

  useEffect(() => {
    checkDocuments();
  }, [user]);

  const checkDocuments = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('brand_documents')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      
      setHasDocuments((data?.length || 0) > 0);
    } catch (error) {
      console.error('Error checking documents:', error);
    }
  };

  const tasks = [
    {
      id: 'profile',
      title: 'Complete Your Profile',
      description: 'Add your company info and marketing goals',
      completed: profileCompletion >= 80,
      icon: User,
      action: 'Go to Profile',
      link: '/dashboard?tab=profile'
    },
    {
      id: 'documents',
      title: 'Upload Brand Materials',
      description: 'Add logos, brand guidelines, or examples',
      completed: hasDocuments,
      icon: Circle,
      action: 'Upload Documents',
      link: '/dashboard?tab=profile'
    },
    {
      id: 'packages',
      title: 'Explore Ad Packages',
      description: 'Browse and save packages that interest you',
      completed: savedPackages.length > 0,
      icon: Package,
      action: 'Browse Packages',
      link: '/packages'
    },
    {
      id: 'outlets',
      title: 'Find Media Partners',
      description: 'Discover and save relevant media outlets',
      completed: savedOutlets.size > 0,
      icon: Building2,
      action: 'Explore Partners',
      link: '/partners'
    },
    {
      id: 'assistant',
      title: 'Try the AI Assistant',
      description: 'Get personalized recommendations',
      completed: messages.length > 1,
      icon: MessageCircle,
      action: 'Ask Assistant',
      link: '#'
    }
  ];

  const completedTasks = tasks.filter(task => task.completed).length;
  const completionPercentage = (completedTasks / tasks.length) * 100;

  if (completedTasks === tasks.length) {
    return (
      <Card className="outlet-card border-success/20 bg-success/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            Quick Start Complete!
          </CardTitle>
          <CardDescription>
            Great job! You've completed all the recommended first steps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You're all set to make the most of Chicago Media Hub. Keep exploring packages and connecting with partners!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="outlet-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" />
          Quick Start Checklist
        </CardTitle>
        <CardDescription>
          Complete these steps to get the most out of your experience
        </CardDescription>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{completedTasks} of {tasks.length} completed</span>
          <span>({Math.round(completionPercentage)}%)</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => {
          const Icon = task.icon;
          return (
            <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0">
                {task.completed ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${task.completed ? 'text-success' : 'text-foreground'}`}>
                  {task.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {task.description}
                </p>
              </div>
              {!task.completed && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild
                  className="flex-shrink-0"
                >
                  {task.link === '#' ? (
                    <button onClick={() => {
                      // Trigger assistant modal
                      const event = new CustomEvent('openAssistant');
                      window.dispatchEvent(event);
                    }}>
                      {task.action}
                    </button>
                  ) : (
                    <Link to={task.link}>
                      {task.action}
                    </Link>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}