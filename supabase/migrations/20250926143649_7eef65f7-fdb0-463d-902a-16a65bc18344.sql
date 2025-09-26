-- Add admin role to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_admin boolean DEFAULT false;

-- Create media outlets table
CREATE TABLE public.media_outlets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  tagline text,
  description text,
  website_url text,
  contact_email text,
  contact_phone text,
  coverage_area text,
  audience_size text,
  social_media jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create ad packages table
CREATE TABLE public.ad_packages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_id integer, -- for migration from static data
  media_outlet_id uuid REFERENCES public.media_outlets(id),
  name text NOT NULL,
  description text,
  price_range text,
  duration text,
  reach_estimate text,
  format text,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create lead inquiries table
CREATE TABLE public.lead_inquiries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  business_name text NOT NULL,
  website_url text,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  marketing_goals text[],
  budget_range text,
  timeline text,
  interested_packages integer[],
  interested_outlets text[],
  conversation_context jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'closed_won', 'closed_lost')),
  assigned_to uuid REFERENCES auth.users(id),
  notes text,
  follow_up_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.media_outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_inquiries ENABLE ROW LEVEL SECURITY;

-- RLS policies for media_outlets (public read, admin write)
CREATE POLICY "Media outlets are publicly readable" 
ON public.media_outlets 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage media outlets" 
ON public.media_outlets 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- RLS policies for ad_packages (public read, admin write)
CREATE POLICY "Ad packages are publicly readable" 
ON public.ad_packages 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage ad packages" 
ON public.ad_packages 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- RLS policies for lead_inquiries (users can create their own, admins can manage all)
CREATE POLICY "Users can create their own lead inquiries" 
ON public.lead_inquiries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own lead inquiries" 
ON public.lead_inquiries 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can manage all lead inquiries" 
ON public.lead_inquiries 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Add triggers for updated_at columns
CREATE TRIGGER update_media_outlets_updated_at
BEFORE UPDATE ON public.media_outlets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ad_packages_updated_at
BEFORE UPDATE ON public.ad_packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_inquiries_updated_at
BEFORE UPDATE ON public.lead_inquiries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_media_outlets_type ON public.media_outlets(type);
CREATE INDEX idx_ad_packages_outlet ON public.ad_packages(media_outlet_id);
CREATE INDEX idx_lead_inquiries_status ON public.lead_inquiries(status);
CREATE INDEX idx_lead_inquiries_assigned ON public.lead_inquiries(assigned_to);
CREATE INDEX idx_lead_inquiries_user ON public.lead_inquiries(user_id);