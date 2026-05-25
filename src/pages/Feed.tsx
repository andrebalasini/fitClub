import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ThumbsUp, ThumbsDown, Share2, Trophy, Dumbbell, Clock, Sword, CheckCircle2, MessageSquare } from 'lucide-react';
import { ChallengesCarousel } from '../components/ChallengesCarousel';
import { showToast } from '../components/Toast';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  user_id: string;
  nome: string;
  cidade: string;
  academia: string | null;
  peso: number | null;
  total_pontos: number;
  total_treinos: number;
  avatar_url: string;
}

interface TreinoCompleto {
  id: string;
  user_id: string;
  ficha_id: string;
  dia: string;
  concluido_em: string;
  duracao_segundos: number;
  musculos: string;
}

interface FeedCard {
  id: string;
  user_id: string;
  user_name: string;
  avatar_url: string;
  workout_day: string;
  concluido_em: string;
  duracao_min: number;
  musculos: string;
  fitPointsEarned: number;
  ranking_pos: number;
  total_treinos: number;
  cidade: string;
  // For challenge victory cards
  cardType?: 'workout' | 'challenge_victory';
  challengerName?: string;
  rivalName?: string;
  exerciseName?: string;
  videoUrl?: string;
  rawDate?: string; // ISO string for sorting
  // Voting fields
  votesUp?: number;
  votesDown?: number;
  validated?: boolean;
  feedEventId?: string;
  myVote?: 'up' | 'down' | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatActivityDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = Math.abs(now.getTime() - date.getTime());
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffH < 24) return `há ${diffH}h`;
  if (diffD === 1) return 'ontem';
  return `${diffD} dias atrás`;
}

function getDiaLabel(diaRaw: string): string {
  if (!diaRaw) return 'Treino Livre';
  const val = diaRaw.toUpperCase();
  if (val === 'LIVRE') return 'Treino Livre';
  return diaRaw.length <= 2 ? `Treino ${val}` : diaRaw;
}

// ─── Component ───────────────────────────────────────────────────────────────

const NET_VOTES_NEEDED = 3;

export function Feed() {
  const { user } = useAuth();
  const [feedCards, setFeedCards] = useState<FeedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{
    nome: string;
    avatar_url: string;
    fitPoints: number;
    rank: number;
  } | null>(null);

  // Load current user stats from leaderboard RPC
  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: lb } = await supabase.rpc('leaderboard_temporada' as any);
        if (!lb || !Array.isArray(lb)) return;

        const leaderboard = lb as LeaderboardEntry[];
        const rank = leaderboard.findIndex((e) => e.user_id === user.id) + 1;
        const entry = leaderboard.find((e) => e.user_id === user.id);

        if (entry) {
          setCurrentUser({
            nome: entry.nome,
            avatar_url: entry.avatar_url,
            fitPoints: entry.total_pontos,
            rank: rank > 0 ? rank : leaderboard.length,
          });
        }
      } catch (err) {
        console.error('Error loading current user:', err);
      }
    }
    loadCurrentUser();
  }, []);

  // Load feed from real data: treinos + leaderboard
  useEffect(() => {
    async function loadFeed() {
      try {
        setLoading(true);

        // 1. Fetch leaderboard (has user names, avatars, points, rank)
        const { data: lbRaw } = await supabase.rpc('leaderboard_temporada' as any);
        const leaderboard: LeaderboardEntry[] = Array.isArray(lbRaw) ? lbRaw : [];

        // Build lookup map: user_id → leaderboard entry + rank position
        const lbMap = new Map<string, LeaderboardEntry & { rank: number }>();
        leaderboard.forEach((entry, idx) => {
          lbMap.set(entry.user_id, { ...entry, rank: idx + 1 });
        });

        // 2. Fetch recent completed workouts dynamically aggregated from DB RPC (Security Definer bypasses individual RLS)
        const { data: treinos, error } = await supabase.rpc('get_public_feed', { p_limit: 15 } as any);

        if (error) throw error;
        const validTreinos: TreinoCompleto[] = treinos ?? [];

        // 4. Build FitPoints map from tbFitPoints (pontos por treino)
        const { data: fpData } = await supabase
          .from('tbFitPoints')
          .select('user_id, pontos, motivo')
          .eq('motivo', 'treino_concluido');

        const fpCountMap = new Map<string, number>();
        (fpData ?? []).forEach((fp: { user_id: string; pontos: number; motivo: string }) => {
          fpCountMap.set(fp.user_id, (fpCountMap.get(fp.user_id) ?? 0) + fp.pontos);
        });

        // 5. Fetch challenge victory events from tbfeedevents
        const { data: feedEvents } = await supabase
          .from('tbfeedevents')
          .select('*')
          .eq('event_type', 'challenge_victory')
          .order('created_at', { ascending: false })
          .limit(15);

        // 6. Map treinos → FeedCard
        const workoutCards: FeedCard[] = validTreinos.map((t: TreinoCompleto) => {
          const lb = lbMap.get(t.user_id);
          const duracaoMin = Math.round(t.duracao_segundos / 60);

          return {
            id: t.id,
            user_id: t.user_id,
            user_name: lb?.nome ?? 'Atleta',
            avatar_url: lb?.avatar_url ?? '',
            workout_day: getDiaLabel(t.dia),
            concluido_em: formatActivityDate(t.concluido_em),
            duracao_min: duracaoMin,
            musculos: t.musculos || 'Treino Livre',
            fitPointsEarned: 100,
            ranking_pos: lb?.rank ?? 99,
            total_treinos: lb?.total_treinos ?? 0,
            cidade: lb?.cidade ?? '',
            cardType: 'workout',
            rawDate: t.concluido_em,
          };
        });

        // 7. Fetch my votes for challenge events
        const eventIds = (feedEvents ?? []).map((ev: any) => ev.id);
        let myVotesMap: Record<string, 'up' | 'down'> = {};
        if (user && eventIds.length > 0) {
          const { data: myVotesData } = await supabase
            .from('tbchallengevotes')
            .select('feed_event_id, vote_type')
            .eq('voter_id', user.id)
            .in('feed_event_id', eventIds);
          (myVotesData ?? []).forEach((v: any) => {
            myVotesMap[v.feed_event_id] = v.vote_type;
          });
        }

        // 8. Map challenge events → FeedCard
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const challengeCards: FeedCard[] = (feedEvents ?? []).map((ev: any) => {
          const lb = lbMap.get(ev.user_id);
          return {
            id: ev.id,
            user_id: ev.user_id,
            user_name: ev.challenger_name || lb?.nome || 'Atleta',
            avatar_url: lb?.avatar_url ?? '',
            workout_day: '',
            concluido_em: formatActivityDate(ev.created_at),
            duracao_min: 0,
            musculos: '',
            fitPointsEarned: 25,
            ranking_pos: lb?.rank ?? 99,
            total_treinos: lb?.total_treinos ?? 0,
            cidade: lb?.cidade ?? '',
            cardType: 'challenge_victory',
            challengerName: ev.challenger_name,
            rivalName: ev.rival_name,
            exerciseName: ev.exercise_name,
            videoUrl: ev.video_url,
            rawDate: ev.created_at,
            votesUp: ev.votes_up ?? 0,
            votesDown: ev.votes_down ?? 0,
            validated: ev.validated ?? false,
            feedEventId: ev.id,
            myVote: myVotesMap[ev.id] ?? null,
          };
        });

        // 9. Merge and sort by date descending
        const allCards = [...workoutCards, ...challengeCards].sort((a, b) => {
          const dA = a.rawDate ? new Date(a.rawDate).getTime() : 0;
          const dB = b.rawDate ? new Date(b.rawDate).getTime() : 0;
          return dB - dA;
        });

        setFeedCards(allCards);
      } catch (err) {
        console.error('Error loading feed:', err);
        setFeedCards([]);
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, [user]);

  // ── Vote on a challenge video ──────────────────────────────────────────────
  const handleVote = useCallback(async (eventId: string, voteType: 'up' | 'down') => {
    if (!user) {
      showToast('Faça login para votar.', 'error');
      return;
    }
    try {
      const { data, error } = await supabase.rpc('vote_challenge_video' as any, {
        p_event_id: eventId,
        p_voter_id: user.id,
        p_vote_type: voteType,
      });
      if (error) throw error;

      const result = data as { votes_up: number; votes_down: number; net_votes: number; validated: boolean };

      // Optimistic UI update
      setFeedCards((prev) =>
        prev.map((c) => {
          if (c.feedEventId !== eventId) return c;
          const prevMyVote = c.myVote;
          const newMyVote = prevMyVote === voteType ? null : voteType;
          return {
            ...c,
            votesUp: result.votes_up,
            votesDown: result.votes_down,
            validated: result.validated,
            myVote: newMyVote,
          };
        })
      );

      if (result.validated) {
        showToast('🏆 Vídeo validado! O atleta ganhou +50 fitPoints!', 'success');
      } else if (voteType === 'up') {
        showToast('✅ Aprovação computada!', 'success');
      } else {
        showToast('❌ Reprovação computada.', 'success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('cannot_vote_own_video')) {
        showToast('Você não pode votar no próprio vídeo.', 'error');
      } else {
        showToast('Erro ao computar voto.', 'error');
      }
    }
  }, [user]);

  return (
    <div
      className="w-full flex flex-col pb-24 pt-1 min-h-screen font-sans select-none"
      style={{ background: '#0f141e' }}
    >
      <div className="px-4 flex flex-col gap-6 pt-1.5 w-full">

        {/* ── Seção 0: Perfil do Usuário Logado ── */}
        {currentUser && (
          <div className="w-full flex items-center justify-between py-3 px-1 animate-[fadeIn_0.25s_ease-out]">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-[48px] h-[48px] rounded-full overflow-hidden flex-shrink-0 bg-slate-800 border border-white/10">
                {currentUser.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-[14px] uppercase">
                    {currentUser.nome.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-none">
                  Bem-vindo(a) de volta
                </span>
                <h2 className="text-white font-extrabold text-[17px] mt-1.5 leading-tight truncate">
                  {currentUser.nome}
                </h2>
              </div>
            </div>
            <div className="flex flex-col items-end flex-shrink-0">
              <div className="font-black text-[14px] tracking-tight leading-none drop-shadow-[0_0_4px_rgba(250,204,21,0.25)]">
                <span className="text-yellow-400 font-black">{currentUser.fitPoints.toLocaleString('pt-BR')} </span>
                <span className="text-white notranslate">fit</span>
                <span className="text-[#4d9fff] notranslate">Points</span>
              </div>
              <span className="text-slate-400 font-bold text-[11px] mt-1.5 leading-none tracking-tight">
                {currentUser.rank}º lugar na temporada
              </span>
            </div>
          </div>
        )}

        {/* ── Seção 1: Desafios ── */}
        <div className="flex flex-col w-full space-y-2 -mt-5">
          <h2 className="text-[#f8fafc] font-bold text-[22px] px-1 tracking-[-0.5px]">Desafios</h2>
          <ChallengesCarousel />
        </div>

        {/* ── Seção 2: Novidades do clube ── */}
        <div className="flex flex-col w-full space-y-2 -mt-3">
          <h2 className="text-[#f8fafc] font-bold text-[22px] px-1 tracking-[-0.5px]">Novidades do clube</h2>

          {loading ? (
            <div className="w-full flex flex-col justify-center items-center py-12 gap-3.5 select-none">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-9 h-9 rounded-full bg-[#1d70f5]/10 animate-ping" />
                <Loader2 size={22} className="animate-spin relative z-10" style={{ color: '#1d70f5' }} />
              </div>
              <span className="text-slate-500 font-bold text-[11px] uppercase tracking-[0.12em] animate-pulse">
                Carregando as novidades...
              </span>
            </div>
          ) : feedCards.length === 0 ? (
            <div className="w-full flex flex-col items-center py-12 gap-3 text-center">
              <Dumbbell size={36} className="text-slate-700" />
              <p className="text-slate-500 font-semibold text-[14px]">
                Nenhum treino registrado ainda.<br />Seja o primeiro a treinar hoje!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {feedCards.map((card) => {
                // ── Challenge Victory Card ──
                if (card.cardType === 'challenge_victory') {
                  const votesUp = card.votesUp ?? 0;
                  const votesDown = card.votesDown ?? 0;
                  const netVotes = votesUp - votesDown;
                  const progressPct = Math.min(100, (netVotes / NET_VOTES_NEEDED) * 100);
                  const isValidated = card.validated ?? false;
                  const isOwnVideo = card.user_id === user?.id;

                  return (
                    <div
                      key={card.id}
                      className="w-full rounded-[24px] p-5 flex flex-col gap-3 shadow-lg overflow-hidden"
                      style={{
                        background: 'linear-gradient(145deg, #0d1f14, #131b2b)',
                        border: isValidated
                          ? '1px solid rgba(34,197,94,0.5)'
                          : '1px solid rgba(34,197,94,0.2)',
                        boxShadow: isValidated
                          ? '0 4px 24px rgba(34,197,94,0.15)'
                          : '0 4px 24px rgba(34,197,94,0.06)',
                      }}
                    >
                      {/* Victory header */}
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-slate-800">
                            {card.avatar_url ? (
                              <img src={card.avatar_url} alt={card.user_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-[14px]">
                                {card.user_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <h3 className="text-white font-bold text-[15px] leading-tight truncate">
                              {card.user_name}
                            </h3>
                            <span className="text-slate-500 text-[11px] font-medium leading-none mt-1">
                              {card.concluido_em}
                            </span>
                          </div>
                        </div>
                        {/* Badge: validado ou fitpoints pendentes */}
                        {isValidated ? (
                          <div
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl flex-shrink-0"
                            style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}
                          >
                            <CheckCircle2 size={13} className="text-green-400" />
                            <span className="text-green-400 font-black text-[10px] uppercase tracking-widest">Validado</span>
                          </div>
                        ) : (
                          <div className="font-black text-[10.5px] tracking-wider leading-none drop-shadow-[0_0_4px_rgba(250,204,21,0.25)] flex-shrink-0 ml-2">
                            <span className="text-yellow-400 font-black">+50 </span>
                            <span className="text-white notranslate">fit</span>
                            <span className="text-[#4d9fff] notranslate">Points</span>
                            <span className="text-slate-500 text-[9px] ml-1 font-medium">ao validar</span>
                          </div>
                        )}
                      </div>

                      {/* Victory announcement */}
                      <div
                        className="flex items-center gap-3 px-4 py-3 rounded-xl"
                        style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.15)' }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(34,197,94,0.15)' }}
                        >
                          <Sword size={16} className="text-green-400" />
                        </div>
                        <span className="text-[#f8fafc] font-bold text-[14px] leading-snug">
                          <span className="text-green-400">{card.challengerName?.split(' ')[0]}</span>
                          {' superou '}
                          <span className="text-red-400">{card.rivalName?.split(' ')[0]}</span>
                          {' no '}
                          <span className="text-white font-black">{card.exerciseName}</span>!
                        </span>
                      </div>

                      {/* Embedded video */}
                      {card.videoUrl && (
                        <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '9/16', maxHeight: '420px' }}>
                          <video
                            src={card.videoUrl}
                            controls
                            playsInline
                            className="w-full h-full object-cover"
                            style={{ maxHeight: '420px' }}
                          />
                        </div>
                      )}

                      {/* ── Validation section ── */}
                      <div
                        className="flex flex-col gap-2.5 px-3.5 py-3 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        {/* Progress header */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                            {isValidated ? '✅ Prova validada pela comunidade' : 'Validação da comunidade'}
                          </span>
                          <span
                            className="font-black text-[11px] tabular-nums"
                            style={{ color: netVotes >= NET_VOTES_NEEDED ? '#22c55e' : netVotes > 0 ? '#facc15' : '#ef4444' }}
                          >
                            {netVotes > 0 ? '+' : ''}{netVotes}/{NET_VOTES_NEEDED}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.max(0, progressPct)}%`,
                              background: isValidated
                                ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                                : 'linear-gradient(90deg, #0047ab, #1d70f5)',
                              boxShadow: isValidated ? '0 0 8px rgba(34,197,94,0.6)' : '0 0 6px rgba(29,112,245,0.5)',
                            }}
                          />
                        </div>

                        {/* Vote buttons */}
                        {!isValidated && (
                          <div className="flex gap-2 pt-0.5">
                            <button
                              id={`vote-up-${card.id}`}
                              onClick={() => handleVote(card.feedEventId!, 'up')}
                              disabled={isOwnVideo}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-[12px] tracking-wide transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{
                                background: card.myVote === 'up'
                                  ? 'rgba(34,197,94,0.25)'
                                  : 'rgba(34,197,94,0.08)',
                                border: card.myVote === 'up'
                                  ? '1px solid rgba(34,197,94,0.5)'
                                  : '1px solid rgba(34,197,94,0.2)',
                                color: '#22c55e',
                              }}
                            >
                              <ThumbsUp size={13} />
                              <span>Aprovar ({votesUp})</span>
                            </button>
                            <button
                              id={`vote-down-${card.id}`}
                              onClick={() => handleVote(card.feedEventId!, 'down')}
                              disabled={isOwnVideo}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-[12px] tracking-wide transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{
                                background: card.myVote === 'down'
                                  ? 'rgba(239,68,68,0.25)'
                                  : 'rgba(239,68,68,0.06)',
                                border: card.myVote === 'down'
                                  ? '1px solid rgba(239,68,68,0.5)'
                                  : '1px solid rgba(239,68,68,0.2)',
                                color: '#ef4444',
                              }}
                            >
                              <ThumbsDown size={13} />
                              <span>Reprovar ({votesDown})</span>
                            </button>
                          </div>
                        )}

                        {isOwnVideo && !isValidated && (
                          <p className="text-slate-500 text-[10px] text-center font-medium">
                            Aguarde a comunidade validar sua prova
                          </p>
                        )}
                      </div>

                      {/* Social row */}
                      <div className="pt-1 border-t border-white/[0.04] flex items-center justify-between text-slate-500">
                        <button className="flex items-center gap-1.5 hover:text-blue-400 active:scale-95 transition-all text-[12px] font-bold tracking-tight bg-transparent border-none outline-none">
                          <MessageSquare size={14} />
                          <span>Comentar</span>
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-yellow-400 active:scale-95 transition-all text-[12px] font-bold tracking-tight bg-transparent border-none outline-none">
                          <Share2 size={14} />
                          <span>Compartilhar</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                // ── Regular Workout Card ──
                return (
                <div
                  key={card.id}
                  className="w-full bg-[#131b2b] rounded-[24px] p-5 flex flex-col gap-2.5 shadow-lg border border-transparent"
                >
                  {/* Top row: Avatar + Name/Date + FitPoints badge */}
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-slate-800">
                        {card.avatar_url ? (
                          <img
                            src={card.avatar_url}
                            alt={card.user_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-[14px]">
                            {card.user_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h3 className="text-white font-bold text-[15px] leading-tight truncate">
                          {card.user_name}
                        </h3>
                        <span className="text-slate-500 text-[11px] font-medium leading-none mt-1">
                          {card.concluido_em}
                          {card.cidade ? ` · ${card.cidade}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* FitPoints Badge */}
                    <div className="font-black text-[10.5px] tracking-wider leading-none drop-shadow-[0_0_4px_rgba(250,204,21,0.25)] flex-shrink-0 ml-2">
                      <span className="text-yellow-400 font-black">+{card.fitPointsEarned} </span>
                      <span className="text-white notranslate">fit</span>
                      <span className="text-[#4d9fff] notranslate">Points</span>
                    </div>
                  </div>

                  {/* Event description */}
                  <div className="text-[#f8fafc] font-semibold text-[15.5px] leading-snug">
                    <span>
                      Concluiu o {card.workout_day} — {card.musculos}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="mt-1.5 pt-3 border-t border-white/[0.04] grid grid-cols-3 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Clock size={9} /> Duração
                      </span>
                      <span className="text-slate-300 font-bold text-[13px] mt-0.5 leading-none">
                        {card.duracao_min} min
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Dumbbell size={9} /> Treinos
                      </span>
                      <span className="text-slate-300 font-bold text-[13px] mt-0.5 leading-none">
                        {card.total_treinos} total
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Trophy size={9} /> Ranking
                      </span>
                      <span className="text-slate-300 font-bold text-[13px] mt-0.5 leading-none">
                        {card.ranking_pos}º lugar
                      </span>
                    </div>
                  </div>

                  {/* Social row */}
                  <div className="mt-3.5 pt-3.5 border-t border-white/[0.04] flex items-center justify-between text-slate-500">
                    <button className="flex items-center gap-1.5 hover:text-blue-400 active:scale-95 transition-all text-[12px] font-bold tracking-tight bg-transparent border-none outline-none">
                      <ThumbsUp size={14} />
                      <span>0</span>
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-emerald-400 active:scale-95 transition-all text-[12px] font-bold tracking-tight bg-transparent border-none outline-none">
                      <MessageSquare size={14} />
                      <span>0</span>
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-yellow-400 active:scale-95 transition-all text-[12px] font-bold tracking-tight bg-transparent border-none outline-none">
                      <Share2 size={14} />
                      <span>0</span>
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

/**
 * Computes the 6 fitness pillars from real workout data.
 * Exported here because Profile.tsx imports and relies on this function.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function computeAttributes(stats: {
  totalWorkoutsThisMonth: number;
  totalWorkoutsAllTime: number;
  streak: number;
  totalVolumeThisWeek: number;
  totalSeriesThisWeek: number;
  totalExercisesCompleted: number;
  fitPoints: number;
}) {
  const forValue = Math.min(99, Math.round(stats.totalVolumeThisWeek / 500 * 10));
  const volValue = Math.min(99, Math.round(stats.totalVolumeThisWeek / 1000 * 20));
  const frqValue = Math.min(99, Math.round(stats.totalSeriesThisWeek / 30 * 99));
  const carValue = Math.min(99, Math.round(stats.totalWorkoutsThisMonth * 10));
  const nutValue = Math.min(99, Math.round(stats.totalWorkoutsAllTime > 0 ? Math.min(99, stats.streak * 10) : 0));
  const recValue = Math.min(99, Math.round((stats.totalWorkoutsThisMonth / 20) * 80 + 20));

  return [
    {
      key: 'FOR', name: 'Força', value: forValue,
      tooltip: 'Cargas máximas e recordes pessoais (PRs).', color: '#22c55e',
      displayValue: `${stats.totalVolumeThisWeek > 0 ? Math.round(stats.totalVolumeThisWeek / 100) : 0}kg`,
      subtitle: `${stats.totalVolumeThisWeek > 0 ? Math.round(stats.totalVolumeThisWeek / 100) : 0}kg`,
    },
    {
      key: 'VOL', name: 'Volume', value: volValue,
      tooltip: 'Quantidade total de trabalho (Peso x Reps).', color: '#a855f7',
      displayValue: (stats.totalVolumeThisWeek / 1000).toFixed(1), subtitle: 'Toneladas',
    },
    {
      key: 'FRQ', name: 'Frequência', value: frqValue,
      tooltip: 'Dias treinados vs. Planejados.', color: '#22c55e',
      displayValue: '',
      subtitle: `${Math.min(5, Math.max(0, Math.round(stats.totalSeriesThisWeek / 6)))}/5 Dias`,
    },
    {
      key: 'NUT', name: 'Dieta', value: nutValue,
      tooltip: 'Batimento de metas de macros (Proteína/Carbo).', color: '#eab308',
      displayValue: '', subtitle: `${nutValue}% Foco`,
    },
    {
      key: 'CAR', name: 'Cardio', value: carValue,
      tooltip: 'Tempo de atividade aeróbica e queima calórica.', color: '#3b82f6',
      displayValue: '', subtitle: 'Pace: 5:30 min/km',
    },
    {
      key: 'REC', name: 'Recuperação', value: recValue,
      tooltip: 'Qualidade do descanso e prontidão do Sistema Nervoso Central. (sono e descanso entre as séries)',
      color: '#f55c2d', displayValue: `${recValue}%`, subtitle: 'Prontidão',
    },
  ];
}
