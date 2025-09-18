import { useAssistantConversation } from "@/hooks/useAssistantConversation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Bot, User, Trash2 } from "lucide-react";
import { format } from "date-fns";

export function ConversationHistory() {
  const { messages, clearConversation, loading } = useAssistantConversation();

  // Filter out the initial welcome message for display
  const userMessages = messages.filter(msg => msg.type !== 'assistant' || msg.content !== "Hello! I'm here to help you find the perfect media packages for your campaign. I can recommend packages based on your budget, target audience, and campaign goals. What kind of campaign are you planning?");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title mb-2">Conversation History</h2>
          <p className="body-large">Review your interactions with the AI assistant.</p>
        </div>
        {userMessages.length > 0 && (
          <Button
            onClick={clearConversation}
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear History
          </Button>
        )}
      </div>

      <Card className="outlet-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Messages ({userMessages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userMessages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No conversation history yet</p>
              <p className="text-sm text-muted-foreground">
                Start a conversation with the assistant to see your history here.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {userMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 p-3 rounded-lg ${
                    message.type === 'user' 
                      ? 'bg-primary/5 ml-8' 
                      : 'bg-muted mr-8'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {message.type === 'user' ? (
                      <User className="h-6 w-6 text-primary" />
                    ) : (
                      <Bot className="h-6 w-6 text-accent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {message.type === 'user' ? 'You' : 'Assistant'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(message.timestamp, 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <div className="text-sm break-words">
                      {message.type === 'outlets' ? (
                        <div>
                          <p className="mb-2">{message.content}</p>
                          {message.outlets && message.outlets.length > 0 && (
                            <div className="space-y-1">
                              {message.outlets.map((outlet, index) => (
                                <div key={index} className="text-xs bg-background p-2 rounded border">
                                  <strong>{outlet.name}</strong> - {outlet.type}
                                  <br />
                                  Audience: {outlet.audienceSize.toLocaleString()}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}