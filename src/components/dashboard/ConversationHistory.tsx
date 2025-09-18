import { useConversationThreads } from "@/hooks/useConversationThreads";
import { useThreadMessages } from "@/hooks/useThreadMessages";
import { EmptyStates } from "@/components/EmptyStates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, MessageCircle, Plus, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

export function ConversationHistory() {
  const { threads, loading: threadsLoading, createThread, deleteThread } = useConversationThreads();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  
  const { 
    messages, 
    loading: messagesLoading, 
    clearMessages 
  } = useThreadMessages(selectedThreadId);

  if (threadsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return <EmptyStates.ConversationHistory />;
  }

  const handleCreateThread = async () => {
    const thread = await createThread();
    if (thread) {
      setSelectedThreadId(thread.id);
      setShowCreateForm(false);
      setNewThreadTitle("");
    }
  };

  const handleThreadSelect = (threadId: string) => {
    setSelectedThreadId(selectedThreadId === threadId ? null : threadId);
  };

  const filteredMessages = selectedThreadId ? messages.filter(message => message.id !== 'initial') : [];
  const hasUserMessages = filteredMessages.some(message => message.type === 'user');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Conversation Threads</CardTitle>
              <CardDescription>
                Manage your conversations with Lassie
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Thread
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreateThread}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Chat
            </Button>
          </div>

          {threads.map((thread) => (
            <div key={thread.id} className="border rounded-lg">
              <div 
                className="p-4 cursor-pointer hover:bg-muted/50 flex items-center justify-between"
                onClick={() => handleThreadSelect(thread.id)}
              >
                <div className="flex items-center space-x-3">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium text-sm">{thread.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {thread.message_count} messages • {format(new Date(thread.updated_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteThread(thread.id);
                    }}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <ChevronRight 
                    className={`h-4 w-4 transition-transform ${
                      selectedThreadId === thread.id ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </div>
              
              {selectedThreadId === thread.id && (
                <div className="border-t p-4 bg-muted/20">
                  {messagesLoading ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-muted animate-pulse rounded" />
                      <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                    </div>
                  ) : !hasUserMessages ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No messages in this conversation yet
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">Messages</span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={clearMessages}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      </div>
                      {filteredMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-3 rounded-md text-sm ${
                            message.type === 'user' 
                              ? 'bg-accent/10 ml-4' 
                              : 'bg-background mr-4'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <span className="font-medium text-xs">
                              {message.type === 'user' ? 'You' : 'Lassie'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(message.timestamp, 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <p className="text-sm">{message.content}</p>
                          
                          {/* Display outlets if present */}
                          {message.outlets && message.outlets.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">
                                Recommended Outlets:
                              </p>
                              <div className="space-y-1">
                                {message.outlets.map((outlet, index) => (
                                  <div key={index} className="text-xs bg-muted p-2 rounded border">
                                    <strong>{outlet.name}</strong> - {outlet.type}
                                    <br />
                                    Audience: {outlet.audienceSize?.toLocaleString() || 'N/A'}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Display packages if present */}
                          {message.packages && message.packages.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">
                                Recommended Packages:
                              </p>
                              <div className="space-y-1">
                                {message.packages.map((pkg, index) => (
                                  <div key={index} className="text-xs bg-muted p-2 rounded border">
                                    <strong>{pkg.name}</strong>
                                    <br />
                                    {pkg.description}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}