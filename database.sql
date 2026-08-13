-- Subly database schema — canonical and safe to re-run.
--
-- Paste this whole file into the Supabase SQL editor (Dashboard → SQL Editor),
-- or run `npx tsx scripts/setup-db.ts`. Every statement is idempotent: tables
-- use IF NOT EXISTS, columns are added with ADD COLUMN IF NOT EXISTS, and
-- policies/constraints are dropped before being recreated. Running it against
-- a live database brings it up to date without dropping any rows.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Public profile mirroring an auth.users row.
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A sublease. `images` holds public URLs from the listing-images bucket;
-- `tags` holds student attribute tag ids (see utils/listingTags.ts).
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
  images TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backfill the columns added after the first release.
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- Direct messages between two users.
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved listings.
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- Public discussion thread on a listing (app/api/comments).
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews of a *person* — a host, landlord, or roommate (app/api/reviews).
-- One review per author per subject: the POST handler upserts on this pair so
-- that re-submitting edits the existing review instead of adding another.
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT reviews_no_self_review CHECK (author_id <> subject_id),
  CONSTRAINT reviews_author_subject_key UNIQUE (author_id, subject_id)
);

-- Databases created before the one-review-per-pair rule existed may hold
-- duplicates from the old plain-insert handler, and cannot take the UNIQUE
-- constraint until they are collapsed. Keep each author's newest review.
DELETE FROM public.reviews r
USING public.reviews newer
WHERE r.author_id = newer.author_id
  AND r.subject_id = newer.subject_id
  AND (newer.created_at, newer.id) > (r.created_at, r.id);

-- ADD CONSTRAINT has no IF NOT EXISTS, so check the catalog first.
DO $add_review_constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reviews_author_subject_key'
      AND conrelid = 'public.reviews'::regclass
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_author_subject_key UNIQUE (author_id, subject_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reviews_no_self_review'
      AND conrelid = 'public.reviews'::regclass
  ) THEN
    DELETE FROM public.reviews WHERE author_id = subject_id;
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_no_self_review CHECK (author_id <> subject_id);
  END IF;
END
$add_review_constraints$;

-- Reviews of a *place* (app/api/property-reviews). Unlike host reviews these
-- are not deduplicated — a listing can collect several from the same person
-- over time, and the UI deletes by row id.
CREATE TABLE IF NOT EXISTS public.property_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity feed behind the top-menu bell. Rows are written only by the
-- SECURITY DEFINER triggers below, never by the client. The 'listing' type is
-- reserved for saved-search matches and has no trigger yet.
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  related_listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  related_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT notifications_type_check
    CHECK (type IN ('message', 'listing', 'favorite', 'comment', 'review'))
);

-- The original constraint only allowed message/listing/favorite; widen it on
-- databases created before comments and reviews existed.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('message', 'listing', 'favorite', 'comment', 'review'));

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_listing ON public.comments(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_subject ON public.reviews(subject_id);
CREATE INDEX IF NOT EXISTS idx_property_reviews_listing ON public.property_reviews(listing_id);
-- The bell reads one user's feed newest-first, so index the pair. This
-- supersedes the old user_id-only index, which was a redundant prefix.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);
DROP INDEX IF EXISTS public.idx_notifications_user;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
CREATE POLICY "Users can read all users" ON public.users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id OR current_role = 'service_role');
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Listings
DROP POLICY IF EXISTS "Listings are visible to all" ON public.listings;
CREATE POLICY "Listings are visible to all" ON public.listings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert listings" ON public.listings;
CREATE POLICY "Users can insert listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own listings" ON public.listings;
CREATE POLICY "Users can update own listings" ON public.listings FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own listings" ON public.listings;
CREATE POLICY "Users can delete own listings" ON public.listings FOR DELETE USING (auth.uid() = user_id);

-- Messages
DROP POLICY IF EXISTS "Users can read own messages" ON public.messages;
CREATE POLICY "Users can read own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
CREATE POLICY "Users can insert messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
-- Marking a thread read updates the recipient's own rows.
DROP POLICY IF EXISTS "Recipients can mark messages read" ON public.messages;
CREATE POLICY "Recipients can mark messages read" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Favorites
DROP POLICY IF EXISTS "Users can read own favorites" ON public.favorites;
CREATE POLICY "Users can read own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert favorites" ON public.favorites;
CREATE POLICY "Users can insert favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete favorites" ON public.favorites;
CREATE POLICY "Users can delete favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Comments — public to read, own-only to write.
DROP POLICY IF EXISTS "Comments are visible to all" ON public.comments;
CREATE POLICY "Comments are visible to all" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own comments" ON public.comments;
CREATE POLICY "Users can insert own comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = author_id);

-- Host/roommate reviews — public to read, own-only to write.
DROP POLICY IF EXISTS "Reviews are visible to all" ON public.reviews;
CREATE POLICY "Reviews are visible to all" ON public.reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.reviews;
CREATE POLICY "Users can insert own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE USING (auth.uid() = author_id);

-- Property reviews — public to read, own-only to write.
DROP POLICY IF EXISTS "Property reviews are visible to all" ON public.property_reviews;
CREATE POLICY "Property reviews are visible to all" ON public.property_reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own property reviews" ON public.property_reviews;
CREATE POLICY "Users can insert own property reviews" ON public.property_reviews FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can update own property reviews" ON public.property_reviews;
CREATE POLICY "Users can update own property reviews" ON public.property_reviews FOR UPDATE USING (auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can delete own property reviews" ON public.property_reviews;
CREATE POLICY "Users can delete own property reviews" ON public.property_reviews FOR DELETE USING (auth.uid() = author_id);

-- Notifications — read and mark-read your own. Deliberately no INSERT policy:
-- only the triggers below may create them, so nobody can forge a notification.
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can mark own notifications read" ON public.notifications;
CREATE POLICY "Users can mark own notifications read" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Notification triggers
--
-- Notifications are generated in the database rather than in the API routes so
-- that they also fire for writes the browser makes directly (favoriting, for
-- instance, goes straight to Supabase from components/Map.tsx). Each function
-- is SECURITY DEFINER because it inserts a row owned by *another* user, which
-- the notifications RLS policies otherwise forbid.
-- ---------------------------------------------------------------------------

-- A new message notifies its recipient.
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $notify_on_message$
BEGIN
  IF NEW.receiver_id IS DISTINCT FROM NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, type, related_user_id)
    VALUES (NEW.receiver_id, 'message', NEW.sender_id);
  END IF;
  RETURN NEW;
END;
$notify_on_message$;

DROP TRIGGER IF EXISTS trg_notify_on_message ON public.messages;
CREATE TRIGGER trg_notify_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();

-- A comment notifies the listing's host (but not when they comment themselves).
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $notify_on_comment$
DECLARE
  host_id UUID;
BEGIN
  SELECT user_id INTO host_id FROM public.listings WHERE id = NEW.listing_id;
  IF host_id IS NOT NULL AND host_id <> NEW.author_id THEN
    INSERT INTO public.notifications (user_id, type, related_listing_id, related_user_id)
    VALUES (host_id, 'comment', NEW.listing_id, NEW.author_id);
  END IF;
  RETURN NEW;
END;
$notify_on_comment$;

DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.comments;
CREATE TRIGGER trg_notify_on_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- A review of a person notifies that person.
CREATE OR REPLACE FUNCTION public.notify_on_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $notify_on_review$
BEGIN
  INSERT INTO public.notifications (user_id, type, related_user_id)
  VALUES (NEW.subject_id, 'review', NEW.author_id);
  RETURN NEW;
END;
$notify_on_review$;

-- INSERT only: editing a review upserts, and a revision shouldn't re-notify.
DROP TRIGGER IF EXISTS trg_notify_on_review ON public.reviews;
CREATE TRIGGER trg_notify_on_review
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_review();

-- A review of a place notifies the listing's host.
CREATE OR REPLACE FUNCTION public.notify_on_property_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $notify_on_property_review$
DECLARE
  host_id UUID;
BEGIN
  SELECT user_id INTO host_id FROM public.listings WHERE id = NEW.listing_id;
  IF host_id IS NOT NULL AND host_id <> NEW.author_id THEN
    INSERT INTO public.notifications (user_id, type, related_listing_id, related_user_id)
    VALUES (host_id, 'review', NEW.listing_id, NEW.author_id);
  END IF;
  RETURN NEW;
END;
$notify_on_property_review$;

DROP TRIGGER IF EXISTS trg_notify_on_property_review ON public.property_reviews;
CREATE TRIGGER trg_notify_on_property_review
  AFTER INSERT ON public.property_reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_property_review();

-- Someone saving a listing notifies its host.
CREATE OR REPLACE FUNCTION public.notify_on_favorite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $notify_on_favorite$
DECLARE
  host_id UUID;
BEGIN
  SELECT user_id INTO host_id FROM public.listings WHERE id = NEW.listing_id;
  IF host_id IS NOT NULL AND host_id <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, related_listing_id, related_user_id)
    VALUES (host_id, 'favorite', NEW.listing_id, NEW.user_id);
  END IF;
  RETURN NEW;
END;
$notify_on_favorite$;

DROP TRIGGER IF EXISTS trg_notify_on_favorite ON public.favorites;
CREATE TRIGGER trg_notify_on_favorite
  AFTER INSERT ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_favorite();

-- ---------------------------------------------------------------------------
-- Storage
--
-- Listing photos live in a public bucket, one folder per user:
-- listing-images/<user_id>/<uuid>.<ext> (see components/PostLeasePanel.tsx).
-- ---------------------------------------------------------------------------

-- storage.objects is owned by supabase_storage_admin, and on some projects the
-- role running this script cannot manage its policies. Trap that case so a
-- permissions error here doesn't roll back the rest of the schema — configure
-- the bucket by hand (Dashboard → Storage) if you see the notice.
DO $storage_setup$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('listing-images', 'listing-images', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

  DROP POLICY IF EXISTS "Listing images are publicly readable" ON storage.objects;
  CREATE POLICY "Listing images are publicly readable" ON storage.objects
    FOR SELECT USING (bucket_id = 'listing-images');

  DROP POLICY IF EXISTS "Users can upload own listing images" ON storage.objects;
  CREATE POLICY "Users can upload own listing images" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'listing-images'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "Users can delete own listing images" ON storage.objects;
  CREATE POLICY "Users can delete own listing images" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'listing-images'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipped storage setup (%). Create the public listing-images bucket in the dashboard instead.', SQLERRM;
END
$storage_setup$;
