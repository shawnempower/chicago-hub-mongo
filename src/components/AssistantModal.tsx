import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Heart, Trash2 } from "lucide-react";
import { usePublicationsAsMediaEntities } from "@/hooks/usePublications";
import { useAuth } from "@/contexts/CustomAuthContext";
import { useSavedOutlets } from "@/hooks/useSavedOutlets";
import { useAssistantConversation } from "@/hooks/useAssistantConversation";
import { useToast } from "@/hooks/use-toast";
import { generateBrandContextSummary } from "@/utils/documentUtils";
import { supabase } from "@/integrations/supabase/client";
import { PackageRecommendationCard } from "@/components/PackageRecommendationCard";
import { MultipleChoiceButtons } from "@/components/MultipleChoiceButtons";


interface Message {
  id: string;
  type: 'user' | 'assistant' | 'outlets' | 'packages';
  content: string;
  outlets?: MediaPartner[];
  packages?: any[];
  timestamp: Date;
  hasBrandContext?: boolean;
  conversationScore?: number;
  triggerKeywords?: string[];
}

interface AssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewPackage?: (packageId: number) => void;
}

const responseOptions = [
  "I'm new to Chicago media",
  "Looking for specific communities", 
  "Need help with my campaign strategy",
  "Want to explore my options"
];

export function AssistantModal({ isOpen, onClose, onViewPackage }: AssistantModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { savedOutlets, toggleSaveOutlet, isSaved } = useSavedOutlets();
  const { messages, addMessage, clearConversation, loading, brandContext, hasBrandContext, getConversationHistory } = useAssistantConversation();
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
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
    // Basic sanitization - remove potentially harmful characters
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
    
    // Budget mentions increase score
    if (/(\$\d+k|\$\d+,\d+|\d+k budget|large budget)/i.test(userMessage)) score += 3;
    
    // Enterprise keywords
    if (/enterprise|corporation|organization|company size/i.test(userMessage)) score += 2;
    
    // Urgency indicators
    if (/urgent|asap|quickly|soon|deadline/i.test(userMessage)) score += 2;
    
    // Multiple message exchanges
    score += Math.min(history.length * 0.5, 3);
    
    return score;
  };

  const getAssistantResponse = async (userMessage: string): Promise<Message> => {
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
      // Fallback to a generic error message
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

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: validatedInput,
      timestamp: new Date()
    };

    await addMessage(userMessage);
    
    // Get assistant response
    const assistantResponse = await getAssistantResponse(validatedInput);
    await addMessage(assistantResponse);
    
    setInputValue("");
  };

  const handleOptionClick = async (option: string) => {
    if (!user) {
      toast({
        title: "Authentication Required", 
        description: "Please sign in to chat with the assistant",
        variant: "destructive"
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: option,
      timestamp: new Date()
    };

    await addMessage(userMessage);
    
    // Get assistant response
    const assistantResponse = await getAssistantResponse(option);
    await addMessage(assistantResponse);
  };

  const handleMultipleChoiceSelect = async (option: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to chat with the assistant",
        variant: "destructive"
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: option,
      timestamp: new Date()
    };

    await addMessage(userMessage);
    
    const assistantResponse = await getAssistantResponse(option);
    await addMessage(assistantResponse);
    setShowOtherInput(false);
  };

  const handleOtherOptionSelect = () => {
    setShowOtherInput(true);
  };
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content w-[90vw] max-w-4xl h-[80vh] mx-auto mt-[10vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
            <h2 className="text-xl font-semibold text-primary font-serif">
              Lassie - Your Media Assistant
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {user && (
              <Button variant="ghost" size="icon" onClick={clearConversation} title="Clear conversation">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message) => (
            <div key={message.id}>
              {message.type === 'assistant' && (
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center text-white text-sm font-medium">
                    L
                  </div>
                  <div className="bg-muted rounded-lg p-4 max-w-[80%]">
                    <p className="text-muted-foreground">{message.content}</p>
                    <MultipleChoiceButtons
                      content={message.content}
                      onOptionSelect={handleMultipleChoiceSelect}
                      onOtherSelect={handleOtherOptionSelect}
                    />
                  </div>
                </div>
              )}

              {message.type === 'user' && (
                <div className="flex items-start space-x-3 justify-end">
                  <div className="bg-accent rounded-lg p-4 max-w-[80%]">
                    <p className="text-accent-foreground">{message.content}</p>
                  </div>
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                    You
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
          ))}

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
        {messages.length === 1 && user && (
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
              <Button asChild variant="outline" onClick={onClose}>
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Input or Other Response */}
        <div className="border-t border-border p-6">
          {showOtherInput ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Please type your response:</p>
              <div className="flex space-x-3">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your custom response..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                      setShowOtherInput(false);
                    }
                  }}
                  className="flex-1"
                  autoFocus
                />
                <Button 
                  onClick={() => {
                    handleSendMessage();
                    setShowOtherInput(false);
                  }} 
                  disabled={!inputValue.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowOtherInput(false);
                    setInputValue("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex space-x-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={!inputValue.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}