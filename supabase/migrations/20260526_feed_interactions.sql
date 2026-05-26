-- ============================================================
-- Migration: Create tbFeedLikes and tbFeedComments tables
-- ============================================================

-- 1. Create tbFeedLikes table
CREATE TABLE IF NOT EXISTS public.tbFeedLikes (
  id          uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id     uuid          NOT NULL,
  item_type   text          NOT NULL CHECK (item_type IN ('workout', 'challenge_victory')),
  created_at  timestamptz   DEFAULT now() NOT NULL,
  UNIQUE(user_id, item_id, item_type)
);

-- 2. Create tbFeedComments table
CREATE TABLE IF NOT EXISTS public.tbFeedComments (
  id          uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id     uuid          NOT NULL,
  item_type   text          NOT NULL CHECK (item_type IN ('workout', 'challenge_victory')),
  content     text          NOT NULL,
  created_at  timestamptz   DEFAULT now() NOT NULL
);

-- 3. RLS for tbFeedLikes
ALTER TABLE public.tbFeedLikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feed likes are publicly readable"
  ON public.tbFeedLikes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can toggle their likes"
  ON public.tbFeedLikes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. RLS for tbFeedComments
ALTER TABLE public.tbFeedComments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feed comments are publicly readable"
  ON public.tbFeedComments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage their comments"
  ON public.tbFeedComments FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
