-- ==============================================================================
-- SCHEMA INISIALISASI AUTONOMOUS OMNICHANNEL SOCIAL MEDIA AUTO-POSTER ENGINE (OSM-APE)
-- PostgreSQL 15+ (Supabase Managed Engine)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Tipe Konten
DO $$ BEGIN
    CREATE TYPE media_type_enum AS ENUM ('TEXT', 'IMAGE', 'VIDEO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum Status Postingan
DO $$ BEGIN
    CREATE TYPE post_status_enum AS ENUM (
        'DRAFT', 
        'SCHEDULED', 
        'PROCESSING', 
        'COMPLETED', 
        'PARTIALLY_FAILED', 
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum Status Target Eksekusi Platform
DO $$ BEGIN
    CREATE TYPE target_status_enum AS ENUM (
        'PENDING', 
        'CONTAINER_INITIALIZED', 
        'IN_PROGRESS', 
        'SUCCESS', 
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. TABEL KREDENSIAL AKUN (Encrypted Token Storage)
CREATE TABLE IF NOT EXISTS public.connected_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    platform VARCHAR(30) NOT NULL, -- 'facebook_page', 'instagram', 'threads', 'tiktok'
    account_name VARCHAR(150) NOT NULL,
    account_avatar_url TEXT,
    platform_user_id VARCHAR(100) NOT NULL,
    platform_parent_id VARCHAR(100),
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_platform_account UNIQUE (platform, platform_user_id)
);

-- 2. TABEL MASTER POSTINGAN (Media disimpan referensi Google Drive)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(200),
    content_text TEXT NOT NULL,
    media_type media_type_enum NOT NULL DEFAULT 'TEXT',
    gdrive_file_id VARCHAR(100),
    gdrive_stream_url TEXT,
    gdrive_lh3_url TEXT,
    media_metadata JSONB DEFAULT '{}'::JSONB,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status post_status_enum NOT NULL DEFAULT 'SCHEDULED',
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL DETAIL TARGET EKSEKUSI PLATFORM (State Machine Tracker)
CREATE TABLE IF NOT EXISTS public.post_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.connected_accounts(id) ON DELETE RESTRICT,
    platform VARCHAR(30) NOT NULL,
    status target_status_enum NOT NULL DEFAULT 'PENDING',
    async_container_id VARCHAR(150),
    external_post_id VARCHAR(150),
    external_post_url TEXT,
    http_status_code INT,
    error_payload JSONB,
    polling_attempts INT NOT NULL DEFAULT 0,
    last_polled_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_post_account UNIQUE (post_id, account_id)
);

-- 4. TABEL AUDIT LOG & RATE LIMIT TRACKER
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    post_target_id UUID REFERENCES public.post_targets(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    platform VARCHAR(30) NOT NULL,
    request_url TEXT,
    response_body JSONB,
    execution_time_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEKS PERFORMA QUERY
CREATE INDEX IF NOT EXISTS idx_posts_schedule_pickup 
ON public.posts (scheduled_at, status) 
WHERE status IN ('SCHEDULED', 'PROCESSING');

CREATE INDEX IF NOT EXISTS idx_targets_pending_pickup 
ON public.post_targets (status, platform);

CREATE INDEX IF NOT EXISTS idx_accounts_token_check 
ON public.connected_accounts (token_expires_at) 
WHERE is_active = TRUE;

-- TRIGGER OTOMATIS: Update kolom updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at 
BEFORE UPDATE ON public.posts 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_targets_updated_at ON public.post_targets;
CREATE TRIGGER trg_targets_updated_at 
BEFORE UPDATE ON public.post_targets 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- HELPER RPC FUNCTIONS: Enkripsi & Dekripsi Token Tingkat Kolom
CREATE OR REPLACE FUNCTION encrypt_secret(plain_text text, secret_key text)
RETURNS text AS $$
BEGIN
    RETURN encode(pgp_sym_encrypt(plain_text, secret_key), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_secret(ciphertext text, secret_key text)
RETURNS text AS $$
BEGIN
    RETURN pgp_sym_decrypt(decode(ciphertext, 'base64'), secret_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Development policy / User policy:
DROP POLICY IF EXISTS "Public / Dev full access connected_accounts" ON public.connected_accounts;
CREATE POLICY "Public / Dev full access connected_accounts" 
ON public.connected_accounts FOR ALL 
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public / Dev full access posts" ON public.posts;
CREATE POLICY "Public / Dev full access posts" 
ON public.posts FOR ALL 
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public / Dev full access post_targets" ON public.post_targets;
CREATE POLICY "Public / Dev full access post_targets" 
ON public.post_targets FOR ALL 
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public / Dev full access audit_logs" ON public.audit_logs;
CREATE POLICY "Public / Dev full access audit_logs" 
ON public.audit_logs FOR ALL 
USING (true) WITH CHECK (true);
