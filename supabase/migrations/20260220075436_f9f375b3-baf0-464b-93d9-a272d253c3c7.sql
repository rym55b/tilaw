
-- Enums
CREATE TYPE public.gender_type AS ENUM ('male', 'female');
CREATE TYPE public.level_type AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE public.session_type AS ENUM ('recitation', 'memorization', 'test');
CREATE TYPE public.session_status AS ENUM ('pending', 'active', 'completed', 'cancelled');
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'rejected');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  gender gender_type NOT NULL,
  level level_type NOT NULL DEFAULT 'beginner',
  avatar_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  average_rating NUMERIC(3,2) DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type session_type NOT NULL,
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status session_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ratings table
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rated_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, rater_id)
);

-- Invitations table
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_type session_type NOT NULL,
  scheduled_at TIMESTAMPTZ,
  status invitation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (sender_id <> receiver_id)
);

-- Matchmaking queue
CREATE TABLE public.matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_type session_type NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Enable realtime for sessions, invitations, matchmaking_queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;

-- Helper function: get profile id for current user
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- Helper function: check if user is session participant
CREATE OR REPLACE FUNCTION public.is_session_participant(_session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sessions
    WHERE id = _session_id
    AND (user1_id = public.get_my_profile_id() OR user2_id = public.get_my_profile_id())
  )
$$;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, gender, level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', 'مستخدم جديد'),
    COALESCE((NEW.raw_user_meta_data->>'gender')::gender_type, 'male'),
    COALESCE((NEW.raw_user_meta_data->>'level')::level_type, 'beginner')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update average rating function
CREATE OR REPLACE FUNCTION public.update_average_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET average_rating = (
    SELECT COALESCE(AVG(stars), 0) FROM public.ratings WHERE rated_id = NEW.rated_id
  ),
  total_sessions = (
    SELECT COUNT(DISTINCT session_id) FROM public.ratings WHERE rated_id = NEW.rated_id
  )
  WHERE id = NEW.rated_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_rating_created
AFTER INSERT ON public.ratings
FOR EACH ROW EXECUTE FUNCTION public.update_average_rating();

-- RLS Policies for profiles
CREATE POLICY "Users can read all profiles" ON public.profiles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- RLS Policies for sessions
CREATE POLICY "Users can read own sessions" ON public.sessions
FOR SELECT TO authenticated
USING (user1_id = public.get_my_profile_id() OR user2_id = public.get_my_profile_id());

CREATE POLICY "Authenticated can insert sessions" ON public.sessions
FOR INSERT TO authenticated
WITH CHECK (user1_id = public.get_my_profile_id() OR user2_id = public.get_my_profile_id());

CREATE POLICY "Participants can update sessions" ON public.sessions
FOR UPDATE TO authenticated
USING (user1_id = public.get_my_profile_id() OR user2_id = public.get_my_profile_id());

-- RLS Policies for ratings
CREATE POLICY "Users can read own ratings" ON public.ratings
FOR SELECT TO authenticated
USING (rater_id = public.get_my_profile_id() OR rated_id = public.get_my_profile_id());

CREATE POLICY "Session participants can rate" ON public.ratings
FOR INSERT TO authenticated
WITH CHECK (rater_id = public.get_my_profile_id() AND public.is_session_participant(session_id));

-- RLS Policies for invitations
CREATE POLICY "Users can read own invitations" ON public.invitations
FOR SELECT TO authenticated
USING (sender_id = public.get_my_profile_id() OR receiver_id = public.get_my_profile_id());

CREATE POLICY "Users can send invitations" ON public.invitations
FOR INSERT TO authenticated
WITH CHECK (sender_id = public.get_my_profile_id() AND sender_id <> receiver_id);

CREATE POLICY "Receivers can update invitations" ON public.invitations
FOR UPDATE TO authenticated
USING (receiver_id = public.get_my_profile_id() AND status = 'pending');

CREATE POLICY "Users can delete own invitations" ON public.invitations
FOR DELETE TO authenticated
USING ((sender_id = public.get_my_profile_id() OR receiver_id = public.get_my_profile_id()) AND status = 'pending');

-- RLS Policies for matchmaking_queue
CREATE POLICY "Users can read own queue" ON public.matchmaking_queue
FOR SELECT TO authenticated
USING (user_id = public.get_my_profile_id());

CREATE POLICY "Users can join queue" ON public.matchmaking_queue
FOR INSERT TO authenticated
WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "Users can leave queue" ON public.matchmaking_queue
FOR DELETE TO authenticated
USING (user_id = public.get_my_profile_id());

-- Service role policy for matchmaking queue (edge functions)
CREATE POLICY "Service role full access to queue" ON public.matchmaking_queue
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to sessions" ON public.sessions
FOR ALL TO service_role USING (true) WITH CHECK (true);
