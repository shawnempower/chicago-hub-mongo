import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, User, Mail, Phone, Building, Target, Calendar, DollarSign, Users, FileText } from 'lucide-react';
import type { Lead } from '@/api/leads';

interface LeadConversationModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

export const LeadConversationModal = ({ lead, isOpen, onClose }: LeadConversationModalProps) => {
  const rawFormData = lead.conversationContext?.rawFormData;
  const conversationSummary = rawFormData?.conversationSummary || lead.message || '';
  const proposalSummary = rawFormData?.proposalSummary;
  const contactInfo = rawFormData?.contactInfo;
  const campaignDetails = rawFormData?.campaignDetails;

  // Parse conversation summary (pipe-separated responses)
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

        <ScrollArea className="h-[calc(85vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Conversation Flow */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Conversation Flow
              </h3>
              <div className="space-y-2">
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
            </div>

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
      </DialogContent>
    </Dialog>
  );
};
