-- Fix security issues from the linter

-- 1. Fix function search path for the sanitize_input function
CREATE OR REPLACE FUNCTION public.sanitize_input(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove potentially dangerous characters and limit length
  RETURN LEFT(TRIM(REGEXP_REPLACE(input_text, '[<>''"]', '', 'g')), 500);
END;
$$;