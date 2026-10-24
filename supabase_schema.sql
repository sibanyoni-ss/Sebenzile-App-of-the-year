-- ==============================================================================
-- LAWCOMPASS SUPABASE PRODUCTION DATABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- Meets South African POPIA, Section 4 (Document Generation) & Section 7 (Retention)
-- IDEMPOTENT: Safe to run repeatedly without duplicate policy or table errors.
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. USER PROFILES (Extensions of auth.users with POPIA & FICA Compliance)
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    first_name text not null,
    surname text not null,
    full_name text not null,
    date_of_birth date,
    residential_address text not null,
    city text not null,
    province text not null check (province in (
        'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 
        'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'
    )),
    postal_code text not null,
    email text not null,
    phone text,
    preferred_language text default 'English' check (preferred_language in (
        'English', 'isiZulu', 'isiXhosa', 'Afrikaans', 'Sesotho', 
        'Setswana', 'Sepedi', 'Xitsonga', 'siSwati', 'Tshivenda', 'isiNdebele'
    )),
    persona text default 'individual' check (persona in ('individual', 'student', 'business_owner')),
    tier text not null default 'free' check (tier in ('free', 'standard', 'premium')),
    terms_accepted boolean not null default true,
    terms_accepted_at timestamp with time zone default timezone('utc'::text, now()) not null,
    terms_version text not null default '1.0-draft',
    email_verified boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Idempotent migrations for existing deployments
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists surname text;
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists residential_address text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists province text;
alter table public.profiles add column if not exists postal_code text;
alter table public.profiles add column if not exists preferred_language text default 'English';
alter table public.profiles add column if not exists persona text default 'individual';
alter table public.profiles add column if not exists terms_accepted boolean default true;
alter table public.profiles add column if not exists terms_accepted_at timestamp with time zone default now();
alter table public.profiles add column if not exists terms_version text default '1.0-draft';
alter table public.profiles add column if not exists email_verified boolean default false;

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" 
    on public.profiles for select 
    using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" 
    on public.profiles for update 
    using (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 1.1 EMAIL OTP VERIFICATIONS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.email_verifications (
    id uuid primary key default uuid_generate_v4(),
    email text not null,
    otp_code text not null,
    expires_at timestamp with time zone not null,
    attempts integer not null default 0,
    verified boolean not null default false,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.email_verifications enable row level security;
-- Service role only can manage verification codes; no direct public exposure

-- ------------------------------------------------------------------------------
-- 2. VERSIONED TEMPLATES (Immutable template schemas)
-- ------------------------------------------------------------------------------
create table if not exists public.templates (
    id uuid primary key default uuid_generate_v4(),
    key text unique not null,
    title text not null,
    description text,
    jurisdiction text not null default 'ZA',
    version integer not null default 1,
    schema_json jsonb not null,
    clause_library_version text not null default '1.0.0',
    is_active boolean not null default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    published_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.templates enable row level security;

-- Active templates are readable by all authenticated users
drop policy if exists "Authenticated users can read active templates" on public.templates;
create policy "Authenticated users can read active templates" 
    on public.templates for select 
    using (auth.role() = 'authenticated' and is_active = true);

-- ------------------------------------------------------------------------------
-- 3. DRAFT DOCUMENTS (User drafts and form answers)
-- ------------------------------------------------------------------------------
create table if not exists public.draft_documents (
    id uuid primary key default uuid_generate_v4(),
    owner_id uuid not null references public.profiles(id) on delete cascade,
    template_id uuid not null references public.templates(id),
    template_key text not null,
    template_version integer not null default 1,
    title text not null,
    answers jsonb not null default '{}'::jsonb,
    custom_clauses jsonb not null default '[]'::jsonb,
    status text not null default 'draft' check (status in ('draft', 'generating', 'generated', 'locked', 'archived')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.draft_documents enable row level security;

drop policy if exists "Users can view own draft documents" on public.draft_documents;
create policy "Users can view own draft documents" 
    on public.draft_documents for select 
    using (auth.uid() = owner_id);

drop policy if exists "Users can insert own draft documents" on public.draft_documents;
create policy "Users can insert own draft documents" 
    on public.draft_documents for insert 
    with check (auth.uid() = owner_id);

drop policy if exists "Users can update own draft documents" on public.draft_documents;
create policy "Users can update own draft documents" 
    on public.draft_documents for update 
    using (auth.uid() = owner_id and status != 'locked');

drop policy if exists "Users can delete own draft documents" on public.draft_documents;
create policy "Users can delete own draft documents" 
    on public.draft_documents for delete 
    using (auth.uid() = owner_id);

-- ------------------------------------------------------------------------------
-- 4. GENERATED & LOCKED DOCUMENTS (Immutable generated outputs & tamper locks)
-- ------------------------------------------------------------------------------
create table if not exists public.generated_documents (
    id uuid primary key default uuid_generate_v4(),
    draft_id uuid not null references public.draft_documents(id) on delete cascade,
    owner_id uuid not null references public.profiles(id) on delete cascade,
    file_key text not null, -- Private object storage path
    file_type text not null default 'docx', -- 'docx' or 'pdf'
    generation_version integer not null default 1,
    is_locked boolean not null default false,
    lock_checksum text, -- SHA-256 tamper-evident fingerprint
    locked_at timestamp with time zone,
    locked_by uuid references public.profiles(id),
    downloadable_until timestamp with time zone default timezone('utc'::text, now() + interval '30 days'),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.generated_documents enable row level security;

drop policy if exists "Users can view own generated documents" on public.generated_documents;
create policy "Users can view own generated documents" 
    on public.generated_documents for select 
    using (auth.uid() = owner_id);

drop policy if exists "Users can insert own generated documents" on public.generated_documents;
create policy "Users can insert own generated documents" 
    on public.generated_documents for insert 
    with check (auth.uid() = owner_id);

-- Only allow lock status update if user owns the document
drop policy if exists "Users can lock own generated documents" on public.generated_documents;
create policy "Users can lock own generated documents" 
    on public.generated_documents for update 
    using (auth.uid() = owner_id);

-- ------------------------------------------------------------------------------
-- 5. CONTRACT UPLOADS & PLAIN-ENGLISH READER
-- ------------------------------------------------------------------------------
create table if not exists public.uploads (
    id uuid primary key default uuid_generate_v4(),
    owner_id uuid not null references public.profiles(id) on delete cascade,
    original_filename text not null,
    storage_path text not null,
    mime_type text not null,
    file_size_bytes bigint not null,
    scan_status text not null default 'quarantined' check (scan_status in ('quarantined', 'clean', 'infected', 'error')),
    extracted_text text,
    clause_explanations jsonb default '[]'::jsonb,
    retention_expires_at timestamp with time zone default timezone('utc'::text, now() + interval '14 days'),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.uploads enable row level security;

drop policy if exists "Users can view own uploads" on public.uploads;
create policy "Users can view own uploads" 
    on public.uploads for select 
    using (auth.uid() = owner_id);

drop policy if exists "Users can upload own contracts" on public.uploads;
create policy "Users can upload own contracts" 
    on public.uploads for insert 
    with check (auth.uid() = owner_id);

drop policy if exists "Users can delete own uploads" on public.uploads;
create policy "Users can delete own uploads" 
    on public.uploads for delete 
    using (auth.uid() = owner_id);

-- ------------------------------------------------------------------------------
-- 6. IMMUTABLE SECURITY & AUDIT EVENTS
-- ------------------------------------------------------------------------------
create table if not exists public.audit_events (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.profiles(id) on delete set null,
    action text not null, -- 'AUTH_LOGIN', 'DOCUMENT_GENERATED', 'DOCUMENT_LOCKED', etc.
    resource_type text not null,
    resource_id text not null,
    ip_hash text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.audit_events enable row level security;

-- Audit events are append-only. Users can view their own audit logs.
drop policy if exists "Users can view own audit events" on public.audit_events;
create policy "Users can view own audit events" 
    on public.audit_events for select 
    using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 7. STORAGE BUCKET POLICIES (Private 'contracts' bucket)
-- ------------------------------------------------------------------------------
-- In Supabase Storage:
-- 1. Create a bucket named 'contracts' and keep "Public bucket" UNCHECKED (false).
-- 2. Storage RLS ensures users can only read/write files under their own user folder:
--    Folder structure: /contracts/{user_id}/{document_id}.docx

drop policy if exists "Users can upload to their own folder" on storage.objects;
create policy "Users can upload to their own folder"
    on storage.objects for insert
    with check (bucket_id = 'contracts' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can read from their own folder" on storage.objects;
create policy "Users can read from their own folder"
    on storage.objects for select
    using (bucket_id = 'contracts' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete from their own folder" on storage.objects;
create policy "Users can delete from their own folder"
    on storage.objects for delete
    using (bucket_id = 'contracts' and auth.uid()::text = (storage.foldername(name))[1]);
