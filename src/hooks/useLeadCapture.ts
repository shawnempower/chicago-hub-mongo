import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
      const { data, error } = await supabase
        .from('lead_inquiries')
        .insert({
          user_id: user.id,
          business_name: leadData.businessName,
          website_url: leadData.websiteUrl,
          contact_name: leadData.contactName,
          contact_email: leadData.contactEmail,
          contact_phone: leadData.contactPhone,
          marketing_goals: leadData.marketingGoals || [],
          budget_range: leadData.budgetRange,
          timeline: leadData.timeline,
          interested_packages: leadData.interestedPackages || [],
          interested_outlets: leadData.interestedOutlets || [],
          conversation_context: leadData.conversationContext || {},
        })
        .select()
        .single();

      if (error) throw error;

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