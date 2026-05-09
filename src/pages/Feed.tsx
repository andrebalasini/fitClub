import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, ThumbsUp, MessageSquare, Share2 } from 'lucide-react';
import { ChallengesCarousel } from '../components/ChallengesCarousel';

interface WorkoutActivity {
  id: string;
  user_name: string;
  avatar_url: string;
  workout_day: string;
  concluido_em: string;
  eventType: 'concluido' | 'superou';
  musculos?: string;
  rival_name?: string;
  exercicio_name?: string;
  tempo_minutos?: number;
  kcal?: number;
  qtd_exercicios?: number;
  carga_kg?: number;
  reps?: number;
  ranking_pos?: number;
  fitcheck_url?: string;
  fitPointsEarned?: number;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
}

const FALLBACK_ACTIVITIES: WorkoutActivity[] = [
  {
    id: 'mock-1',
    user_name: 'Ana Silva',
    avatar_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=150&auto=format&fit=crop&q=60',
    workout_day: 'Treino A',
    concluido_em: 'há 10 min',
    eventType: 'concluido',
    musculos: 'Peito, Ombros e Tríceps',
    tempo_minutos: 45,
    kcal: 310,
    qtd_exercicios: 6,
    fitcheck_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=60',
    fitPointsEarned: 50,
    likes_count: 14,
    comments_count: 3,
    shares_count: 1,
  },
  {
    id: 'mock-2',
    user_name: 'Marcos Souza',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=60',
    workout_day: 'Treino C',
    concluido_em: 'há 45 min',
    eventType: 'superou',
    rival_name: 'André',
    exercicio_name: 'Elevação Lateral',
    carga_kg: 16,
    reps: 12,
    ranking_pos: 2,
    fitPointsEarned: 25,
    likes_count: 8,
    comments_count: 2,
    shares_count: 0,
    // No fitcheck photo to test conditional rendering
  },
  {
    id: 'mock-3',
    user_name: 'Juliana Costa',
    avatar_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=150&auto=format&fit=crop&q=60',
    workout_day: 'Treino B',
    concluido_em: 'há 2h',
    eventType: 'concluido',
    musculos: 'Costas e Bíceps',
    tempo_minutos: 52,
    kcal: 380,
    qtd_exercicios: 7,
    fitcheck_url: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=500&auto=format&fit=crop&q=60',
    fitPointsEarned: 50,
    likes_count: 21,
    comments_count: 5,
    shares_count: 2,
  }
];

function formatActivityDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));

  if (diffMinutes < 60) {
    return `há ${diffMinutes} min`;
  } else if (diffHours < 24) {
    return `há ${diffHours}h`;
  } else {
    return `em ${date.toLocaleDateString('pt-BR')} às ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
}

export function Feed() {
  const [workoutActivities, setWorkoutActivities] = useState<WorkoutActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    nome: string;
    avatar_url: string;
    fitPoints: number;
    rank: number;
  } | null>(null);

  const [showTestPopup, setShowTestPopup] = useState(false);

  useEffect(() => {
    const hasSeen = sessionStorage.getItem('fitclub_test_popup_seen');
    if (!hasSeen) {
      setShowTestPopup(true);
    }
  }, []);

  useEffect(() => {
    async function loadCurrentUserStats() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nome, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        const nome = profileData?.nome || user.email?.split('@')[0] || 'Atleta';
        const avatar_url = profileData?.avatar_url || '';

        // Fetch fitPoints
        const { data: pointsData } = await supabase
          .from('tbFitPoints')
          .select('pontos')
          .eq('user_id', user.id);
        
        const fitPoints = pointsData?.reduce((acc, curr) => acc + (curr.pontos || 0), 0) || 0;

        // Fetch rank position
        let rank = 1;
        try {
          const res = await supabase.rpc('leaderboard_temporada' as any);
          const data = res.data;
          if (data && Array.isArray(data)) {
            const index = data.findIndex((entry: any) => entry.user_id === user.id);
            if (index !== -1) {
              rank = index + 1;
            }
          } else {
            // Manual fallback computation for rank
            const { data: points } = await supabase.from('tbFitPoints').select('user_id, pontos');
            if (points) {
              const pointsMap: Record<string, number> = {};
              points.forEach((p: any) => { pointsMap[p.user_id] = (pointsMap[p.user_id] || 0) + p.pontos; });
              const sortedUserIds = Object.keys(pointsMap).sort((a, b) => pointsMap[b] - pointsMap[a]);
              const index = sortedUserIds.indexOf(user.id);
              if (index !== -1) {
                rank = index + 1;
              }
            }
          }
        } catch (rankErr) {
          console.error("Error computing user rank:", rankErr);
        }

        setCurrentUser({ nome, avatar_url, fitPoints, rank });
      } catch (err) {
        console.error("Error loading user stats:", err);
      }
    }
    loadCurrentUserStats();
  }, []);

  useEffect(() => {
    async function loadRecentActivities() {
      try {
        setLoadingActivities(true);
        const { data: workoutsData, error: workoutsError } = await supabase
          .from('tbTreinosCompletos')
          .select('id, user_id, concluido_em, dia')
          .order('concluido_em', { ascending: false })
          .limit(10);

        if (workoutsError) throw workoutsError;

        if (workoutsData && workoutsData.length > 0) {
          const userIds = [...new Set(workoutsData.map((w) => w.user_id))];
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, nome, avatar_url')
            .in('id', userIds);

          if (profilesError) throw profilesError;

          const profileMap = new Map<string, { nome: string; avatar_url: string }>();
          profilesData?.forEach((p) => {
            profileMap.set(p.id, { nome: p.nome || 'Atleta', avatar_url: p.avatar_url || '' });
          });

          const activities: WorkoutActivity[] = workoutsData.map((w, index) => {
            const profile = profileMap.get(w.user_id);
            const eventType = (index % 3 === 1) ? 'superou' : 'concluido';
            
            let musculos = 'Membros Superiores';
            if (w.dia?.toUpperCase() === 'A') musculos = 'Peito, Ombros e Tríceps';
            if (w.dia?.toUpperCase() === 'B') musculos = 'Costas e Bíceps';
            if (w.dia?.toUpperCase() === 'C') musculos = 'Pernas Completo';
            if (w.dia?.toUpperCase() === 'D') musculos = 'Ombros e Abdomen';

            const rivals = ['André', 'João', 'Marcos', 'Lucas', 'Ana'];
            const exercises = ['Supino Reto', 'Agachamento Livre', 'Leg Press', 'Elevação Lateral', 'Rosca Direta'];

            return {
              id: w.id,
              user_name: profile?.nome || 'Atleta',
              avatar_url: profile?.avatar_url || '',
              workout_day: `Treino ${w.dia}`,
              concluido_em: formatActivityDate(w.concluido_em),
              eventType,
              musculos,
              rival_name: rivals[index % rivals.length],
              exercicio_name: exercises[index % exercises.length],
              tempo_minutos: 40 + (index % 4) * 5,
              kcal: 260 + (index % 4) * 45,
              qtd_exercicios: 5 + (index % 3),
              carga_kg: 10 + (index % 5) * 4,
              reps: 10 + (index % 3) * 2,
              ranking_pos: 1 + (index % 3),
              fitcheck_url: index % 2 === 0 ? 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=60' : undefined,
              fitPointsEarned: eventType === 'concluido' ? 50 : 25,
              likes_count: 5 + (index % 5) * 4,
              comments_count: 1 + (index % 3),
              shares_count: index % 2,
            };
          });

          setWorkoutActivities(activities);
        } else {
          setWorkoutActivities(FALLBACK_ACTIVITIES);
        }
      } catch (error) {
        console.error('Error loading recent activities:', error);
        setWorkoutActivities(FALLBACK_ACTIVITIES);
      } finally {
        setLoadingActivities(false);
      }
    }

    loadRecentActivities();
  }, []);

  return (
    <div
      className="w-full flex flex-col pb-24 pt-1 min-h-screen font-sans select-none"
      style={{ background: '#0f141e' }}
    >
      {/* Middle Container */}
      <div className="px-4 flex flex-col gap-6 pt-1.5 w-full">

        {/* ── Seção 0: Perfil do Usuário Logado (Borderless Layout with Avatar Column) ── */}
        {currentUser && (
          <div className="w-full flex items-center justify-between pt-1 px-1 animate-[fadeIn_0.25s_ease-out]">
            {/* Left side wrapper: Avatar Column + Name Column */}
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Column 0 (Far Left): Circular User Avatar */}
              <div className="w-[42px] h-[42px] rounded-full overflow-hidden flex-shrink-0 bg-slate-800 border border-white/10">
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

              {/* Column 1 (Middle Left): Welcome message and User name */}
              <div className="flex flex-col min-w-0">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-none">
                  Bem-vindo(a) de volta
                </span>
                <h2 className="text-white font-extrabold text-[17px] mt-1.5 leading-tight truncate">
                  {currentUser.nome}
                </h2>
              </div>
            </div>

            {/* Column 2 (Right): Points and Season Rank */}
            <div className="flex flex-col items-end flex-shrink-0">
              {/* Row 1: FitPoints */}
              <div className="font-black text-[14px] tracking-tight leading-none drop-shadow-[0_0_4px_rgba(250,204,21,0.25)]">
                <span className="text-yellow-400 font-black">{currentUser.fitPoints.toLocaleString('pt-BR')} </span>
                <span className="text-white notranslate">fit</span>
                <span className="text-[#4d9fff] notranslate">Points</span>
              </div>
              {/* Row 2: Season Rank */}
              <span className="text-slate-400 font-bold text-[11px] mt-1.5 leading-none tracking-tight">
                {currentUser.rank}º lugar na temporada
              </span>
            </div>
          </div>
        )}

        {/* ── Seção 1: Desafios ── */}
        <div className="flex flex-col w-full space-y-2">
          <h2 className="text-[#f8fafc] font-bold text-[22px] px-1 tracking-[-0.5px]">Desafios</h2>
          <ChallengesCarousel />
        </div>

        {/* ── Seção 2: Novidades do clube ── */}
        <div className="flex flex-col w-full space-y-2">
          <h2 className="text-[#f8fafc] font-bold text-[22px] px-1 tracking-[-0.5px]">Novidades do clube</h2>
          
          {loadingActivities ? (
            <div className="w-full flex flex-col justify-center items-center py-12 gap-3.5 select-none">
              <div className="relative flex items-center justify-center">
                {/* Subtle outer pulsing halo */}
                <div className="absolute w-9 h-9 rounded-full bg-[#1d70f5]/10 animate-ping" />
                <Loader2 size={22} className="animate-spin relative z-10" style={{ color: '#1d70f5' }} />
              </div>
              <span className="text-slate-500 font-bold text-[11px] uppercase tracking-[0.12em] animate-pulse">
                Carregando as novidades...
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {workoutActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="w-full bg-[#131b2b] rounded-[24px] p-5 flex flex-col gap-2.5 shadow-lg border border-transparent"
                >
                  {/* Top row: Photo + Name/Date column and FitPoints badge */}
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Column 1: User photo */}
                      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-slate-800">
                        {activity.avatar_url ? (
                          <img
                            src={activity.avatar_url}
                            alt={activity.user_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-[14px]">
                            {activity.user_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* Column 2: Name (line 1) & Update date (line 2) */}
                      <div className="flex flex-col min-w-0">
                        <h3 className="text-white font-bold text-[15px] leading-tight truncate">
                          {activity.user_name}
                        </h3>
                        <span className="text-slate-500 text-[11px] font-medium leading-none mt-1">
                          {activity.concluido_em}
                        </span>
                      </div>
                    </div>

                    {/* Top right: FitPoints Badge */}
                    {activity.fitPointsEarned && (
                      <div className="font-black text-[10.5px] tracking-wider leading-none drop-shadow-[0_0_4px_rgba(250,204,21,0.25)] flex-shrink-0 ml-2">
                        <span className="text-yellow-400 font-black">+{activity.fitPointsEarned} </span>
                        <span className="text-white notranslate">fit</span>
                        <span className="text-[#4d9fff] notranslate">Points</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom row: Event description in plain white text */}
                  <div className="text-[#f8fafc] font-semibold text-[15.5px] leading-snug">
                    {activity.eventType === 'concluido' ? (
                      <span>
                        Treino de {activity.musculos} concluído
                      </span>
                    ) : (
                      <span>
                        Superou {activity.rival_name} no {activity.exercicio_name}
                      </span>
                    )}
                  </div>

                  {/* Dynamic 3-column stats row with high-end formatting */}
                  <div className="mt-1.5 pt-3 border-t border-white/[0.04] grid grid-cols-3 gap-2">
                    {activity.eventType === 'concluido' ? (
                      <>
                        <div className="flex flex-col">
                          <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">Duração</span>
                          <span className="text-slate-300 font-bold text-[13px] mt-0.5 leading-none">{activity.tempo_minutos} min</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">Consumo</span>
                          <span className="text-slate-300 font-bold text-[13px] mt-0.5 leading-none">{activity.kcal} kcal</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">Exercícios</span>
                          <span className="text-slate-300 font-bold text-[13px] mt-0.5 leading-none">{activity.qtd_exercicios} exerc.</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">Carga</span>
                          <span className="text-slate-300 font-bold text-[13px] mt-0.5 leading-none">{activity.carga_kg} kg</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">Movimentos</span>
                          <span className="text-slate-300 font-bold text-[13px] mt-0.5 leading-none">{activity.reps} reps</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">Rank Geral</span>
                          <span className="text-slate-300 font-bold text-[13px] mt-0.5 leading-none">{activity.ranking_pos}º lugar</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Conditional Fitcheck mirror selfie / shape photo */}
                  {activity.fitcheck_url && (
                    <div 
                      className="mt-3.5 w-full rounded-[16px] overflow-hidden border border-white/[0.04] bg-[#0c1018] cursor-zoom-in group"
                      onClick={() => setSelectedPhoto(activity.fitcheck_url!)}
                    >
                      <img
                        src={activity.fitcheck_url}
                        alt="Fitcheck"
                        className="w-full h-[200px] object-cover active:scale-[0.98] transition-all duration-300 group-hover:brightness-110"
                        draggable={false}
                      />
                    </div>
                  )}

                  {/* Social Engagement Row */}
                  <div className="mt-3.5 pt-3.5 border-t border-white/[0.04] flex items-center justify-between text-slate-500">
                    <button className="flex items-center gap-1.5 hover:text-blue-400 active:scale-90 transition-all text-[12px] font-bold tracking-tight bg-transparent border-none outline-none">
                      <ThumbsUp size={14} />
                      <span>{activity.likes_count ?? 0}</span>
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-emerald-400 active:scale-90 transition-all text-[12px] font-bold tracking-tight bg-transparent border-none outline-none">
                      <MessageSquare size={14} />
                      <span>{activity.comments_count ?? 0}</span>
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-yellow-400 active:scale-90 transition-all text-[12px] font-bold tracking-tight bg-transparent border-none outline-none">
                      <Share2 size={14} />
                      <span>{activity.shares_count ?? 0}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Full-screen Photo Viewer Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out select-none"
          onClick={() => setSelectedPhoto(null)}
        >
          {/* Close button */}
          <button 
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-white font-bold text-lg"
            onClick={() => setSelectedPhoto(null)}
          >
            ✕
          </button>
          <img
            src={selectedPhoto}
            alt="Expanded Fitcheck"
            className="max-w-full max-h-[85vh] rounded-[20px] object-contain shadow-2xl transition-all duration-300"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Testing Phase Information Popup */}
      {showTestPopup && (
        <div className="fixed inset-0 z-[110] bg-[#0c1018]/85 backdrop-blur-md flex items-center justify-center p-5 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#131b2b] border border-white/10 rounded-[28px] max-w-md w-full p-6 shadow-2xl relative flex flex-col gap-5 select-none animate-[slideDown_0.25s_ease-out]">
            {/* Close button */}
            <button 
              onClick={() => {
                sessionStorage.setItem('fitclub_test_popup_seen', 'true');
                setShowTestPopup(false);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs transition-all active:scale-95 border border-white/5"
            >
              ✕
            </button>

            {/* Icon / Header */}
            <div className="flex items-center gap-3 mt-1">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              </div>
              <h3 className="text-[#f8fafc] font-black text-[18px] tracking-tight">Etapa de Testes</h3>
            </div>

            {/* Message */}
            <div className="flex flex-col gap-3.5">
              <p className="text-slate-300 font-medium text-[14px] leading-relaxed">
                O <span className="text-white font-extrabold notranslate">fitClub</span> está atualmente passando por uma etapa de testes. Por isso, alguns dados do feed e desafios podem ser fictícios para testar a dinâmica das funções.
              </p>
              <p className="text-blue-400 font-bold text-[14px] leading-relaxed">
                Aproveite para cadastrar seus próprios treinos, realizá-los e acompanhar de perto a sua performance — essas funções estão 100% ativas e funcionando perfeitamente! 💪
              </p>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => {
                sessionStorage.setItem('fitclub_test_popup_seen', 'true');
                setShowTestPopup(false);
              }}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[14px] rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/25 mt-1 border-none outline-none"
            >
              Entendido!
            </button>
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
