-- Add avatar_url column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create students storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('students', 'students', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;

-- Allow public access to read avatars from students bucket
CREATE POLICY "Public Access" ON storage.objects 
  FOR SELECT USING (bucket_id = 'students');

-- Allow authenticated users to upload avatars
CREATE POLICY "Authenticated Upload" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'students');

-- Allow authenticated users to update their avatars  
CREATE POLICY "Authenticated Update" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'students');
