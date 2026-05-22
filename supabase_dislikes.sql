-- ====================================================================
-- Script SQL para Supabase - Funcionalidade de Deslike (Não Útil) nos Relatos
-- ====================================================================

-- 1. Criar a tabela de deslikes se ela não existir
CREATE TABLE IF NOT EXISTS public.report_dislikes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (report_id, user_id)
);

-- Adicionar comentários explicativos à tabela e colunas
COMMENT ON TABLE public.report_dislikes IS 'Registra os votos de deslike (não útil) de usuários em relatos da comunidade.';
COMMENT ON COLUMN public.report_dislikes.report_id IS 'Referência ao relato que recebeu o deslike.';
COMMENT ON COLUMN public.report_dislikes.user_id IS 'Referência ao usuário autenticado que efetuou o deslike.';

-- 2. Habilitar o Row Level Security (RLS)
ALTER TABLE public.report_dislikes ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas de Acesso de Segurança (RLS)

-- Permite que qualquer usuário (autenticado ou visitante) veja a quantidade de deslikes
CREATE POLICY "Deslikes são públicos para leitura" 
ON public.report_dislikes 
FOR SELECT 
USING (true);

-- Permite que qualquer usuário logado insira um deslike na sua própria conta
CREATE POLICY "Usuários autenticados podem inserir deslikes" 
ON public.report_dislikes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Permite que o usuário remova o seu próprio deslike
CREATE POLICY "Usuários podem remover seus próprios deslikes" 
ON public.report_dislikes 
FOR DELETE 
USING (auth.uid() = user_id);

-- ====================================================================
-- [OPCIONAL] Estrutura complementar de curtidas (report_likes) e respostas (report_replies) 
-- caso necessite rodar em um banco do zero:
-- ====================================================================

/*
CREATE TABLE IF NOT EXISTS public.report_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (report_id, user_id)
);
ALTER TABLE public.report_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Curtidas são públicas para leitura" ON public.report_likes FOR SELECT USING (true);
CREATE POLICY "Usuários autenticados podem curtir" ON public.report_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem remover suas próprias curtidas" ON public.report_likes FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.report_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.report_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Respostas são públicas para leitura" ON public.report_replies FOR SELECT USING (true);
CREATE POLICY "Usuários autenticados podem responder" ON public.report_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
*/
