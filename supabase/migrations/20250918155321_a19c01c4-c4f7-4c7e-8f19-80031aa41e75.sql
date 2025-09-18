-- Add new columns to profiles table for enhanced brand context
ALTER TABLE public.profiles 
ADD COLUMN company_website TEXT,
ADD COLUMN industry TEXT,
ADD COLUMN company_size TEXT,
ADD COLUMN marketing_goals TEXT[],
ADD COLUMN target_audience TEXT,
ADD COLUMN brand_voice TEXT,
ADD COLUMN profile_completion_score INTEGER DEFAULT 0;

-- Create brand_documents table for document management
CREATE TABLE public.brand_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('brand_guidelines', 'marketing_materials', 'previous_campaigns', 'company_info', 'other')),
  file_url TEXT,
  external_url TEXT,
  description TEXT,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT document_source_check CHECK (
    (file_url IS NOT NULL AND external_url IS NULL) OR 
    (file_url IS NULL AND external_url IS NOT NULL)
  )
);

-- Enable RLS on brand_documents table
ALTER TABLE public.brand_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for brand_documents
CREATE POLICY "Users can view their own brand documents" 
ON public.brand_documents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own brand documents" 
ON public.brand_documents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand documents" 
ON public.brand_documents 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand documents" 
ON public.brand_documents 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on brand_documents
CREATE TRIGGER update_brand_documents_updated_at
BEFORE UPDATE ON public.brand_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for brand documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('brand-documents', 'brand-documents', false);

-- Create storage policies for brand documents
CREATE POLICY "Users can view their own brand documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'brand-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own brand documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'brand-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own brand documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'brand-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own brand documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'brand-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create index for better query performance
CREATE INDEX idx_brand_documents_user_id ON public.brand_documents(user_id);
CREATE INDEX idx_brand_documents_type ON public.brand_documents(document_type);