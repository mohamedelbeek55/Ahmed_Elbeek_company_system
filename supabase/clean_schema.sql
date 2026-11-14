-- Ahmed Elbeek Management System - Production Clean Schema
-- No fake/mock convoys. Only required foundational tables, settings, locations & storage.

-- 1. Create Loading Locations Table
CREATE TABLE IF NOT EXISTS public.loading_locations (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert the two mandatory loading locations
INSERT INTO public.loading_locations (id, name_ar, name_en) VALUES
    ('rafah', 'ميناء رفح', 'Rafah Port'),
    ('al_awja', 'ميناء العوجة', 'Al-Awja Port')
ON CONFLICT (id) DO UPDATE SET 
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en;

-- 2. Create Convoys Table
CREATE TABLE IF NOT EXISTS public.convoys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    convoy_number TEXT UNIQUE NOT NULL,
    cargo_name TEXT NOT NULL,
    location_id TEXT NOT NULL REFERENCES public.loading_locations(id) ON DELETE RESTRICT,
    truck_count INTEGER NOT NULL CHECK (truck_count > 0),
    loading_date DATE NOT NULL,
    completion_date DATE,
    route_notes TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create Drivers & Trucks Manifest Table
CREATE TABLE IF NOT EXISTS public.convoy_trucks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    convoy_id UUID NOT NULL REFERENCES public.convoys(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    political_destination TEXT,
    driver_name TEXT NOT NULL,
    national_id TEXT,
    truck_plate TEXT NOT NULL,
    trailer_plate TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_convoy_truck_seq UNIQUE (convoy_id, sequence_number)
);

-- 4. Create Cost Calculations Table
CREATE TABLE IF NOT EXISTS public.cost_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    convoy_id UUID NOT NULL UNIQUE REFERENCES public.convoys(id) ON DELETE CASCADE,
    loading_date DATE NOT NULL,
    completion_date DATE NOT NULL,
    accommodation_nights INTEGER NOT NULL CHECK (accommodation_nights >= 0),
    daily_accommodation_rate NUMERIC(12, 2) NOT NULL DEFAULT 500.00,
    total_accommodation NUMERIC(14, 2) NOT NULL,
    freight_rate_per_truck NUMERIC(12, 2) NOT NULL DEFAULT 8500.00,
    total_freight NUMERIC(14, 2) NOT NULL,
    customs_clearance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    additional_expenses NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    additional_expenses_notes TEXT,
    grand_total NUMERIC(14, 2) NOT NULL,
    average_cost_per_truck NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EGP',
    calculated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create Issued Documents Table (Statements Archive)
CREATE TABLE IF NOT EXISTS public.issued_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    convoy_id UUID NOT NULL REFERENCES public.convoys(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('statement', 'drivers_manifest')),
    document_number TEXT UNIQUE NOT NULL,
    file_name TEXT NOT NULL,
    storage_path TEXT,
    file_size_bytes INTEGER,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    public_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create Company Settings Table
CREATE TABLE IF NOT EXISTS public.company_settings (
    id TEXT PRIMARY KEY DEFAULT 'primary',
    company_name TEXT NOT NULL DEFAULT 'شركة أحمد البيك للاستيراد والتصدير',
    trade_name_en TEXT DEFAULT 'Ahmed Elbeek Import & Export',
    owner_name TEXT DEFAULT 'أحمد البيك',
    owner_title TEXT DEFAULT 'صاحب الشركة / المدير العام',
    phone TEXT NOT NULL DEFAULT '01093313193',
    email TEXT NOT NULL DEFAULT 'elbeekb2b@gmail.com',
    address TEXT DEFAULT 'العريش، شمال سيناء، جمهورية مصر العربية',
    commercial_registration TEXT DEFAULT '104829',
    tax_id TEXT DEFAULT '692-410-883',
    default_daily_rate NUMERIC(10, 2) DEFAULT 500.00,
    default_freight_rate NUMERIC(10, 2) DEFAULT 8500.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default company settings record
INSERT INTO public.company_settings (id, company_name, owner_name, phone, email)
VALUES ('primary', 'شركة أحمد البيك للاستيراد والتصدير', 'أحمد البيك', '01093313193', 'elbeekb2b@gmail.com')
ON CONFLICT (id) DO UPDATE SET
    phone = EXCLUDED.phone,
    email = EXCLUDED.email;

-- 7. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.loading_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convoys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convoy_trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issued_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- 8. Policies for seamless, secure access
DROP POLICY IF EXISTS "Allow read locations" ON public.loading_locations;
CREATE POLICY "Allow read locations" ON public.loading_locations
    FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Allow full access convoys" ON public.convoys;
CREATE POLICY "Allow full access convoys" ON public.convoys
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access convoy_trucks" ON public.convoy_trucks;
CREATE POLICY "Allow full access convoy_trucks" ON public.convoy_trucks
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access cost_calculations" ON public.cost_calculations;
CREATE POLICY "Allow full access cost_calculations" ON public.cost_calculations
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access issued_documents" ON public.issued_documents;
CREATE POLICY "Allow full access issued_documents" ON public.issued_documents
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access company_settings" ON public.company_settings;
CREATE POLICY "Allow full access company_settings" ON public.company_settings
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 9. Storage Bucket Initialization
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'statements',
    'statements',
    false,
    10485760, -- 10MB
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false;

-- Storage Policy
DROP POLICY IF EXISTS "Allow read statements" ON storage.objects;
CREATE POLICY "Allow read statements" ON storage.objects
    FOR SELECT TO authenticated, anon USING (bucket_id = 'statements');

DROP POLICY IF EXISTS "Allow insert statements" ON storage.objects;
CREATE POLICY "Allow insert statements" ON storage.objects
    FOR INSERT TO authenticated, anon WITH CHECK (bucket_id = 'statements');

DROP POLICY IF EXISTS "Allow delete statements" ON storage.objects;
CREATE POLICY "Allow delete statements" ON storage.objects
    FOR DELETE TO authenticated, anon USING (bucket_id = 'statements');
