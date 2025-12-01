/**
 * Inventory Chat Interface
 * 
 * Main chat UI for exploring hub inventory through AI conversation
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Bot, User } from 'lucide-react';
import { sendMessage, getConversation } from '@/api/inventoryChat';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { MarkdownMessage } from './MarkdownMessage';

interface InventoryChatInterfaceProps {
  conversationId: string | null;
  onConversationUpdate?: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const InventoryChatInterface: React.FC<InventoryChatInterfaceProps> = ({
  conversationId,
  onConversationUpdate,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation messages when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const conversation = await getConversation(conversationId);
        setMessages(conversation.messages || []);
      } catch (error) {
        console.error('Error loading messages:', error);
        toast({
          title: 'Error',
          description: 'Failed to load conversation messages',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [conversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!conversationId || !inputValue.trim() || isLoading) {
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message optimistically
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const response = await sendMessage(conversationId, userMessage);
      
      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Notify parent to refresh conversation list
      onConversationUpdate?.();
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Remove optimistic user message on error
      setMessages(prev => prev.filter(m => m !== newUserMessage));
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center p-8 font-sans">
        <div className="max-w-md text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold text-foreground font-sans">Welcome to Inventory Assistant</h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-sans">
              Ask me anything about your publication inventory. I can help you explore channels, 
              compare audience reach, analyze pricing, and discover advertising opportunities.
            </p>
          </div>
          <div className="pt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground tracking-wide font-sans">try asking</p>
            <div className="flex flex-col items-center space-y-2">
              {[
                "What publications do we have?",
                "Show me newsletter subscriber counts",
                "Compare print vs digital reach"
              ].map((example, i) => (
                <div key={i} className="text-sm text-center px-4 py-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border/50 font-sans">
                  "{example}"
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col font-sans relative">
      {/* Messages Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4 pt-16 pb-24" ref={scrollAreaRef}>
          <div className="space-y-4">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground font-sans">
                <p className="text-sm font-sans">
                  Ask me anything about your hub's publication inventory!
                </p>
                <p className="text-xs mt-2 font-sans">
                  Examples: "What publications do we have?", "Show me audience demographics", "Compare print vs digital reach"
                </p>
              </div>
            ) : null}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' ? (
                  <div className="max-w-[80%] font-sans">
                    <MarkdownMessage content={message.content} className="text-sm font-sans text-black" />
                  </div>
                ) : (
                  <div className="max-w-[80%] rounded-lg p-3 font-sans bg-gray-100">
                    <div className="text-sm whitespace-pre-wrap break-words font-sans text-black">
                      {message.content}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="font-sans text-black">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* Floating Input Area */}
        <div className="absolute bottom-4 left-8 right-8 z-10">
          <div className="relative max-w-4xl mx-auto">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your inventory... (Shift+Enter for new line)"
              className="min-h-[60px] max-h-[200px] resize-none font-sans pl-6 pr-16 py-5 shadow-lg bg-white/95 backdrop-blur-sm border-gray-300 rounded-full"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

