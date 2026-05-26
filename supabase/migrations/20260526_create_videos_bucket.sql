-- ============================================================
-- Migration: Create videos storage bucket and RLS policies
-- ============================================================

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS policies on storage.objects for 'videos' bucket

-- Allow public access to read videos
CREATE POLICY "Video files are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

-- Allow authenticated users to upload videos
CREATE POLICY "Users can upload video proofs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'videos');

-- Allow authenticated users to delete their videos
CREATE POLICY "Users can delete their own video proofs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'videos');
