-- Create assistant_conversations table to properly store chat data
CREATE TABLE public.assistant_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_content TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant', 'outlets')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own conversations" 
ON public.assistant_conversations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" 
ON public.assistant_conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create saved_outlets table for proper outlet persistence
CREATE TABLE public.saved_outlets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  outlet_id TEXT NOT NULL,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, outlet_id)
);

-- Enable RLS
ALTER TABLE public.saved_outlets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own saved outlets" 
ON public.saved_outlets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved outlets" 
ON public.saved_outlets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved outlets" 
ON public.saved_outlets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for assistant_conversations updated_at
CREATE TRIGGER update_assistant_conversations_updated_at
BEFORE UPDATE ON public.assistant_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to sanitize user input
CREATE OR REPLACE FUNCTION public.sanitize_input(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- Remove potentially dangerous characters and limit length
  RETURN LEFT(TRIM(REGEXP_REPLACE(input_text, '[<>''"]', '', 'g')), 500);
END;
$$;