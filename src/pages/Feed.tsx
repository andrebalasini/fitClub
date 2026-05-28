import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ThumbsUp, ThumbsDown, Share2, Dumbbell, Clock, Sword, CheckCircle2, MessageSquare, Send, Trash2, ChevronDown, Flame } from 'lucide-react';
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
  exercicios_count: number;
}

interface FeedComment {
  id: string;
  user_id: string;
  user_name: string;
  avatar_url: string;
  content: string;
  created_at: string;
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
  exercicios_count: number;
  kcal_burned: number;
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
  // Social interactions
  likesCount?: number;
  likedByMe?: boolean;
  comments?: FeedComment[];
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

interface CommentPanelProps {
  cardId: string;
  cardType: 'workout' | 'challenge_victory';
  comments: FeedComment[];
  currentUserId?: string;
  onAddComment: (cardId: string, cardType: 'workout' | 'challenge_victory', content: string) => Promise<void>;
  onDeleteComment: (cardId: string, commentId: string) => Promise<void>;
}

function CommentPanel({
  cardId,
  cardType,
  comments,
  currentUserId,
  onAddComment,
  onDeleteComment,
}: CommentPanelProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddComment(cardId, cardType, text);
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.04] flex flex-col gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
      {/* Comments List */}
      {comments && comments.length > 0 && (
        <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5 items-start bg-slate-900/30 p-2.5 rounded-xl border border-white/[0.02]">
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-slate-800 border border-white/5">
                {comment.avatar_url ? (
                  <img src={comment.avatar_url} alt={comment.user_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-[10px] uppercase">
                    {comment.user_name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-200 font-bold text-[12px] truncate">{comment.user_name}</span>
                  <span className="text-slate-500 text-[9px] font-medium ml-2">{formatActivityDate(comment.created_at)}</span>
                </div>
                <p className="text-slate-300 text-[12px] font-medium mt-0.5 leading-relaxed break-words">{comment.content}</p>
              </div>
              {currentUserId === comment.user_id && (
                <button
                  type="button"
                  onClick={() => onDeleteComment(cardId, comment.id)}
                  className="p-1 rounded-lg text-slate-500 hover:text-red-400 active:scale-95 transition-all hover:bg-red-500/10 flex-shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Write Comment Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <label htmlFor={`comment-input-${cardId}`} className="sr-only">Escreva um comentário</label>
        <input
          id={`comment-input-${cardId}`}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva um comentário..."
          className="flex-1 bg-slate-950/60 border border-slate-850 focus:border-blue-500/50 rounded-xl px-4 py-2.5 text-[13px] text-white focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white flex items-center justify-center transition-all active:scale-95"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </form>
    </div>
  );
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
  const [activeCommentCardId, setActiveCommentCardId] = useState<string | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);

  // Handle scroll to hide the arrow
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setShowScrollHint(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
            exercicios_count: t.exercicios_count ?? 0,
            kcal_burned: Math.round(duracaoMin * 6.5),
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
            exercicios_count: 1,
            kcal_burned: 15,
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

        // 9. Fetch likes
        const { data: likesRaw } = await supabase
          .from('tbfeedlikes')
          .select('item_id, user_id');
        const likes: Array<{ item_id: string; user_id: string }> = likesRaw ?? [];

        // 10. Fetch comments with profiles join
        const { data: commentsRaw } = await supabase
          .from('tbfeedcomments')
          .select('id, item_id, user_id, content, created_at, profiles(nome, avatar_url)')
          .order('created_at', { ascending: true });
        
        const comments: Array<{
          id: string;
          item_id: string;
          user_id: string;
          content: string;
          created_at: string;
          profiles: { nome: string; avatar_url: string } | null;
        }> = (commentsRaw as any) ?? [];

        // Group likes by item_id
        const likesMap = new Map<string, string[]>();
        likes.forEach((lk) => {
          if (!likesMap.has(lk.item_id)) likesMap.set(lk.item_id, []);
          likesMap.get(lk.item_id)!.push(lk.user_id);
        });

        // Group comments by item_id
        const commentsMap = new Map<string, FeedComment[]>();
        comments.forEach((cm) => {
          if (!commentsMap.has(cm.item_id)) commentsMap.set(cm.item_id, []);
          commentsMap.get(cm.item_id)!.push({
            id: cm.id,
            user_id: cm.user_id,
            user_name: cm.profiles?.nome || 'Atleta',
            avatar_url: cm.profiles?.avatar_url || '',
            content: cm.content,
            created_at: cm.created_at,
          });
        });

        // 11. Merge and sort by date descending
        const allCards = [...workoutCards, ...challengeCards].sort((a, b) => {
          const dA = a.rawDate ? new Date(a.rawDate).getTime() : 0;
          const dB = b.rawDate ? new Date(b.rawDate).getTime() : 0;
          return dB - dA;
        });

        // Enrich cards with likes and comments
        const enrichedCards = allCards.map((c) => {
          const lkList = likesMap.get(c.id) ?? [];
          return {
            ...c,
            likesCount: lkList.length,
            likedByMe: user ? lkList.includes(user.id) : false,
            comments: commentsMap.get(c.id) ?? [],
          };
        });

        setFeedCards(enrichedCards);
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

  // ── Curtir / Descurtir um card do feed ──────────────────────────────────────
  const handleToggleLike = useCallback(async (cardId: string, cardType: 'workout' | 'challenge_victory') => {
    if (!user) {
      showToast('Faça login para curtir.', 'error');
      return;
    }

    const card = feedCards.find((c) => c.id === cardId);
    if (!card) return;

    const wasLiked = !!card.likedByMe;
    const newLiked = !wasLiked;
    const newCount = (card.likesCount ?? 0) + (newLiked ? 1 : -1);

    // Optimistic UI update
    setFeedCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, likedByMe: newLiked, likesCount: newCount } : c
      )
    );

    try {
      if (wasLiked) {
        await supabase
          .from('tbfeedlikes')
          .delete()
          .eq('user_id', user.id)
          .eq('item_id', cardId);
      } else {
        await supabase.from('tbfeedlikes').insert({
          user_id: user.id,
          item_id: cardId,
          item_type: cardType,
        });
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      // Revert optimistic update
      setFeedCards((prev) =>
        prev.map((c) =>
          c.id === cardId ? { ...c, likedByMe: wasLiked, likesCount: card.likesCount } : c
        )
      );
      showToast('Erro ao processar curtida.', 'error');
    }
  }, [user, feedCards]);

  // ── Adicionar um comentário ──────────────────────────────────────────────────
  const handleAddComment = useCallback(async (cardId: string, cardType: 'workout' | 'challenge_victory', content: string) => {
    if (!user || !content.trim()) return;

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const newComment: FeedComment = {
      id: tempId,
      user_id: user.id,
      user_name: currentUser?.nome || 'Atleta',
      avatar_url: currentUser?.avatar_url || '',
      content: content.trim(),
      created_at: new Date().toISOString(),
    };

    // Optimistic UI update
    setFeedCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, comments: [...(c.comments || []), newComment] } : c
      )
    );

    try {
      const { data, error } = await supabase
        .from('tbfeedcomments')
        .insert({
          user_id: user.id,
          item_id: cardId,
          item_type: cardType,
          content: content.trim(),
        })
        .select('id')
        .single();

      if (error) throw error;

      // Update the temp ID with the real ID from Supabase
      setFeedCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? {
                ...c,
                comments: (c.comments || []).map((cm) =>
                  cm.id === tempId ? { ...cm, id: data.id } : cm
                ),
              }
            : c
        )
      );
    } catch (err) {
      console.error('Error adding comment:', err);
      // Remove optimistic comment
      setFeedCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, comments: (c.comments || []).filter((cm) => cm.id !== tempId) }
            : c
        )
      );
      showToast('Erro ao enviar comentário.', 'error');
    }
  }, [user, currentUser, feedCards]);

  // ── Excluir um comentário ────────────────────────────────────────────────────
  const handleDeleteComment = useCallback(async (cardId: string, commentId: string) => {
    if (!user) return;

    const card = feedCards.find((c) => c.id === cardId);
    if (!card) return;
    const previousComments = card.comments || [];

    // Optimistic UI update
    setFeedCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? { ...c, comments: (c.comments || []).filter((cm) => cm.id !== commentId) }
          : c
      )
    );

    try {
      const { error } = await supabase
        .from('tbfeedcomments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      showToast('Comentário removido.', 'success');
    } catch (err) {
      console.error('Error deleting comment:', err);
      // Revert optimistic update
      setFeedCards((prev) =>
        prev.map((c) =>
          c.id === cardId ? { ...c, comments: previousComments } : c
        )
      );
      showToast('Erro ao excluir comentário.', 'error');
    }
  }, [user, feedCards]);

  // ── Compartilhar treino / vitória ──────────────────────────────────────────
  const handleShare = useCallback((card: FeedCard) => {
    let text = '';
    if (card.cardType === 'challenge_victory') {
      text = `⚔️ ${card.challengerName} superou ${card.rivalName} no exercício "${card.exerciseName}" no fitClub! 🔥`;
    } else {
      text = `🏆 ${card.user_name} concluiu o ${card.workout_day} (${card.musculos}) em ${card.duracao_min} min no fitClub! 💪`;
    }

    if (navigator.share) {
      navigator.share({
        title: 'Desafio fitClub',
        text: text,
        url: window.location.origin,
      }).catch((e) => {
        if (e.name !== 'AbortError') {
          navigator.clipboard.writeText(text);
          showToast('Texto de compartilhamento copiado!', 'success');
        }
      });
    } else {
      navigator.clipboard.writeText(text);
      showToast('Link de compartilhamento copiado!', 'success');
    }
  }, []);

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
          <h2 className="text-[#f8fafc] font-bold text-[22px] px-1 tracking-[-0.5px]">Radar de rivais</h2>
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
                        border: '1px solid transparent',
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
                      <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-slate-500">
                        <button
                          type="button"
                          onClick={() => handleToggleLike(card.id, 'challenge_victory')}
                          className={`flex items-center gap-1.5 active:scale-95 transition-all text-[12px] font-bold tracking-tight bg-transparent border-none outline-none ${
                            card.likedByMe ? 'text-blue-400 font-extrabold' : 'hover:text-blue-400'
                          }`}
                        >
                          <ThumbsUp size={14} className={card.likedByMe ? 'fill-blue-400/20' : ''} />
                          <span>{card.likesCount ?? 0}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveCommentCardId(activeCommentCardId === card.id ? null : card.id)}
                          className={`flex items-center gap-1.5 active:scale-95 transition-all text-[12px] font-bold tracking-tight bg-transparent border-none outline-none ${
                            activeCommentCardId === card.id ? 'text-emerald-400 font-extrabold' : 'hover:text-emerald-400'
                          }`}
                        >
                          <MessageSquare size={14} />
                          <span>{(card.comments || []).length}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShare(card)}
                          className="flex items-center gap-1.5 hover:text-yellow-400 active:scale-95 transition-all text-[12px] font-bold tracking-tight bg-transparent border-none outline-none"
                        >
                          <Share2 size={14} />
                          <span>Compartilhar</span>
                        </button>
                      </div>

                      {/* Comments Panel */}
                      {activeCommentCardId === card.id && (
                        <CommentPanel
                          cardId={card.id}
                          cardType="challenge_victory"
                          comments={card.comments || []}
                          currentUserId={user?.id}
                          onAddComment={handleAddComment}
                          onDeleteComment={handleDeleteComment}
                        />
                      )}
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
                        <Clock size={9} className="text-[#4d9fff]" /> Duração
                      </span>
                      <span className="text-slate-300 font-bold text-[13px] mt-0.5 leading-none">
                        {card.duracao_min} min
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Dumbbell size={9} className="text-[#4d9fff]" /> Exercícios
                      </span>
                      <span className="text-slate-300 font-bold text-[13px] mt-0.5 leading-none">
                        {card.exercicios_count}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Flame size={9} className="text-[#4d9fff]" /> Kcal
                      </span>
                      <span className="text-slate-300 font-bold text-[13px] mt-0.5 leading-none">
                        {card.kcal_burned}
                      </span>
                    </div>
                  </div>

                  {/* Social row */}
                  <div className="mt-3.5 pt-3.5 border-t border-white/[0.04] flex items-center justify-between text-slate-500">
                    <button
                      type="button"
                      onClick={() => handleToggleLike(card.id, 'workout')}
                      className={`flex items-center gap-1.5 active:scale-95 transition-all text-[12px] font-bold tracking-tight bg-transparent border-none outline-none ${
                        card.likedByMe ? 'text-blue-400 font-extrabold' : 'hover:text-blue-400'
                      }`}
                    >
                      <ThumbsUp size={14} className={card.likedByMe ? 'fill-blue-400/20' : ''} />
                      <span className="text-white">{card.likesCount ?? 0}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCommentCardId(activeCommentCardId === card.id ? null : card.id)}
                      className={`flex items-center gap-1.5 active:scale-95 transition-all text-[12px] font-bold tracking-tight bg-transparent border-none outline-none ${
                        activeCommentCardId === card.id ? 'text-emerald-400 font-extrabold' : 'hover:text-emerald-400'
                      }`}
                    >
                      <MessageSquare size={14} />
                      <span className="text-white">{(card.comments || []).length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShare(card)}
                      className="flex items-center gap-1.5 hover:text-yellow-400 active:scale-95 transition-all text-[12px] font-bold tracking-tight bg-transparent border-none outline-none"
                    >
                      <Share2 size={14} />
                      <span>Compartilhar</span>
                    </button>
                  </div>

                  {/* Comments Panel */}
                  {activeCommentCardId === card.id && (
                    <CommentPanel
                      cardId={card.id}
                      cardType="workout"
                      comments={card.comments || []}
                      currentUserId={user?.id}
                      onAddComment={handleAddComment}
                      onDeleteComment={handleDeleteComment}
                    />
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Scroll Down Hint */}
      {showScrollHint && !loading && feedCards.length > 0 && (
        <div className="fixed bottom-[90px] left-0 right-0 flex justify-center z-40 pointer-events-none transition-opacity duration-500">
          <div className="flex flex-col items-center gap-1 opacity-80 animate-bounce">
            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-300 drop-shadow-md">Ver mais</span>
            <ChevronDown size={22} className="text-white drop-shadow-md" />
          </div>
        </div>
      )}

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
