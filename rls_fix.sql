-- Correção de RLS (Row Level Security) para permitir o cadastro de novas linhas pelo Dashboard

-- Permite que usuários insiram novas linhas
CREATE POLICY "Permitir inserção de linhas" ON public.lines FOR INSERT WITH CHECK (true);

-- (Opcional) Permite atualização e exclusão, caso você queira editar as linhas no futuro
CREATE POLICY "Permitir atualização de linhas" ON public.lines FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de linhas" ON public.lines FOR DELETE USING (true);
