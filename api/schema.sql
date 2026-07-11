-- SQL Migration / Schema Setup for Supabase
-- Copy and run this in your Supabase SQL Editor:

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    uid UUID PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_master BOOLEAN DEFAULT FALSE,
    account_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_blocked BOOLEAN DEFAULT FALSE,
    memberships JSONB DEFAULT '[]'::jsonb
);

-- 2. Templates Table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY,
    account_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    custom_fields JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Members Table
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY,
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    account_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    number INTEGER DEFAULT 0,
    phone VARCHAR(50),
    identifications JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Services Table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY,
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    account_id VARCHAR(50) NOT NULL,
    member_name VARCHAR(255) NOT NULL,
    service_date VARCHAR(100) NOT NULL,
    service_type VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for quick lookups on account_id and references
CREATE INDEX IF NOT EXISTS idx_users_account_id ON users(account_id);
CREATE INDEX IF NOT EXISTS idx_templates_account_id ON templates(account_id);
CREATE INDEX IF NOT EXISTS idx_members_account_id ON members(account_id);
CREATE INDEX IF NOT EXISTS idx_services_account_id ON services(account_id);
CREATE INDEX IF NOT EXISTS idx_members_template_id ON members(template_id);
CREATE INDEX IF NOT EXISTS idx_services_template_id ON services(template_id);
CREATE INDEX IF NOT EXISTS idx_services_member_id ON services(member_id);

-- Disable Row Level Security (RLS) for public/anonymous access
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
