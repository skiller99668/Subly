-- =============================================================
--  Subly — full database schema (idempotent / re-runnable)
-- -------------------------------------------------------------
--  Safe to run on a fresh project OR an existing one: tables use
--  IF NOT EXISTS, columns are added with ADD COLUMN IF NOT EXISTS,
--  and every policy is dropped before being recreated. Running it
--  does NOT delete existing rows.
-- =============================================================

-- =============================================================
--  TABLES
-- =============================================================

-- Users (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  location_name TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;

-- Listings
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  size INTEGER NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  move_in_date DATE NOT NULL,
  address TEXT,
  images TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorites
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, listing_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'listing', 'favorite')),
  related_listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  related_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews (host/landlord reviews — one rating + optional comment per
-- author per subject; authors can edit/delete their own).
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT reviews_no_self_review CHECK (author_id <> subject_id),
  UNIQUE (subject_id, author_id)
);

-- Comments (public discussion thread beneath each listing — anyone signed in
-- can post; authors can delete/edit their own).
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================
--  GRANTS — roles need table-level privileges before RLS is even
--  evaluated. Access is still gated by the RLS policies below.
-- =============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- =============================================================
--  INDEXES
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_subject ON public.reviews(subject_id);
CREATE INDEX IF NOT EXISTS idx_comments_listing ON public.comments(listing_id);

-- =============================================================
--  ROW LEVEL SECURITY
-- =============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- ---- Users ----
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
CREATE POLICY "Users can read all users" ON public.users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- ---- Listings ----
DROP POLICY IF EXISTS "Listings are visible to all" ON public.listings;
CREATE POLICY "Listings are visible to all" ON public.listings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert listings" ON public.listings;
CREATE POLICY "Users can insert listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own listings" ON public.listings;
CREATE POLICY "Users can update own listings" ON public.listings FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own listings" ON public.listings;
CREATE POLICY "Users can delete own listings" ON public.listings FOR DELETE USING (auth.uid() = user_id);

-- ---- Messages ----
DROP POLICY IF EXISTS "Users can read own messages" ON public.messages;
CREATE POLICY "Users can read own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
CREATE POLICY "Users can insert messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
-- Receivers may update their messages (e.g. mark as read).
DROP POLICY IF EXISTS "Users can update received messages" ON public.messages;
CREATE POLICY "Users can update received messages" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

-- ---- Favorites ----
DROP POLICY IF EXISTS "Users can read own favorites" ON public.favorites;
CREATE POLICY "Users can read own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert favorites" ON public.favorites;
CREATE POLICY "Users can insert favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorites;
CREATE POLICY "Users can delete own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- ---- Notifications ----
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ---- Reviews (publicly readable; authors manage only their own; the
--      WITH CHECK + table constraint together forbid self-reviews) ----
DROP POLICY IF EXISTS "Reviews are visible to all" ON public.reviews;
CREATE POLICY "Reviews are visible to all" ON public.reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.reviews;
CREATE POLICY "Users can insert own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = author_id AND author_id <> subject_id);
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE USING (auth.uid() = author_id);

-- ---- Comments (publicly readable; authors manage only their own) ----
DROP POLICY IF EXISTS "Comments are visible to all" ON public.comments;
CREATE POLICY "Comments are visible to all" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own comments" ON public.comments;
CREATE POLICY "Users can insert own comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = author_id);

-- =============================================================
--  AUTO-CREATE PROFILE ON SIGNUP
--  Runs whenever an auth user is created (email/password OR Google
--  OAuth). SECURITY DEFINER so it bypasses RLS. Username defaults to
--  the email prefix, preserving dots:
--     skyler.xiao.99@gmail.com -> skyler.xiao.99
--  A numeric suffix is appended only on collision.
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  suffix INT := 0;
BEGIN
  -- Explicit username first, then the email prefix (keeps dots), then a
  -- name-based fallback (spaces -> dots).
  base_username := lower(coalesce(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1),
    regexp_replace(coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), '\s+', '.', 'g')
  ));
  -- Allow only a-z, 0-9, underscore, and dot.
  base_username := regexp_replace(base_username, '[^a-z0-9_.]', '', 'g');
  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'user';
  END IF;

  -- Ensure uniqueness by appending an incrementing suffix on collision.
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  END LOOP;

  INSERT INTO public.users (id, email, name, username)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    final_username
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
--  BACKFILL — create profiles for any existing auth users that are
--  missing one (e.g. signed up before the trigger existed). Uses the
--  same clean username logic, looping so collisions get a suffix.
-- =============================================================
DO $$
DECLARE
  au RECORD;
  base_username TEXT;
  final_username TEXT;
  suffix INT;
BEGIN
  FOR au IN
    SELECT a.*
    FROM auth.users a
    LEFT JOIN public.users p ON p.id = a.id
    WHERE p.id IS NULL
  LOOP
    base_username := lower(coalesce(
      au.raw_user_meta_data->>'username',
      split_part(au.email, '@', 1),
      regexp_replace(coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name'), '\s+', '.', 'g')
    ));
    base_username := regexp_replace(base_username, '[^a-z0-9_.]', '', 'g');
    IF base_username IS NULL OR base_username = '' THEN
      base_username := 'user';
    END IF;

    final_username := base_username;
    suffix := 0;
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username) LOOP
      suffix := suffix + 1;
      final_username := base_username || suffix::text;
    END LOOP;

    INSERT INTO public.users (id, email, name, username)
    VALUES (
      au.id,
      au.email,
      coalesce(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
      final_username
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- =============================================================
--  STORAGE — listing images bucket: public read; authenticated users
--  may upload/delete only inside their own {user_id}/ folder.
-- =============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Listing images are publicly readable" ON storage.objects;
CREATE POLICY "Listing images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

DROP POLICY IF EXISTS "Users can upload listing images to own folder" ON storage.objects;
CREATE POLICY "Users can upload listing images to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own listing images" ON storage.objects;
CREATE POLICY "Users can delete own listing images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================
--  OPTIONAL — one-time cleanup of existing gibberish usernames.
--  This OVERWRITES every current username with the email prefix, so
--  only run it if you have no hand-picked usernames worth keeping.
--  Uncomment and run separately if desired.
-- =============================================================
-- UPDATE public.users u
-- SET username = sub.uname
-- FROM (
--   SELECT id,
--          regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9_.]', '', 'g') AS uname
--   FROM public.users
-- ) sub
-- WHERE u.id = sub.id;
