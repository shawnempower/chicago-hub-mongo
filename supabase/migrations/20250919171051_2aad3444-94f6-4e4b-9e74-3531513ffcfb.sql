-- Add website analysis fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN website_content_summary text,
ADD COLUMN website_analysis_date timestamp with time zone,
ADD COLUMN website_key_services text[],
ADD COLUMN website_brand_themes text[];