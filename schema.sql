-- Schema para MobTracker (Supabase)

-- Habilitar a extensão pgcrypto para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de Linhas
CREATE TABLE IF NOT EXISTS public.lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    route TEXT,
    extra_info TEXT,
    popular BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Pontos
CREATE TABLE IF NOT EXISTS public.stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    lines JSONB DEFAULT '[]'::jsonb, -- Array de IDs ou Nomes de linhas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Relatos
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('positive', 'negative', 'warning')),
    description TEXT NOT NULL,
    author TEXT DEFAULT 'Anônimo',
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Vincula ao Auth do Supabase
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir dados iniciais (Mock Data) para não começar vazio
INSERT INTO public.lines (id, name, description, route, extra_info, popular) VALUES 
('11111111-1111-1111-1111-111111111111', '01', 'Padre Marcelo / Paiol / Favorino X Vila Velha I / Vila Velha II / Germana', 'Padre Marcelo -> Vila Velha', 'Linha que atende os bairros Padre Marcelo, Paiol...', true),
('22222222-2222-2222-2222-222222222222', '10', 'Terras do Vale', 'Centro -> Eugênio de Melo', 'Linha que conecta o Centro ao bairro...', true),
('33333333-3333-3333-3333-333333333333', '08', 'Tijuco Preto X Jd. Panorama', 'Tijuco Preto -> Panorama', '', false);

INSERT INTO public.stops (id, name, location, lat, lng, lines) VALUES 
('44444444-4444-4444-4444-444444444444', 'Terminal Padre Marcelo', 'Centro', -23.100, -45.700, '["01", "04", "06", "08", "10"]'::jsonb),
('55555555-5555-5555-5555-555555555555', 'Terminal Centro', 'Centro', -23.102, -45.705, '["01", "05", "07", "09", "10", "13"]'::jsonb);

INSERT INTO public.reports (line_id, type, description, author) VALUES 
('08', 'positive', '"Graças ao Mobtracker não perco mais o horário"', 'Anônimo'),
('01', 'negative', '"Ônibus vive quebrando"', 'Lucas'),
('10', 'warning', '"Atraso de 20 minutos hoje"', 'Joana');

-- Políticas de RLS (Row Level Security) - Leitura pública, Escrita apenas logado
ALTER TABLE public.lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Linhas são públicas para leitura" ON public.lines FOR SELECT USING (true);
CREATE POLICY "Pontos são públicos para leitura" ON public.stops FOR SELECT USING (true);
CREATE POLICY "Relatos são públicos para leitura" ON public.reports FOR SELECT USING (true);

-- Permite insert nos relatos se estiver logado (ou anonimo provisoriamente)
CREATE POLICY "Qualquer um pode inserir relato" ON public.reports FOR INSERT WITH CHECK (true);
