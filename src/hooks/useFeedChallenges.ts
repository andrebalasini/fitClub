import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface FeedChallenge {
  exercicioId: string;
  exercicioNome: string;
  fichaId: string;
  dia: string;
  grupos: string[];
  myBestCarga: number;
  rivalCarga: number;
  gapKg: number;
  progressPercent: number;
  rivalName: string;
  rivalAvatarUrl: string;
  rivalUserId?: string;
}

interface TopEntry {
  user_id: string;
  nome: string;
  score: number;
}

interface FeedChallengesResult {
  challenges: FeedChallenge[];
  loading: boolean;
  myAvatarUrl: string;
  hasWorkouts: boolean;
}

/**
 * Fetches personalized rival challenges using the existing community_exercise_stats RPC
 * (SECURITY DEFINER — can read all users' data without RLS restrictions).
 *
 * Flow:
 * 1. Get user's ficha IDs → 2. Get all unique exercises from those fichas
 * 3. Get user's personal best per exercise (own data, RLS ok)
 * 4. For each exercise call community_exercise_stats → find the next highest load above the user's PR
 * 5. Sort by smallest gap and return top 10
 */
export function useFeedChallenges(): FeedChallengesResult {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<FeedChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [myAvatarUrl, setMyAvatarUrl] = useState('');
  const [hasWorkouts, setHasWorkouts] = useState(true); // assume true until proven false

  useEffect(() => {
    if (!user?.id) return;

    async function fetchChallenges() {
      try {
        setLoading(true);

        // ── Confirm active session ────────────────────────────────────────
        const { data: sessionData } = await supabase.auth.getSession();
        let session = sessionData?.session;

        if (session) {
          const isExpired = session.expires_at ? (session.expires_at * 1000 < Date.now()) : false;
          if (isExpired) {
            console.log('[useFeedChallenges] JWT is expired. Refreshing session...');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshData?.session) {
              session = refreshData.session;
            } else {
              console.warn('[useFeedChallenges] Session refresh failed:', refreshError?.message);
              supabase.auth.signOut();
              setChallenges([]);
              return;
            }
          }
        }

        if (!session) {
          console.warn('[useFeedChallenges] No active session');
          setChallenges([]);
          return;
        }
        const userId = session.user.id;

        // ── Fetch leaderboard (SECURITY DEFINER — bypasses RLS) ──────────
        // This single call gives us avatar_url + nome for every user,
        // covering both the current user and all rivals.
        const { data: lbRaw } = await supabase.rpc('leaderboard_temporada' as any);
        const leaderboard: Array<{ user_id: string; nome: string; avatar_url: string }> =
          Array.isArray(lbRaw) ? lbRaw : [];

        const lbAvatarMap = new Map<string, string>();
        leaderboard.forEach((entry) => lbAvatarMap.set(entry.user_id, entry.avatar_url || ''));

        // Own avatar from leaderboard
        setMyAvatarUrl(lbAvatarMap.get(userId) || '');

        // ── Step 1: User's ficha IDs ──────────────────────────────────────
        const { data: fichasData, error: fichasError } = await supabase
          .from('tbFichas')
          .select('id')
          .eq('user_id', userId);

        if (fichasError || !fichasData || fichasData.length === 0) {
          if (fichasError && (fichasError.message?.includes('JWT expired') || (fichasError as any).status === 401)) {
            console.warn('[useFeedChallenges] JWT expired. Redirecting to login...');
            supabase.auth.signOut().then(() => {
              window.location.href = '/login';
            });
            return;
          }
          console.warn('[useFeedChallenges] No fichas:', fichasError?.message);
          setHasWorkouts(false);
          setChallenges([]);
          return;
        }
        
        setHasWorkouts(true);
        const fichaIds = fichasData.map((f) => f.id);

        // ── Step 2: All exercises from user's fichas (deduplicated) ───────
        const { data: treinosData, error: treinosError } = await supabase
          .from('tbTreinos')
          .select('exercicio_id, dia, ficha_id, tbExercicios(nome, grupo)')
          .in('ficha_id', fichaIds);

        if (treinosError || !treinosData || treinosData.length === 0) {
          console.warn('[useFeedChallenges] No exercises in fichas:', treinosError?.message);
          setChallenges([]);
          return;
        }

        // Deduplicate by exercicio_id
        const exerciseMap = new Map<string, {
          exercicioId: string;
          exercicioNome: string;
          fichaId: string;
          dia: string;
          grupos: string[];
        }>();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        treinosData.forEach((row: any) => {
          if (!row.exercicio_id || exerciseMap.has(row.exercicio_id)) return;
          exerciseMap.set(row.exercicio_id, {
            exercicioId: row.exercicio_id,
            exercicioNome: row.tbExercicios?.nome || 'Exercício',
            fichaId: row.ficha_id,
            dia: row.dia || 'A',
            grupos: row.tbExercicios?.grupo ? [row.tbExercicios.grupo] : [],
          });
        });

        const exerciseIds = Array.from(exerciseMap.keys());
        console.log('[useFeedChallenges] Exercises found in fichas:', exerciseIds.length);

        // ── Step 3: User's personal best per exercise ─────────────────────
        // Pre-populate all exercises with 0 (unlogged = baseline zero)
        const myBestMap = new Map<string, number>();
        exerciseIds.forEach((id) => myBestMap.set(id, 0));

        const { data: myHistorico } = await supabase
          .from('tbHistorico')
          .select('exercicio_id, carga_usada')
          .eq('user_id', userId)
          .in('exercicio_id', exerciseIds)
          .gte('carga_usada', 0);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (myHistorico || []).forEach((row: any) => {
          const current = myBestMap.get(row.exercicio_id) ?? 0;
          if (row.carga_usada > current) {
            myBestMap.set(row.exercicio_id, row.carga_usada);
          }
        });

        console.log('[useFeedChallenges] myBestMap:', Object.fromEntries(myBestMap));

        // ── Step 4: For each exercise, call community_exercise_stats RPC ──
        // This RPC runs with SECURITY DEFINER so it can read all users' data.
        // We batch with Promise.all — the RPC already exists and is proven to work.
        const communityResults = await Promise.all(
          exerciseIds.map(async (exercicioId) => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data, error } = await (supabase.rpc as any)('community_exercise_stats', {
                p_exercicio_id: exercicioId,
                p_user_id: userId,
              });
              if (error) {
                console.warn(`[useFeedChallenges] RPC error for ${exercicioId}:`, error.message);
                return null;
              }
              return { exercicioId, data };
            } catch {
              return null;
            }
          })
        );

        // ── Step 5: Find the next load above user's PR from community top ─
        const resolvedChallenges: FeedChallenge[] = [];

        for (const result of communityResults) {
          if (!result || !result.data) continue;

          const { exercicioId, data: communityData } = result;
          const exerciseInfo = exerciseMap.get(exercicioId);
          if (!exerciseInfo) continue;

          const myBest = myBestMap.get(exercicioId) ?? 0;
          const topCarga: TopEntry[] = communityData.top_carga || [];

          if (topCarga.length === 0) continue;

          // Sort by score ascending so we can find the closest one above myBest
          const sorted = [...topCarga].sort((a, b) => a.score - b.score);

          // Find the entry with the smallest score strictly above user's PR
          const rival = sorted.find((entry) => entry.score > myBest && entry.user_id !== userId);

          if (!rival) continue; // User is the community leader for this exercise

          const gapKg    = Math.round((rival.score - myBest) * 10) / 10;
          const rivalMax = rival.score;
          const progressPercent = rivalMax > 0
            ? Math.min(99, Math.round((myBest / rivalMax) * 100))
            : 0;

          // Fetch rival's avatar separately (community_exercise_stats may not include it)
          resolvedChallenges.push({
            exercicioId,
            exercicioNome: exerciseInfo.exercicioNome,
            fichaId: exerciseInfo.fichaId,
            dia: exerciseInfo.dia,
            grupos: exerciseInfo.grupos,
            myBestCarga: myBest,
            rivalCarga: rival.score,
            gapKg,
            progressPercent,
            rivalName: rival.nome || 'Rival',
            rivalAvatarUrl: '', // fetched below in batch
            rivalUserId: rival.user_id,
          });
        }

        console.log('[useFeedChallenges] Resolved challenges before avatar fetch:', resolvedChallenges.length);

        if (resolvedChallenges.length === 0) {
          console.warn('[useFeedChallenges] No challenges found — user may be the community leader in all exercises, or no other users have data.');
          setChallenges([]);
          return;
        }

        // ── Step 6: Resolve rival avatars from leaderboard map ───────────
        // lbAvatarMap already contains avatar_url for all users (no RLS).
        resolvedChallenges.forEach((challenge) => {
          if (challenge.rivalUserId) {
            challenge.rivalAvatarUrl = lbAvatarMap.get(challenge.rivalUserId) || '';
          }
        });

        // ── Step 7: Sort by gap ascending, cap at 10 ─────────────────────
        const finalChallenges = resolvedChallenges
          .sort((a, b) => a.gapKg - b.gapKg)
          .slice(0, 10);

        console.log('[useFeedChallenges] Final challenges:', finalChallenges);
        setChallenges(finalChallenges);

      } catch (err) {
        console.error('[useFeedChallenges] Unexpected error:', err);
        setChallenges([]);
      } finally {
        setLoading(false);
      }
    }

    fetchChallenges();
  }, [user?.id]);

  return { challenges, loading, myAvatarUrl, hasWorkouts };
}
