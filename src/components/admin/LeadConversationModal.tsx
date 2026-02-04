import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, User, Mail, Phone, Building, Target, Calendar, DollarSign, Users, FileText, Bot, Loader2, Sparkles } from 'lucide-react';
import { leadsApi, type Lead, type Conversation, type ConversationMessage } from '@/api/leads';
import { format } from 'date-fns';

interface LeadConversationModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

// Chat bubble component for better visual design
const ChatBubble = ({ 
  message, 
  isUser, 
  isSystem,
  showAvatar = true,
  animationDelay = 0 
}: { 
  message: ConversationMessage; 
  isUser: boolean;
  isSystem: boolean;
  showAvatar?: boolean;
  animationDelay?: number;
}) => {
  if (isSystem) {
    return (
      <div 
        className="flex justify-center my-2 animate-fade-in"
        style={{ animationDelay: `${animationDelay}ms` }}
      >
        <div className="bg-slate-100 text-slate-500 text-xs px-3 py-1 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-end gap-2 mb-3 animate-slide-up ${isUser ? 'flex-row-reverse' : ''}`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Avatar */}
      {showAvatar && (
        <div 
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
            isUser 
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
              : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white'
          }`}
        >
          {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </div>
      )}
      {!showAvatar && <div className="w-8" />}
      
      {/* Message bubble */}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div 
          className={`px-4 py-2.5 rounded-2xl shadow-sm ${
            isUser 
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md' 
              : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
        {message.timestamp && (
          <p className={`text-[10px] text-slate-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {format(new Date(message.timestamp), 'h:mm a')}
          </p>
        )}
      </div>
    </div>
  );
};

export const LeadConversationModal = ({ lead, isOpen, onClose }: LeadConversationModalProps) => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const rawFormData = lead.conversationContext?.rawFormData;
  const conversationSummary = rawFormData?.conversationSummary || lead.message || '';
  const proposalSummary = rawFormData?.proposalSummary;
  const contactInfo = rawFormData?.contactInfo;
  const campaignDetails = rawFormData?.campaignDetails;

  // Fetch full conversation when modal opens
  useEffect(() => {
    if (isOpen && lead._id && lead.conversationContext?.sessionId) {
      fetchConversation();
    }
  }, [isOpen, lead._id]);

  const fetchConversation = async () => {
    if (!lead._id) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await leadsApi.getConversation(lead._id);
      setConversation(response.conversation);
    } catch (err) {
      console.error('Error fetching conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  // Parse conversation summary (pipe-separated responses) as fallback
  const conversationParts = conversationSummary
    .split('|')
    .map((part: string) => part.trim())
    .filter((part: string) => part.length > 0);

  // Check if consecutive messages are from same sender (to hide avatar)
  const shouldShowAvatar = (messages: ConversationMessage[], index: number) => {
    if (index === messages.length - 1) return true;
    return messages[index].role !== messages[index + 1].role;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Conversation Replay</p>
                <p className="text-xs text-purple-200 font-normal">{lead.businessName}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-none border-b bg-muted/50">
            <TabsTrigger value="chat" className="data-[state=active]:bg-white rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat Replay
            </TabsTrigger>
            <TabsTrigger value="details" className="data-[state=active]:bg-white rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600">
              <FileText className="h-4 w-4 mr-2" />
              Lead Details
            </TabsTrigger>
          </TabsList>

          {/* Full Chat Tab */}
          <TabsContent value="chat" className="m-0">
            <div 
              ref={scrollRef}
              className="h-[calc(90vh-180px)] overflow-y-auto bg-gradient-to-b from-slate-50 to-slate-100 p-4"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                  </div>
                  <p className="text-sm text-slate-500">Loading conversation...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8 text-red-400" />
                  </div>
                  <p className="text-sm text-red-500 mb-2">{error}</p>
                  <p className="text-xs text-slate-400">Showing summary instead</p>
                  
                  {/* Fallback summary */}
                  <div className="mt-6 w-full space-y-2">
                    {conversationParts.map((part, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 shadow-sm border border-slate-100">
                        <p className="text-sm text-slate-700">{part}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : conversation?.messages && conversation.messages.length > 0 ? (
                <div className="space-y-1">
                  {/* Start of conversation indicator */}
                  <div className="flex justify-center mb-6">
                    <div className="bg-white shadow-sm border border-slate-200 text-slate-500 text-xs px-4 py-2 rounded-full flex items-center gap-2">
                      <Sparkles className="h-3 w-3 text-purple-500" />
                      Conversation started with AI Assistant
                    </div>
                  </div>

                  {conversation.messages
                    .filter(msg => msg.role !== 'system')
                    .map((msg, index, filteredMsgs) => (
                      <ChatBubble
                        key={index}
                        message={msg}
                        isUser={msg.role === 'user'}
                        isSystem={msg.role === 'system'}
                        showAvatar={shouldShowAvatar(filteredMsgs, index)}
                        animationDelay={index * 50}
                      />
                    ))}

                  {/* End of conversation indicator */}
                  <div className="flex justify-center mt-6">
                    <div className="bg-green-50 border border-green-200 text-green-600 text-xs px-4 py-2 rounded-full flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Lead captured successfully
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center mb-4">
                    <div className="bg-amber-50 border border-amber-200 text-amber-600 text-xs px-4 py-2 rounded-full">
                      Full chat history not available
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-500 text-center mb-4">Showing collected responses:</p>
                  {conversationParts.map((part, index) => (
                    <div 
                      key={index} 
                      className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 animate-slide-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-semibold">
                          {index + 1}
                        </div>
                        <span className="text-xs text-slate-400">Response {index + 1}</span>
                      </div>
                      <p className="text-sm text-slate-700">{part}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="m-0">
            <ScrollArea className="h-[calc(90vh-180px)]">
              <div className="p-6 space-y-6">
                {/* Contact Information */}
                {contactInfo && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-3 w-3 text-blue-600" />
                      </div>
                      Contact Information
                    </h3>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 space-y-3 border border-blue-100">
                      {contactInfo.name && (
                        <div className="flex items-center gap-3 text-sm">
                          <User className="h-4 w-4 text-blue-500" />
                          <span className="font-medium text-slate-800">{contactInfo.name}</span>
                        </div>
                      )}
                      {contactInfo.email && (
                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="h-4 w-4 text-blue-500" />
                          <a href={`mailto:${contactInfo.email}`} className="text-blue-600 hover:underline">{contactInfo.email}</a>
                        </div>
                      )}
                      {contactInfo.phone && (
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="h-4 w-4 text-blue-500" />
                          <span>{contactInfo.phone}</span>
                        </div>
                      )}
                      {contactInfo.company && (
                        <div className="flex items-center gap-3 text-sm">
                          <Building className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">{contactInfo.company}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Campaign Details */}
                {campaignDetails && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                        <Target className="h-3 w-3 text-green-600" />
                      </div>
                      Campaign Details
                    </h3>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 space-y-4 border border-green-100">
                      {campaignDetails.objectives && campaignDetails.objectives.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Objectives</p>
                          <div className="flex flex-wrap gap-2">
                            {campaignDetails.objectives.map((obj: string, i: number) => (
                              <Badge key={i} className="bg-white text-green-700 border-green-200 shadow-sm">
                                {obj}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {campaignDetails.targetAudience && (
                        <div className="flex items-center gap-3 text-sm">
                          <Users className="h-4 w-4 text-green-500" />
                          <span className="text-slate-500">Target:</span>
                          <span className="font-medium text-slate-800">{campaignDetails.targetAudience}</span>
                        </div>
                      )}
                      {campaignDetails.timeline && (
                        <div className="flex items-center gap-3 text-sm">
                          <Calendar className="h-4 w-4 text-green-500" />
                          <span className="text-slate-500">Timeline:</span>
                          <span className="font-medium text-slate-800">{campaignDetails.timeline}</span>
                        </div>
                      )}
                      {campaignDetails.budget && (
                        <div className="flex items-center gap-3 text-sm">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <span className="text-slate-500">Budget:</span>
                          <span className="font-semibold text-green-700">{campaignDetails.budget}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Proposal Summary */}
                {proposalSummary && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                        <FileText className="h-3 w-3 text-purple-600" />
                      </div>
                      Generated Proposal
                    </h3>
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 space-y-3 border border-purple-100">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white/60 rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-1">Proposal ID</p>
                          <p className="font-mono font-semibold text-purple-700">{proposalSummary.proposalId}</p>
                        </div>
                        <div className="bg-white/60 rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-1">Date</p>
                          <p className="font-medium">{proposalSummary.date}</p>
                        </div>
                        <div className="bg-white/60 rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-1">Status</p>
                          <Badge className="bg-purple-100 text-purple-700 border-0">{proposalSummary.status}</Badge>
                        </div>
                        <div className="bg-white/60 rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-1">Valid Until</p>
                          <p className="font-medium">{proposalSummary.validUntil}</p>
                        </div>
                      </div>
                      {proposalSummary.nextSteps && proposalSummary.nextSteps.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-purple-200">
                          <p className="text-xs text-slate-500 mb-3 uppercase tracking-wide">Next Steps</p>
                          <ul className="space-y-2">
                            {proposalSummary.nextSteps.map((step: string, i: number) => (
                              <li key={i} className="text-sm text-slate-700 flex items-start gap-3 bg-white/60 rounded-lg p-3">
                                <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                                  {i + 1}
                                </span>
                                {step}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Session Info */}
                {lead.conversationContext?.sessionId && (
                  <div className="text-xs text-slate-400 pt-4 border-t flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                    Session: {lead.conversationContext.sessionId}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Custom animation styles */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { 
            opacity: 0; 
            transform: translateY(10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </Dialog>
  );
};
