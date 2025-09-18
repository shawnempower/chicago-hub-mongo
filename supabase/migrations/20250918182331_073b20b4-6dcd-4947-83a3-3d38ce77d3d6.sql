-- Create conversation threads table
CREATE TABLE public.conversation_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_archived BOOLEAN DEFAULT false,
  message_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.conversation_threads ENABLE ROW LEVEL SECURITY;

-- Create policies for conversation threads
CREATE POLICY "Users can view their own conversation threads" 
ON public.conversation_threads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversation threads" 
ON public.conversation_threads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation threads" 
ON public.conversation_threads 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation threads" 
ON public.conversation_threads 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add foreign key to assistant_conversations table
ALTER TABLE public.assistant_conversations 
ADD COLUMN conversation_thread_id UUID REFERENCES public.conversation_threads(id) ON DELETE CASCADE;

-- Create function to update conversation thread timestamps and message count
CREATE OR REPLACE FUNCTION public.update_conversation_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the conversation thread's updated_at and message_count
  UPDATE public.conversation_threads 
  SET 
    updated_at = now(),
    message_count = (
      SELECT COUNT(*) 
      FROM public.assistant_conversations 
      WHERE conversation_thread_id = NEW.conversation_thread_id
    )
  WHERE id = NEW.conversation_thread_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic thread updates
CREATE TRIGGER update_conversation_thread_on_message
  AFTER INSERT ON public.assistant_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_thread_on_message();

-- Create default conversation thread for existing conversations
-- (This handles migration of existing data)
DO $$
DECLARE
  user_record RECORD;
  default_thread_id UUID;
BEGIN
  -- For each user who has conversations without a thread
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM public.assistant_conversations 
    WHERE conversation_thread_id IS NULL
  LOOP
    -- Create a default thread for this user
    INSERT INTO public.conversation_threads (user_id, title, description, category)
    VALUES (
      user_record.user_id, 
      'General Conversation', 
      'Your main conversation thread',
      'general'
    )
    RETURNING id INTO default_thread_id;
    
    -- Update all existing conversations for this user to use the default thread
    UPDATE public.assistant_conversations 
    SET conversation_thread_id = default_thread_id
    WHERE user_id = user_record.user_id AND conversation_thread_id IS NULL;
  END LOOP;
END $$;