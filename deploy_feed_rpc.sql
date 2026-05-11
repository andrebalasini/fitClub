-- Dropping first to ensure we can change return type signature
DROP FUNCTION IF EXISTS get_public_feed(int);

CREATE OR REPLACE FUNCTION get_public_feed(p_limit int DEFAULT 15)
RETURNS TABLE (
    id uuid,
    user_id text, -- Correctly matches 'text' column type in tbTreinosCompletos
    ficha_id uuid,
    dia text,
    concluido_em timestamp with time zone,
    duracao_segundos int,
    musculos text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    WITH aggregated_muscles AS (
        SELECT 
            t.ficha_id, 
            t.dia, 
            STRING_AGG(DISTINCT UPPER(e.grupo), ' + ') as calc_musculos
        FROM "tbTreinos" t
        JOIN "tbExercicios" e ON t.exercicio_id = e.id
        GROUP BY t.ficha_id, t.dia
    )
    SELECT 
        tc.id,
        tc.user_id,
        tc.ficha_id,
        tc.dia,
        tc.concluido_em,
        tc.duracao_segundos,
        COALESCE(am.calc_musculos, 'Treino Livre') as musculos
    FROM "tbTreinosCompletos" tc
    LEFT JOIN aggregated_muscles am ON tc.ficha_id = am.ficha_id AND tc.dia = am.dia
    WHERE tc.duracao_segundos >= 60
    ORDER BY tc.concluido_em DESC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_feed(int) TO anon, authenticated;
