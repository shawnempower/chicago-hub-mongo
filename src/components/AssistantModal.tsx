import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Heart } from "lucide-react";
import { mediaOutlets } from "@/data/mediaOutlets";

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'outlets';
  content: string;
  outlets?: typeof mediaOutlets;
  timestamp: Date;
}

interface AssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const initialMessage: Message = {
  id: '1',
  type: 'assistant',
  content: "Hi! I'm Lassie, your Chicago media assistant. I help brands discover the perfect combination of Chicago media outlets for their goals. What brings you to Chicago media today?",
  timestamp: new Date()
};

const responseOptions = [
  "I'm new to Chicago media",
  "Looking for specific communities",
  "Need help with my campaign strategy",
  "Want to explore my options"
];

export function AssistantModal({ isOpen, onClose }: AssistantModalProps) {
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [savedOutlets, setSavedOutlets] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSaveOutlet = (outletId: string) => {
    setSavedOutlets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(outletId)) {
        newSet.delete(outletId);
      } else {
        newSet.add(outletId);
      }
      return newSet;
    });
  };

  const simulateAssistantResponse = (userMessage: string) => {
    setIsTyping(true);
    
    setTimeout(() => {
      let response = "";
      let outletsToShow: typeof mediaOutlets | undefined;

      if (userMessage.toLowerCase().includes("hispanic") || userMessage.toLowerCase().includes("latino")) {
        response = "Perfect! For reaching Hispanic families in Chicago, I recommend these trusted community voices:";
        outletsToShow = mediaOutlets.filter(outlet => 
          outlet.id === "la-raza" || outlet.id === "univision-chicago" || outlet.id === "wbez"
        );
      } else if (userMessage.toLowerCase().includes("business") || userMessage.toLowerCase().includes("professional")) {
        response = "Great choice! For connecting with Chicago's business community, these outlets are essential:";
        outletsToShow = mediaOutlets.filter(outlet => 
          outlet.id === "crains" || outlet.id === "chicago-business" || outlet.id === "wbez"
        );
      } else if (userMessage.toLowerCase().includes("families") || userMessage.toLowerCase().includes("parents")) {
        response = "Wonderful! For reaching Chicago families, these media partners understand what matters to parents:";
        outletsToShow = mediaOutlets.filter(outlet => 
          outlet.id === "chicago-parent" || outlet.id === "red-eye" || outlet.id === "wbez"
        );
      } else {
        response = "Based on what you've shared, here are some excellent Chicago media partners that might be perfect for your goals:";
        outletsToShow = mediaOutlets.slice(0, 3);
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };

      const outletsMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'outlets',
        content: "",
        outlets: outletsToShow,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage, outletsMessage]);
      setIsTyping(false);

      // Follow up question
      setTimeout(() => {
        const followUp: Message = {
          id: (Date.now() + 2).toString(),
          type: 'assistant',
          content: "Would you like to explore any of these in detail, or shall we look at other options? I can also help you understand which communities each outlet serves best.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, followUp]);
      }, 1500);
    }, 2000);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    simulateAssistantResponse(inputValue);
    setInputValue("");
  };

  const handleOptionClick = (option: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: option,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    simulateAssistantResponse(option);
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
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
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
                          onClick={() => handleSaveOutlet(outlet.id)}
                          className="shrink-0"
                        >
                          <Heart 
                            className={`h-5 w-5 ${
                              savedOutlets.has(outlet.id) 
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
                          variant={savedOutlets.has(outlet.id) ? "default" : "ghost"}
                          onClick={() => handleSaveOutlet(outlet.id)}
                        >
                          {savedOutlets.has(outlet.id) ? "Saved ♡" : "Save ♡"}
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
        {messages.length === 1 && (
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

        {/* Input */}
        <div className="border-t border-border p-6">
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
        </div>
      </div>
    </div>
  );
}