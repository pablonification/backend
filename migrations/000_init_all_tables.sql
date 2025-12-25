-- =============================================
-- Lab Kimia Dasar ITB - Full Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. ADMINS TABLE
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  nim VARCHAR(50),
  cohort VARCHAR(10),
  faculty VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SLIDERS TABLE
CREATE TABLE IF NOT EXISTS sliders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  image_path TEXT NOT NULL,
  alt_text VARCHAR(255),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_important BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. MODULES TABLE
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path TEXT,
  visibility VARCHAR(20) DEFAULT 'public',
  file_size BIGINT,
  file_type VARCHAR(100),
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. FILES TABLE
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  storage_path TEXT NOT NULL,
  visibility VARCHAR(20) DEFAULT 'public',
  has_password BOOLEAN DEFAULT FALSE,
  password_hash VARCHAR(255),
  file_size BIGINT,
  file_type VARCHAR(100),
  download_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES admins(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. NILAI_FILES TABLE (Grade files)
CREATE TABLE IF NOT EXISTS nilai_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class VARCHAR(100) NOT NULL,
  cohort VARCHAR(10) NOT NULL,
  storage_path TEXT NOT NULL,
  has_password BOOLEAN DEFAULT FALSE,
  password_hash VARCHAR(255),
  file_size BIGINT,
  file_type VARCHAR(100),
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. GROUPS TABLE
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  storage_path TEXT,
  cohort VARCHAR(10),
  visibility VARCHAR(20) DEFAULT 'public',
  has_password BOOLEAN DEFAULT FALSE,
  password_hash VARCHAR(255),
  file_size BIGINT,
  file_type VARCHAR(100),
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. CONTACT_MESSAGES TABLE
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. PUSH_TOKENS TABLE
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_type VARCHAR(20) CHECK (user_type IN ('admin', 'student')),
  push_token VARCHAR(255) NOT NULL UNIQUE,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_nim ON students(nim);
CREATE INDEX IF NOT EXISTS idx_sliders_order ON sliders(order_index);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_important ON announcements(is_important);
CREATE INDEX IF NOT EXISTS idx_modules_visibility ON modules(visibility);
CREATE INDEX IF NOT EXISTS idx_files_visibility ON files(visibility);
CREATE INDEX IF NOT EXISTS idx_nilai_cohort ON nilai_files(cohort);
CREATE INDEX IF NOT EXISTS idx_groups_cohort ON groups(cohort);
CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id, user_type);

-- =============================================
-- AUTO UPDATE TIMESTAMP TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT unnest(ARRAY['admins', 'students', 'sliders', 'announcements', 
                        'modules', 'files', 'nilai_files', 'groups', 
                        'contact_messages', 'push_tokens'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s 
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- =============================================
-- RPC FUNCTIONS (for increment counters)
-- =============================================
CREATE OR REPLACE FUNCTION increment_module_download_count(module_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE modules SET download_count = download_count + 1 WHERE id = module_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_file_download_count(file_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE files SET download_count = download_count + 1 WHERE id = file_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_nilai_download_count(nilai_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE nilai_files SET download_count = download_count + 1 WHERE id = nilai_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_group_download_count(group_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE groups SET download_count = download_count + 1 WHERE id = group_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE sliders ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE nilai_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for backend)
CREATE POLICY "Service role full access" ON admins FOR ALL USING (true);
CREATE POLICY "Service role full access" ON students FOR ALL USING (true);
CREATE POLICY "Service role full access" ON sliders FOR ALL USING (true);
CREATE POLICY "Service role full access" ON announcements FOR ALL USING (true);
CREATE POLICY "Service role full access" ON modules FOR ALL USING (true);
CREATE POLICY "Service role full access" ON files FOR ALL USING (true);
CREATE POLICY "Service role full access" ON nilai_files FOR ALL USING (true);
CREATE POLICY "Service role full access" ON groups FOR ALL USING (true);
CREATE POLICY "Service role full access" ON contact_messages FOR ALL USING (true);
CREATE POLICY "Service role full access" ON push_tokens FOR ALL USING (true);

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Insert sample admin (password: Admin123!)
-- Hash generated with bcrypt, 12 rounds
INSERT INTO admins (email, password_hash, full_name, role) VALUES
('admin@labkimia.itb.ac.id', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4mBmqj1yk4IiIqiy', 'Admin Lab Kimia', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample sliders
INSERT INTO sliders (title, image_path, alt_text, order_index) VALUES
('Selamat Datang di Lab Kimia Dasar ITB', '/images/slider-1.jpg', 'Welcome Banner', 1),
('Praktikum Semester Ganjil 2025', '/images/slider-2.jpg', 'Praktikum Info', 2)
ON CONFLICT DO NOTHING;

-- Insert sample announcement
INSERT INTO announcements (title, content, is_important, published_at) VALUES
('Selamat Datang di Lab Kimia Dasar', 
 'Selamat datang di website Lab Kimia Dasar Institut Teknologi Bandung. Website ini menyediakan informasi terkait praktikum kimia dasar.',
 true, NOW())
ON CONFLICT DO NOTHING;

-- =============================================
-- DONE!
-- =============================================
