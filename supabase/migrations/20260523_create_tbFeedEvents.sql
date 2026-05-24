-- ============================================================
-- Migration: tbFeedEvents
-- Descrição: Tabela para registrar eventos de vitória em
--            desafios do ChallengesCarousel (ex: "João superou
--            André no Supino Reto")
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tbFeedEvents (
  id            uuid              DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid              NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type    text              NOT NULL DEFAULT 'challenge_victory',
  -- Dados do evento de vitória
  challenger_name   text          NOT NULL,   -- Nome do usuário vencedor
  rival_name        text          NOT NULL,   -- Nome do rival superado
  exercise_name     text          NOT NULL,   -- Nome do exercício
  challenger_carga  numeric,                  -- Carga do vencedor (opcional)
  rival_carga       numeric,                  -- Carga do rival superado
  video_url         text,                     -- URL pública do vídeo no Supabase Storage
  created_at    timestamptz       DEFAULT now() NOT NULL
);

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS tbFeedEvents_user_id_idx    ON public.tbFeedEvents(user_id);
CREATE INDEX IF NOT EXISTS tbFeedEvents_created_at_idx ON public.tbFeedEvents(created_at DESC);
CREATE INDEX IF NOT EXISTS tbFeedEvents_event_type_idx ON public.tbFeedEvents(event_type);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.tbFeedEvents ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode LER todos os eventos (feed público do clube)
CREATE POLICY "tbFeedEvents_select_policy"
  ON public.tbFeedEvents
  FOR SELECT
  USING (true);

-- Somente o próprio usuário pode INSERIR seus eventos
CREATE POLICY "tbFeedEvents_insert_policy"
  ON public.tbFeedEvents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Somente o próprio usuário pode DELETAR seus eventos
CREATE POLICY "tbFeedEvents_delete_policy"
  ON public.tbFeedEvents
  FOR DELETE
  USING (auth.uid() = user_id);

-- ── Bucket check: garantir que o path 'challenge-proofs/' existe no bucket 'videos' ──
-- (O bucket 'videos' já existe — apenas certifique-se que permite uploads públicos
--  ou configure políticas de storage adequadas no Supabase Dashboard)
