import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, User, Mail, Phone, Building, Target, Calendar, DollarSign, Users, FileText, Bot, Loader2 } from 'lucide-react';
import { leadsApi, type Lead, type Conversation } from '@/api/leads';

interface LeadConversationModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

export const LeadConversationModal = ({ lead, isOpen, onClose }: LeadConversationModalProps) => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Common questions/prompts that might map to responses
  const questionLabels = [
    'Business Type',
    'Company Name',
    'Website',
    'Contact Name & Email',
    'Additional Info',
    'Phone Number',
    'Marketing Goals',
    'Target Audience',
    'Timeline',
    'Budget',
    'Confirmation',
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            AI Chat Conversation History
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat">Full Chat</TabsTrigger>
            <TabsTrigger value="details">Lead Details</TabsTrigger>
          </TabsList>

          {/* Full Chat Tab */}
          <TabsContent value="chat">
            <ScrollArea className="h-[calc(85vh-200px)] pr-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  <span className="ml-2 text-sm text-slate-500">Loading conversation...</span>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-sm text-red-500">{error}</p>
                  <p className="text-xs text-slate-400 mt-2">Showing summary instead</p>
                  {/* Fallback to summary */}
                  <div className="mt-4 space-y-2 text-left">
                    {conversationParts.map((part, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 bg-slate-50 rounded-lg p-3">
                          <p className="text-sm text-slate-700">{part}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : conversation?.messages && conversation.messages.length > 0 ? (
                <div className="space-y-3 py-2">
                  {conversation.messages.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role !== 'user' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}
                      <div 
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'user' 
                            ? 'bg-blue-500 text-white' 
                            : msg.role === 'system'
                            ? 'bg-slate-200 text-slate-600 text-xs italic'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      {msg.role === 'user' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 py-2">
                  <p className="text-sm text-slate-500 text-center mb-4">No full chat history available. Showing summary:</p>
                  {conversationParts.map((part, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 bg-slate-50 rounded-lg p-3">
                        {questionLabels[index] && (
                          <p className="text-xs text-slate-500 mb-1">{questionLabels[index]}</p>
                        )}
                        <p className="text-sm text-slate-700">{part}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details">
            <ScrollArea className="h-[calc(85vh-200px)] pr-4">
              <div className="space-y-6 py-2">

            {/* Contact Information */}
            {contactInfo && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact Information
                </h3>
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  {contactInfo.name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{contactInfo.name}</span>
                    </div>
                  )}
                  {contactInfo.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <span>{contactInfo.email}</span>
                    </div>
                  )}
                  {contactInfo.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-blue-600" />
                      <span>{contactInfo.phone}</span>
                    </div>
                  )}
                  {contactInfo.company && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="h-4 w-4 text-blue-600" />
                      <span>{contactInfo.company}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Campaign Details */}
            {campaignDetails && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Campaign Details
                </h3>
                <div className="bg-green-50 rounded-lg p-4 space-y-3">
                  {campaignDetails.objectives && campaignDetails.objectives.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Objectives</p>
                      <div className="flex flex-wrap gap-2">
                        {campaignDetails.objectives.map((obj: string, i: number) => (
                          <Badge key={i} variant="outline" className="bg-white">
                            {obj}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {campaignDetails.targetAudience && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-green-600" />
                      <span className="text-slate-500">Target:</span>
                      <span className="font-medium">{campaignDetails.targetAudience}</span>
                    </div>
                  )}
                  {campaignDetails.timeline && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <span className="text-slate-500">Timeline:</span>
                      <span className="font-medium">{campaignDetails.timeline}</span>
                    </div>
                  )}
                  {campaignDetails.budget && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-slate-500">Budget:</span>
                      <span className="font-medium">{campaignDetails.budget}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Proposal Summary */}
            {proposalSummary && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Generated Proposal
                </h3>
                <div className="bg-purple-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Proposal ID:</span>
                    <span className="font-mono font-medium">{proposalSummary.proposalId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Date:</span>
                    <span>{proposalSummary.date}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Status:</span>
                    <Badge variant="outline" className="bg-white">{proposalSummary.status}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Valid Until:</span>
                    <span>{proposalSummary.validUntil}</span>
                  </div>
                  {proposalSummary.nextSteps && proposalSummary.nextSteps.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <p className="text-xs text-slate-500 mb-2">Next Steps:</p>
                      <ul className="space-y-1">
                        {proposalSummary.nextSteps.map((step: string, i: number) => (
                          <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                            <span className="text-purple-600">•</span>
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
                  <div className="text-xs text-slate-400 pt-4 border-t">
                    Session ID: {lead.conversationContext.sessionId}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
