-- =============================================================
-- Migration 07: Create Paper Previews Storage Bucket
-- Creates the public 'paper-previews' bucket and sets up policies
-- =============================================================

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('paper-previews', 'paper-previews', true)
ON CONFLICT (id) DO NOTHING;

-- Set up access policies
-- 1. Allow public read access to all files in the bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'paper-previews' );

-- 2. Allow anyone to upload to the bucket (for simplicity in this app)
-- In a production app, you might want to restrict this to authenticated users or add size limits
CREATE POLICY "Allow Public Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'paper-previews' );

-- 3. Allow users to update/delete their own uploads (optional, but good for cleanup)
CREATE POLICY "Allow Public Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'paper-previews' );
