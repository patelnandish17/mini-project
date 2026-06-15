-- ==========================================
-- SUPABASE DATABASE & STORAGE SETUP SCRIPT
-- ==========================================
-- This script creates the required tables, disables Row-Level Security (RLS) 
-- on them for direct client submissions, seeds the default Admin profiles, 
-- registers the storage buckets, and sets up free-to-write storage policies
-- for public/anonymous picture uploads.
--
-- HOW TO RUN:
-- 1. Log in to your Supabase Console (https://supabase.com).
-- 2. Select your project.
-- 3. Click on the "SQL Editor" tab on the left sidebar.
-- 4. Click "+ New query".
-- 5. Copy the ENTIRE contents of this file, paste them into the SQL Editor, and click "Run".
-- ==========================================

-- ----------------------------------------------------
-- 1. Create the Reports Table
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
    id TEXT PRIMARY KEY,
    citizen JSONB NOT NULL,
    location JSONB NOT NULL,
    image_url TEXT,
    status TEXT NOT NULL,
    severity TEXT NOT NULL,
    severity_score NUMERIC NOT NULL,
    upvotes INTEGER DEFAULT 0,
    upvoted_by JSONB DEFAULT '[]'::jsonb,
    created_at TEXT NOT NULL,
    health_risks JSONB DEFAULT '[]'::jsonb,
    environmental_risks JSONB DEFAULT '[]'::jsonb,
    complaint_letter TEXT,
    notified_authority TEXT,
    timeline JSONB DEFAULT '[]'::jsonb
);

-- ----------------------------------------------------
-- 2. Create the Notifications Table
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    report_id TEXT,
    type TEXT,
    recipient TEXT,
    subject TEXT,
    status TEXT,
    timestamp TEXT,
    details TEXT
);

-- ----------------------------------------------------
-- 3. Create the Admins Table
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admins (
    email TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL
);

-- ----------------------------------------------------
-- 4. Disable Row Level Security (RLS) on Tables
-- ----------------------------------------------------
-- Placing tables into direct open mode allows background tasks, 
-- standard forms, and client API commands to insert reports and 
-- notification records seamlessly.
ALTER TABLE IF EXISTS public.reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admins DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- 5. Seed Default Admin Profiles
-- ----------------------------------------------------
INSERT INTO public.admins (email, password_hash)
VALUES 
    ('admin@mandya.gov.in', 'admin123'),
    ('admin@bbmp.gov.in', 'admin123'),
    ('admin@trashtalk.in', 'admin123')
ON CONFLICT (email) DO UPDATE 
SET password_hash = EXCLUDED.password_hash;

-- ----------------------------------------------------
-- 6. Register & Enable Storage Buckets
-- ----------------------------------------------------
-- We register both 'dump-images' and '-dump-images' to ensure 
-- maximum compatibility with the hyphen naming convention configurations.
INSERT INTO storage.buckets (id, name, public)
VALUES ('dump-images', 'dump-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('-dump-images', '-dump-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ----------------------------------------------------
-- 7. Grant Permissive Storage Policies
-- ----------------------------------------------------
-- Ensure anyone can select, insert, update, or delete images in our buckets.

DROP POLICY IF EXISTS "Allow public select" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete" ON storage.objects;

CREATE POLICY "Allow public select" ON storage.objects 
    FOR SELECT TO public USING (bucket_id IN ('dump-images', '-dump-images'));

CREATE POLICY "Allow public insert" ON storage.objects 
    FOR INSERT TO public WITH CHECK (bucket_id IN ('dump-images', '-dump-images'));

CREATE POLICY "Allow public update" ON storage.objects 
    FOR UPDATE TO public USING (bucket_id IN ('dump-images', '-dump-images'));

CREATE POLICY "Allow public delete" ON storage.objects 
    FOR DELETE TO public USING (bucket_id IN ('dump-images', '-dump-images'));
