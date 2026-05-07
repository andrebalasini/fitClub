-- Tabelas Arena
CREATE TABLE IF NOT EXISTS public."tbArenaRecords" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_name TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    carga NUMERIC NOT NULL,
    video_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'challenger' CHECK (status IN ('challenger', 'top_fit')),
    likes INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    promoted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public."tbArenaVotes" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES public."tbArenaRecords"(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(record_id, user_id)
);

CREATE TABLE IF NOT EXISTS public."tbArenaComments" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES public."tbArenaRecords"(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public."tbArenaRecords" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tbArenaVotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tbArenaComments" ENABLE ROW LEVEL SECURITY;

-- Policies for tbArenaRecords
CREATE POLICY "Public read tbArenaRecords" ON public."tbArenaRecords" FOR SELECT USING (true);
CREATE POLICY "Users can insert tbArenaRecords" ON public."tbArenaRecords" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tbArenaRecords" ON public."tbArenaRecords" FOR UPDATE USING (auth.uid() = user_id);

-- Policies for tbArenaVotes
CREATE POLICY "Public read tbArenaVotes" ON public."tbArenaVotes" FOR SELECT USING (true);
CREATE POLICY "Users can insert tbArenaVotes" ON public."tbArenaVotes" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tbArenaVotes" ON public."tbArenaVotes" FOR DELETE USING (auth.uid() = user_id);

-- Policies for tbArenaComments
CREATE POLICY "Public read tbArenaComments" ON public."tbArenaComments" FOR SELECT USING (true);
CREATE POLICY "Users can insert tbArenaComments" ON public."tbArenaComments" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tbArenaComments" ON public."tbArenaComments" FOR DELETE USING (auth.uid() = user_id);

-- Função RPC para incrementar likes e checar liderança
CREATE OR REPLACE FUNCTION vote_arena_record(p_record_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_exercise_name TEXT;
    v_record_likes INT;
    v_current_top_fit_likes INT;
    v_current_top_fit_id UUID;
BEGIN
    -- Verifica se já votou
    IF EXISTS (SELECT 1 FROM public."tbArenaVotes" WHERE record_id = p_record_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'User already voted';
    END IF;

    -- Insere o voto
    INSERT INTO public."tbArenaVotes" (record_id, user_id) VALUES (p_record_id, p_user_id);

    -- Atualiza os likes
    UPDATE public."tbArenaRecords"
    SET likes = likes + 1
    WHERE id = p_record_id
    RETURNING exercise_name, likes INTO v_exercise_name, v_record_likes;

    -- Adiciona 10 fitPoints pro dono do vídeo por receber um voto
    INSERT INTO public."tbFitPoints" (user_id, pontos, motivo)
    SELECT user_id, 10, 'arena_like_recebido'
    FROM public."tbArenaRecords"
    WHERE id = p_record_id;

    -- Verifica o top_fit atual do exercício
    SELECT id, likes INTO v_current_top_fit_id, v_current_top_fit_likes
    FROM public."tbArenaRecords"
    WHERE exercise_name = v_exercise_name AND status = 'top_fit'
    LIMIT 1;

    -- Se não tem top fit, ou se o desafiante ultrapassou o top fit
    IF v_current_top_fit_id IS NULL THEN
        UPDATE public."tbArenaRecords" SET status = 'top_fit', promoted_at = NOW() WHERE id = p_record_id;
    ELSIF v_record_likes > v_current_top_fit_likes AND v_current_top_fit_id != p_record_id THEN
        -- Rebaixa o antigo
        UPDATE public."tbArenaRecords" SET status = 'challenger' WHERE id = v_current_top_fit_id;
        -- Promove o novo
        UPDATE public."tbArenaRecords" SET status = 'top_fit', promoted_at = NOW() WHERE id = p_record_id;
        
        -- Adiciona bônus gordo de fitPoints pela promoção
        INSERT INTO public."tbFitPoints" (user_id, pontos, motivo)
        SELECT user_id, 1000, 'arena_novo_rei'
        FROM public."tbArenaRecords"
        WHERE id = p_record_id;
    END IF;
END;
$$;
