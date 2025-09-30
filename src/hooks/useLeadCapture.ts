import { useState } from 'react';
import { useAuth } from '@/contexts/CustomAuthContext';
// MongoDB services removed - using API calls instead
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
}

export const useLeadCapture = () => {
  const { user } = useAuth();
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

    setLoading(true);
    try {
      // For now, just simulate success - will be replaced with API call later
      console.log('Lead data submitted:', leadData);
      const data = { success: true };

      toast({
        title: "Information Submitted",
        description: "Thank you! We'll be in touch soon to discuss your marketing goals.",
      });

      return data;
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