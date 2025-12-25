-- Add avatar_url column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create students storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('students', 'students', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read avatars
CREATE POLICY IF NOT EXISTS "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'students');

-- Allow authenticated users to upload their own avatars
CREATE POLICY IF NOT EXISTS "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'students');
CREATE POLICY IF NOT EXISTS "Authenticated Update" ON storage.objects FOR UPDATE USING (bucket_id = 'students');
