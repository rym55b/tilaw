
-- Add group session columns to sessions table
ALTER TABLE public.sessions 
ADD COLUMN is_group boolean NOT NULL DEFAULT false,
ADD COLUMN is_public boolean NOT NULL DEFAULT false,
ADD COLUMN access_code text,
ADD COLUMN creator_id uuid REFERENCES public.profiles(id),
ADD COLUMN max_participants integer NOT NULL DEFAULT 2,
ADD COLUMN title text;

-- Create session_participants table for group sessions
CREATE TABLE public.session_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  left_at timestamp with time zone,
  is_muted_by_host boolean NOT NULL DEFAULT false,
  hand_raised boolean NOT NULL DEFAULT false,
  UNIQUE(session_id, user_id)
);

-- Enable RLS on session_participants
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

-- Policies for session_participants
CREATE POLICY "Users can read participants of their sessions"
ON public.session_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_id
    AND (
      s.is_public = true
      OR s.creator_id = get_my_profile_id()
      OR s.user1_id = get_my_profile_id()
      OR s.user2_id = get_my_profile_id()
      OR EXISTS (SELECT 1 FROM public.session_participants sp WHERE sp.session_id = session_participants.session_id AND sp.user_id = get_my_profile_id())
    )
  )
);

CREATE POLICY "Users can join sessions"
ON public.session_participants FOR INSERT
WITH CHECK (user_id = get_my_profile_id());

CREATE POLICY "Users can update own participation"
ON public.session_participants FOR UPDATE
USING (user_id = get_my_profile_id() OR EXISTS (
  SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.creator_id = get_my_profile_id()
));

CREATE POLICY "Users can leave sessions"
ON public.session_participants FOR DELETE
USING (user_id = get_my_profile_id() OR EXISTS (
  SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.creator_id = get_my_profile_id()
));

-- Enable realtime for session_participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;

-- Create index for faster queries
CREATE INDEX idx_session_participants_session ON public.session_participants(session_id);
CREATE INDEX idx_sessions_is_public ON public.sessions(is_public) WHERE is_public = true AND status = 'active';
