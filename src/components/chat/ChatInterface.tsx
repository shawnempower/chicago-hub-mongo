import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Heart, Trash2, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedOutlets } from "@/hooks/useSavedOutlets";
import { useThreadMessages, ThreadMessage } from "@/hooks/useThreadMessages";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PackageRecommendationCard } from "@/components/PackageRecommendationCard";
import { AdminHandoffButton } from "@/components/AdminHandoffButton";

interface ChatInterfaceProps {
  threadId: string | null;
  onViewPackage?: (packageId: number) => void;
}

const responseOptions = [
  "I'm new to Chicago media",
  "Looking for specific communities", 
  "Need help with my campaign strategy",
  "Want to explore my options"
];

export function ChatInterface({ threadId, onViewPackage }: ChatInterfaceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { savedOutlets, toggleSaveOutlet, isSaved } = useSavedOutlets();
  const { 
    messages, 
    addMessage, 
    clearMessages, 
    loading, 
    brandContext, 
    hasBrandContext, 
    getConversationHistory 
  } = useThreadMessages(threadId);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const validateInput = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (trimmed.length > 500) {
      toast({
        title: "Input too long",
        description: "Please limit your message to 500 characters",
        variant: "destructive"
      });
      return null;
    }
    return trimmed.replace(/[<>'"]/g, '');
  };

  const detectTriggerKeywords = (text: string): string[] => {
    const keywords = [
      'enterprise', 'large budget', 'custom', 'complex', 'consultation',
      'expert', 'specialist', 'meeting', 'call', 'discuss', 'budget over',
      'multi-market', 'campaign manager', 'dedicated', 'strategy'
    ];
    
    return keywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  const calculateConversationScore = (userMessage: string, history: any[]): number => {
    let score = 0;
    
    if (/(\$\d+k|\$\d+,\d+|\d+k budget|large budget)/i.test(userMessage)) score += 3;
    if (/enterprise|corporation|organization|company size/i.test(userMessage)) score += 2;
    if (/urgent|asap|quickly|soon|deadline/i.test(userMessage)) score += 2;
    score += Math.min(history.length * 0.5, 3);
    
    return score;
  };

  const getAssistantResponse = async (userMessage: string): Promise<ThreadMessage> => {
    setIsTyping(true);
    
    try {
      const conversationHistory = getConversationHistory();
      
      const response = await supabase.functions.invoke('ai-assistant', {
        body: {
          prompt: userMessage,
          brandContext: brandContext || undefined,
          userId: user?.id,
          conversationHistory
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get AI response');
      }

      const { response: aiResponse, packages, outlets } = response.data;
      const triggerKeywords = detectTriggerKeywords(userMessage);
      const conversationScore = calculateConversationScore(userMessage, conversationHistory);

      let messageType: 'assistant' | 'packages' | 'outlets' = 'assistant';
      if (packages && packages.length > 0) {
        messageType = 'packages';
      } else if (outlets && outlets.length > 0) {
        messageType = 'outlets';
      }

      return {
        id: Date.now().toString(),
        type: messageType,
        content: aiResponse,
        packages: packages && packages.length > 0 ? packages : undefined,
        outlets: outlets && outlets.length > 0 ? outlets : undefined,
        timestamp: new Date(),
        hasBrandContext: !!brandContext,
        conversationScore,
        triggerKeywords
      };
    } catch (error) {
      console.error('Error getting AI response:', error);
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment, or feel free to browse our curated packages in the meantime.",
        timestamp: new Date(),
        hasBrandContext: !!brandContext
      };
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    const validatedInput = validateInput(inputValue);
    if (!validatedInput) return;

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to chat with the assistant",
        variant: "destructive"
      });
      return;
    }

    if (!threadId) {
      toast({
        title: "No Conversation Selected",
        description: "Please select or create a conversation to start chatting",
        variant: "destructive"
      });
      return;
    }

    const userMessage: ThreadMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: validatedInput,
      timestamp: new Date()
    };

    await addMessage(userMessage);
    
    const assistantResponse = await getAssistantResponse(validatedInput);
    await addMessage(assistantResponse);
    
    setInputValue("");
  };

  const handleOptionClick = async (option: string) => {
    if (!user || !threadId) {
      toast({
        title: "Authentication Required", 
        description: "Please sign in to chat with the assistant",
        variant: "destructive"
      });
      return;
    }

    const userMessage: ThreadMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: option,
      timestamp: new Date()
    };

    await addMessage(userMessage);
    
    const assistantResponse = await getAssistantResponse(option);
    await addMessage(assistantResponse);
  };

  if (!threadId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-4">
          <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground/50" />
          <div>
            <h3 className="text-lg font-semibold text-muted-foreground">No Conversation Selected</h3>
            <p className="text-sm text-muted-foreground">
              Choose a conversation from the sidebar or create a new one to start chatting with Lassie.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
          <h2 className="text-lg font-semibold text-primary font-serif">
            Lassie - Your Media Assistant
          </h2>
          {hasBrandContext && (
            <div className="flex items-center space-x-1 text-xs bg-accent/10 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              <span className="text-accent-foreground">Brand-Aware</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {user && (
            <>
              <AdminHandoffButton 
                conversationContext={messages.map(m => `${m.type}: ${m.content}`).join('\n')}
                triggerKeywords={messages.flatMap(m => m.triggerKeywords || [])}
              />
              <Button variant="ghost" size="icon" onClick={clearMessages} title="Clear conversation">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex space-x-3">
                <div className="w-8 h-8 bg-muted animate-pulse rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id}>
              {message.type === 'assistant' && (
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center text-white text-sm font-medium">
                      L
                    </div>
                    {message.hasBrandContext && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border border-background"></div>
                    )}
                  </div>
                  <div className="bg-muted rounded-lg p-4 max-w-[80%]">
                    <p className="text-muted-foreground">{message.content}</p>
                    {message.hasBrandContext && (
                      <div className="mt-2 text-xs text-accent-foreground/70 flex items-center space-x-1">
                        <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                        <span>Personalized based on your brand profile</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {message.type === 'user' && (
                <div className="flex items-start space-x-3 justify-end">
                  <div className="bg-primary rounded-lg p-4 max-w-[80%]">
                    <p className="text-primary-foreground">{message.content}</p>
                  </div>
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-accent-foreground text-xs font-medium">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </div>
              )}

              {message.type === 'packages' && message.packages && (
                <div className="ml-11 space-y-4">
                  {message.packages.map((packageRec, index) => (
                    <PackageRecommendationCard
                      key={`${packageRec.id}-${index}`}
                      recommendation={packageRec}
                      onViewPackage={onViewPackage}
                    />
                  ))}
                </div>
              )}

              {message.type === 'outlets' && message.outlets && (
                <div className="ml-11 space-y-4">
                  {message.outlets.map((outlet) => (
                    <div key={outlet.id} className="outlet-card p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                            {outlet.type}
                          </p>
                          <h3 className="text-lg font-semibold text-primary font-serif">
                            {outlet.name}
                          </h3>
                          <p className="text-accent italic">"{outlet.tagline}"</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleSaveOutlet(outlet.id)}
                          className="shrink-0"
                        >
                          <Heart 
                            className={`h-5 w-5 ${
                              isSaved(outlet.id) 
                                ? 'fill-accent text-accent' 
                                : 'text-muted-foreground'
                            }`} 
                          />
                        </Button>
                      </div>
                      <p className="text-muted-foreground mb-4">{outlet.description}</p>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">Learn More</Button>
                        <Button
                          size="sm"
                          variant={isSaved(outlet.id) ? "default" : "ghost"}
                          onClick={() => toggleSaveOutlet(outlet.id)}
                        >
                          {isSaved(outlet.id) ? "Saved ♡" : "Save ♡"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {isTyping && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center text-white text-sm font-medium">
              L
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick response options */}
      {messages.length === 1 && user && threadId && (
        <div className="px-6 pb-4">
          <div className="flex flex-wrap gap-2">
            {responseOptions.map((option) => (
              <Button
                key={option}
                variant="outline"
                size="sm"
                onClick={() => handleOptionClick(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Authentication prompt */}
      {!user && (
        <div className="px-6 pb-4">
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-muted-foreground mb-2">
              Please sign in to start chatting with Lassie and save your favorite outlets.
            </p>
            <Button variant="outline">
              Sign In
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-4 shrink-0">
        <div className="flex space-x-3">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={threadId ? "Type your message..." : "Select a conversation to start chatting"}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
            disabled={!threadId}
          />
          <Button onClick={handleSendMessage} disabled={!inputValue.trim() || !threadId}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}