-- Extend media_outlets table with rich profile fields
ALTER TABLE public.media_outlets 
ADD COLUMN founding_year INTEGER,
ADD COLUMN publication_frequency TEXT,
ADD COLUMN staff_count INTEGER,
ADD COLUMN monthly_visitors INTEGER,
ADD COLUMN email_subscribers INTEGER,
ADD COLUMN open_rate DECIMAL(5,2),
ADD COLUMN primary_market TEXT,
ADD COLUMN secondary_markets JSONB DEFAULT '[]'::jsonb,
ADD COLUMN demographics JSONB DEFAULT '{}'::jsonb,
ADD COLUMN editorial_focus JSONB DEFAULT '[]'::jsonb,
ADD COLUMN competitive_advantages TEXT,
ADD COLUMN business_model TEXT,
ADD COLUMN ownership_type TEXT,
ADD COLUMN awards JSONB DEFAULT '[]'::jsonb,
ADD COLUMN key_personnel JSONB DEFAULT '[]'::jsonb,
ADD COLUMN technical_specs JSONB DEFAULT '{}'::jsonb;

-- Create advertising inventory table
CREATE TABLE public.advertising_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_outlet_id UUID NOT NULL REFERENCES public.media_outlets(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  package_type TEXT NOT NULL,
  placement_options JSONB DEFAULT '[]'::jsonb,
  pricing_tiers JSONB DEFAULT '[]'::jsonb,
  technical_requirements JSONB DEFAULT '{}'::jsonb,
  file_requirements JSONB DEFAULT '{}'::jsonb,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  availability_schedule TEXT,
  min_commitment TEXT,
  max_commitment TEXT,
  lead_time TEXT,
  cancellation_policy TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on advertising inventory
ALTER TABLE public.advertising_inventory ENABLE ROW LEVEL SECURITY;

-- Create policies for advertising inventory (admin-only access)
CREATE POLICY "Advertising inventory is publicly readable" 
ON public.advertising_inventory 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage advertising inventory" 
ON public.advertising_inventory 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.is_admin = true
));

-- Add trigger for automatic timestamp updates on advertising inventory
CREATE TRIGGER update_advertising_inventory_updated_at
BEFORE UPDATE ON public.advertising_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();