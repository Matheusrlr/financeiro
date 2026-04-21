-- ============================================================
-- RLS (Row Level Security) — Feature 1.2
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights_cache ENABLE ROW LEVEL SECURITY;

-- Políticas: cada usuário vê apenas seus próprios dados
CREATE POLICY "users_own_cards" ON cards
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users_own_documents" ON documents
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users_own_transactions" ON transactions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users_own_insights" ON insights_cache
  FOR ALL USING (user_id = auth.uid());
