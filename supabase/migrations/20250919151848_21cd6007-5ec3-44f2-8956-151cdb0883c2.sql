-- Create assistant_instructions table for managing system instructions
CREATE TABLE public.assistant_instructions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  instructions TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assistant_instructions ENABLE ROW LEVEL SECURITY;

-- Create policies - these instructions should be readable by the edge function
-- but only manageable by authenticated users (for future admin interface)
CREATE POLICY "Instructions are readable by everyone" 
ON public.assistant_instructions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create instructions" 
ON public.assistant_instructions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update instructions" 
ON public.assistant_instructions 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_assistant_instructions_updated_at
BEFORE UPDATE ON public.assistant_instructions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial instruction set (based on current hardcoded instructions)
INSERT INTO public.assistant_instructions (version, instructions, is_active) VALUES (
  'v1.0',
  'You are Lassie, a specialized AI assistant for media buying and public relations. Your role is to help users find the most relevant media packages and outlets for their campaigns based on their brand context, budget, and marketing goals.

Key Guidelines:
- Always be helpful, professional, and concise
- Focus on recommending specific packages that match their needs
- Consider their brand context, budget, timeline, and marketing goals
- Provide clear reasoning for each recommendation
- Ask clarifying questions when needed
- Keep responses focused on media buying and PR recommendations',
  true
);