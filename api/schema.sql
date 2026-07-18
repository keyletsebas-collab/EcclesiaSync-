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

-- --- MIGRATIONS (July 11, 2026) ---

-- 1. Add birthday and address columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Create transactions table (incomes/expenses)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY,
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    account_id VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'income' or 'expense'
    amount NUMERIC(12, 2) NOT NULL,
    description TEXT NOT NULL,
    date VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_transactions_template_id ON transactions(template_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);

-- 3. Add program and assigned_members to services
ALTER TABLE services ADD COLUMN IF NOT EXISTS program TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS assigned_members JSONB DEFAULT '[]'::jsonb;

-- --- MIGRATIONS (July 13, 2026) ---

-- 1. Create programs table
CREATE TABLE IF NOT EXISTS programs (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE programs DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_programs_template_id ON programs(template_id);


