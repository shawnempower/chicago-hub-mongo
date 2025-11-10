import { useState } from 'react';
import { useAuth } from '@/contexts/CustomAuthContext';
import { useHubContext } from '@/contexts/HubContext';
import { usePublication } from '@/contexts/PublicationContext';
import { leadsApi, type LeadSource } from '@/api/leads';
import { useToast } from '@/hooks/use-toast';

interface LeadData {
  businessName: string;
  websiteUrl?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  marketingGoals?: string[];
  budgetRange?: string;
  timeline?: string;
  interestedPackages?: number[];
  interestedOutlets?: string[];
  conversationContext?: any;
  leadSource?: LeadSource; // Optional - can be overridden
  publicationId?: string; // Optional - can be overridden
}

export const useLeadCapture = () => {
  const { user } = useAuth();
  const { selectedHubId } = useHubContext();
  const { selectedPublication } = usePublication();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const submitLead = async (leadData: LeadData) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to submit your information.",
        variant: "destructive",
      });
      return null;
    }

    if (!selectedHubId) {
      toast({
        title: "Hub Required",
        description: "Please select a hub before submitting.",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      // Create lead with proper tracking
      const lead = await leadsApi.create({
        ...leadData,
        leadSource: leadData.leadSource || 'storefront_form',
        hubId: selectedHubId,
        publicationId: leadData.publicationId || selectedPublication?._id,
        userId: user.id,
      });

      toast({
        title: "Information Submitted",
        description: "Thank you! We'll be in touch soon to discuss your marketing goals.",
      });

      return lead;
    } catch (error) {
      console.error('Error submitting lead:', error);
      toast({
        title: "Submission Error",
        description: "There was an issue submitting your information. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { submitLead, loading };
};