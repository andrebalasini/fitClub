-- ============================================================
-- Migration: Challenge Video Votes
-- Descrição: Sistema de votação para validação de vídeos de
--            desafio. Um vídeo é validado quando atinge saldo
--            líquido de +3 votos (aprovações - reprovações >= 3).
--            Ao ser validado, o autor recebe +50 fitPoints.
-- ============================================================

-- ── 1. Adicionar colunas de votação na tbFeedEvents ──────────
ALTER TABLE public.tbFeedEvents
  ADD COLUMN IF NOT EXISTS votes_up                 integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS votes_down               integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS validated                boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS validation_points_awarded boolean    NOT NULL DEFAULT false;

-- ── 2. Criar tabela de votos individuais ─────────────────────
CREATE TABLE IF NOT EXISTS public.tbChallengeVotes (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_event_id   uuid        NOT NULL REFERENCES public.tbFeedEvents(id) ON DELETE CASCADE,
  voter_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type       text        NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at      timestamptz DEFAULT now() NOT NULL,
  UNIQUE (feed_event_id, voter_id)  -- cada usuário vota apenas uma vez por vídeo
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS tbChallengeVotes_feed_event_id_idx ON public.tbChallengeVotes(feed_event_id);
CREATE INDEX IF NOT EXISTS tbChallengeVotes_voter_id_idx      ON public.tbChallengeVotes(voter_id);

-- ── 3. Row Level Security na tbChallengeVotes ─────────────────
ALTER TABLE public.tbChallengeVotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tbChallengeVotes_select"
  ON public.tbChallengeVotes FOR SELECT USING (true);

CREATE POLICY "tbChallengeVotes_insert"
  ON public.tbChallengeVotes FOR INSERT
  WITH CHECK (auth.uid() = voter_id);

-- ── 4. Função RPC: vote_challenge_video ───────────────────────
-- Registra ou atualiza o voto de um usuário em um vídeo de desafio.
-- Se o saldo líquido atingir +3, o vídeo é validado e o autor
-- recebe +50 fitPoints (uma única vez).
CREATE OR REPLACE FUNCTION public.vote_challenge_video(
  p_event_id  uuid,
  p_voter_id  uuid,
  p_vote_type text   -- 'up' ou 'down'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event         public.tbFeedEvents%ROWTYPE;
  v_net_votes     integer;
  v_existing_vote text;
BEGIN
  -- Validar tipo de voto
  IF p_vote_type NOT IN ('up', 'down') THEN
    RAISE EXCEPTION 'invalid_vote_type';
  END IF;

  -- Buscar o evento
  SELECT * INTO v_event FROM public.tbFeedEvents WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_found';
  END IF;

  -- Impedir que o próprio autor vote no próprio vídeo
  IF v_event.user_id = p_voter_id THEN
    RAISE EXCEPTION 'cannot_vote_own_video';
  END IF;

  -- Verificar se já votou
  SELECT vote_type INTO v_existing_vote
  FROM public.tbChallengeVotes
  WHERE feed_event_id = p_event_id AND voter_id = p_voter_id;

  IF FOUND THEN
    IF v_existing_vote = p_vote_type THEN
      -- Mesmo voto: remover (toggle off)
      DELETE FROM public.tbChallengeVotes
      WHERE feed_event_id = p_event_id AND voter_id = p_voter_id;
    ELSE
      -- Voto diferente: atualizar
      UPDATE public.tbChallengeVotes
      SET vote_type = p_vote_type
      WHERE feed_event_id = p_event_id AND voter_id = p_voter_id;
    END IF;
  ELSE
    -- Novo voto
    INSERT INTO public.tbChallengeVotes (feed_event_id, voter_id, vote_type)
    VALUES (p_event_id, p_voter_id, p_vote_type);
  END IF;

  -- Recalcular contadores no evento
  UPDATE public.tbFeedEvents
  SET
    votes_up   = (SELECT COUNT(*) FROM public.tbChallengeVotes WHERE feed_event_id = p_event_id AND vote_type = 'up'),
    votes_down = (SELECT COUNT(*) FROM public.tbChallengeVotes WHERE feed_event_id = p_event_id AND vote_type = 'down')
  WHERE id = p_event_id
  RETURNING * INTO v_event;

  -- Calcular saldo líquido
  v_net_votes := v_event.votes_up - v_event.votes_down;

  -- Validar se ainda não foi validado e saldo >= +3
  IF v_net_votes >= 3 AND NOT v_event.validated THEN
    UPDATE public.tbFeedEvents
    SET validated = true
    WHERE id = p_event_id;

    -- Conceder +50 fitPoints ao autor (apenas uma vez)
    IF NOT v_event.validation_points_awarded THEN
      UPDATE public.tbFeedEvents
      SET validation_points_awarded = true
      WHERE id = p_event_id;

      INSERT INTO public.tbFitPoints (user_id, pontos, motivo)
      VALUES (v_event.user_id, 50, 'challenge_validated');
    END IF;
  END IF;

  -- Rebuscar estado final para retornar
  SELECT * INTO v_event FROM public.tbFeedEvents WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'votes_up',   v_event.votes_up,
    'votes_down', v_event.votes_down,
    'net_votes',  v_event.votes_up - v_event.votes_down,
    'validated',  v_event.validated
  );
END;
$$;

-- Permitir que usuários autenticados chamem a função
GRANT EXECUTE ON FUNCTION public.vote_challenge_video(uuid, uuid, text) TO authenticated;
