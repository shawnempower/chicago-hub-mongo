import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserCheck, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AdminHandoffButtonProps {
  conversationContext?: string;
  triggerKeywords?: string[];
}

export function AdminHandoffButton({ conversationContext, triggerKeywords = [] }: AdminHandoffButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    budget: '',
    timeline: '',
    specificNeeds: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    
    try {
      // Save the handoff request to the database
      const { error } = await supabase
        .from('user_interactions')
        .insert({
          user_id: user.id,
          interaction_type: 'admin_handoff_request',
          metadata: {
            form_data: formData,
            conversation_context: conversationContext,
            trigger_keywords: triggerKeywords,
            timestamp: new Date().toISOString()
          }
        });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Our team will contact you within 24 hours to discuss your needs.",
      });

      setIsOpen(false);
      setFormData({
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        budget: '',
        timeline: '',
        specificNeeds: ''
      });
    } catch (error) {
      console.error('Error submitting handoff request:', error);
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          Connect with Expert
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Connect with a Media Expert</DialogTitle>
          <DialogDescription>
            Get personalized guidance from our Chicago media specialists. We'll review your conversation and reach out within 24 hours.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Company Name</label>
              <Input
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Your company"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Contact Person</label>
              <Input
                value={formData.contactPerson}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                placeholder="Your name"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="contact@company.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Budget Range</label>
              <Input
                value={formData.budget}
                onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                placeholder="e.g., $5K-15K/month"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Timeline</label>
              <Input
                value={formData.timeline}
                onChange={(e) => setFormData(prev => ({ ...prev, timeline: e.target.value }))}
                placeholder="e.g., Start in 2 weeks"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Specific Needs or Questions</label>
            <Textarea
              value={formData.specificNeeds}
              onChange={(e) => setFormData(prev => ({ ...prev, specificNeeds: e.target.value }))}
              placeholder="Tell us more about your campaign goals, target audience, or any specific requirements..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}