-- Correção v2 de RLS (Row Level Security) para o Dashboard Admin Completo
-- Isso permite deletar e inserir nas tabelas "stops" e "reports"

-- Políticas para a tabela de Pontos de Ônibus (stops)
CREATE POLICY "Permitir inserção de pontos" ON public.stops FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir exclusão de pontos" ON public.stops FOR DELETE USING (true);
CREATE POLICY "Permitir atualização de pontos" ON public.stops FOR UPDATE USING (true);

-- Políticas para a tabela de Alertas/Relatos (reports)
CREATE POLICY "Permitir inserção de relatos" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir exclusão de relatos" ON public.reports FOR DELETE USING (true);
CREATE POLICY "Permitir atualização de relatos" ON public.reports FOR UPDATE USING (true);

-- Políticas para garantir que linhas possam ser apagadas (caso você queira deletar a linha do painel no futuro)
CREATE POLICY "Permitir exclusão de linhas" ON public.lines FOR DELETE USING (true);
