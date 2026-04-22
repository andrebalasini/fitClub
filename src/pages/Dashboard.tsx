import { useNavigate } from 'react-router-dom';
import { WeeklyCalendar } from '../components/WeeklyCalendar';
import { FitClubCard } from '../components/FitClubCard';
import { WeeklyChallenges } from '../components/WeeklyChallenges';
import { useDragScroll } from '../hooks/useDragScroll';
import { useDashboardData } from '../hooks/useDashboardData';
import { Loader2 } from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();
  const dragScrollRef = useDragScroll();
  const { profile, stats, loading } = useDashboardData();

  if (loading) {
    return (
      <div
        className="w-full flex items-center justify-center pb-24 pt-1 min-h-screen font-sans"
        style={{ background: '#0f141e' }}
      >
        <Loader2 size={32} className="animate-spin text-[#1D63FF]" />
      </div>
    );
  }

  // Compute attribute values based on real data
  const attributes = computeAttributes(stats);

  return (
    <div
      className="w-full flex flex-col pb-24 pt-1 min-h-screen font-sans"
      style={{ background: '#0f141e' }}
    >
      {/* Weekly Calendar — with real trained dates */}
      <div className="w-full -mt-2">
        <WeeklyCalendar trainedDates={stats.trainedDatesThisWeek} fitPointsDates={stats.fitPointsDatesThisWeek} />
      </div>

      {/* Bento Grid Container */}
      <div className="px-4 flex flex-col gap-4 mt-0 w-full">

        {/* ── Row 1b: Explore o clube carousel ── */}
        <div className="flex flex-col space-y-3">
          <h2 className="text-[#f8fafc] font-bold text-[22px] px-1 tracking-[-0.5px]">Explore o clube</h2>
          <div ref={dragScrollRef} className="flex overflow-x-auto gap-4 pb-2 -mx-4 px-4 scrollbar-none select-none snap-x">
            <div 
              onClick={() => navigate('/premium')}
              className="w-[85%] sm:w-[380px] snap-center rounded-[18px] overflow-hidden relative flex flex-col h-[240px] flex-shrink-0 active:scale-[0.98] transition-all cursor-pointer shadow-xl"
            >
              <div className="h-[60%] relative w-full">
                <img src="https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=500&auto=format&fit=crop&q=60" alt="Treino" className="w-full h-full object-cover pointer-events-none" draggable={false} />
                <div className="absolute inset-0 bg-black/20 pointer-events-none" />
              </div>
              <div className="h-[40%] bg-[#1a4fba] p-3.5 w-full flex flex-col justify-center items-center pointer-events-none">
                <p className="text-white font-bold text-[15px] leading-tight text-center mb-1">A temporada 1 já começou!</p>
                <p className="text-[#b0cffd] text-[13px] font-medium leading-snug text-center max-w-[90%]">Participe, complete desafios e<br/>ganhe <span className="text-white">fit</span><span className="text-[#4d9fff]">Points</span> 🏆</p>
              </div>
            </div>
            {/* Card 2 — Whey */}
            <div 
              onClick={() => navigate('/loja')}
              className="w-[85%] sm:w-[380px] snap-center rounded-[18px] overflow-hidden relative flex flex-col h-[240px] flex-shrink-0 active:scale-[0.98] transition-all cursor-pointer shadow-xl"
            >
              <div className="h-[60%] relative w-full">
                <img src="https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=500&auto=format&fit=crop&q=60" alt="Whey" className="w-full h-full object-cover pointer-events-none" draggable={false} />
                <div className="absolute inset-0 bg-black/20 pointer-events-none" />
              </div>
              <div className="h-[40%] bg-[#1a4fba] p-3.5 w-full flex flex-col justify-center items-center pointer-events-none">
                <p className="text-white font-bold text-[15px] leading-tight text-center mb-1">Procurando whey protein?</p>
                <p className="text-[#b0cffd] text-[13px] font-medium leading-snug text-center max-w-[95%]">Encontre ofertas exclusivas<br/>fitClub 🔥</p>
              </div>
            </div>
            {/* Card 3 — Camiseta */}
            <div 
              onClick={() => navigate('/loja')}
              className="w-[85%] sm:w-[380px] snap-center rounded-[18px] overflow-hidden relative flex flex-col h-[240px] flex-shrink-0 active:scale-[0.98] transition-all cursor-pointer shadow-xl"
            >
              <div className="h-[60%] relative w-full">
                <img src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop&q=60" alt="Camiseta fitClub" className="w-full h-full object-cover object-top pointer-events-none" draggable={false} />
                <div className="absolute inset-0 bg-black/20 pointer-events-none" />
              </div>
              <div className="h-[40%] bg-[#1a4fba] p-3.5 w-full flex flex-col justify-center items-center pointer-events-none">
                <p className="text-white font-bold text-[15px] leading-tight text-center mb-1">Camiseta Oficial fitClub</p>
                <p className="text-[#b0cffd] text-[13px] font-medium leading-snug text-center max-w-[95%]">Troque seus <span className="text-white">fit</span><span className="text-[#4d9fff]">Points</span><br/>por este item exclusivo 👕</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: FitClub Card with real data ── */}
        <div className="flex flex-col space-y-3 w-full">
          <h2 className="text-[#f8fafc] font-bold text-[22px] px-1 tracking-[-0.5px] mt-1">Sua jornada</h2>
          <FitClubCard
            userName={profile?.nome || 'Atleta'}
            avatarUrl={profile?.avatarUrl || ''}
            isPremium={false}
            fitPoints={stats.fitPoints}
            attributes={attributes}
          />
        </div>

        {/* ── Row 3: Desafios da Semana (full width) ── */}
        <WeeklyChallenges />

      </div>
    </div>
  );
}

/**
 * Computes the 6 user attributes from real workout data.
 * Since the user just registered and has no history yet, all values start at 0.
 * As they train, these will grow based on:
 * - FOR (Força): max load registered
 * - CAR (Cardio): workout frequency / cardio sessions
 * - CONS (Constância): streak & weekly consistency
 * - TEC (Técnica): series completion rate
 * - REC (Recuperação): rest patterns
 * - VOL (Volume): total volume lifted
 */
function computeAttributes(stats: {
  totalWorkoutsThisMonth: number;
  totalWorkoutsAllTime: number;
  streak: number;
  totalVolumeThisWeek: number;
  totalSeriesThisWeek: number;
  totalExercisesCompleted: number;
  fitPoints: number;
}) {
  // Scale each stat into a 0-99 range with reasonable thresholds
  const forValue = Math.min(99, Math.round(stats.totalVolumeThisWeek / 500 * 10));
  const carValue = Math.min(99, Math.round(stats.totalWorkoutsThisMonth * 10));
  const consValue = Math.min(99, Math.round(stats.streak * 14));
  const tecValue = Math.min(99, Math.round(stats.totalSeriesThisWeek / 30 * 99));
  const recValue = Math.min(99, Math.round(stats.totalWorkoutsAllTime > 0 ? 50 + stats.streak * 5 : 0));
  const volValue = Math.min(99, Math.round(stats.totalVolumeThisWeek / 1000 * 20));

  return [
    {
      key: 'FOR',
      name: 'Força',
      value: forValue,
      tooltip: 'Baseado na carga máxima (KG) registrada em todos os exercícios.',
      color: '#f55c2d',
    },
    {
      key: 'CAR',
      name: 'Cardio',
      value: carValue,
      tooltip: 'Baseado no tempo total e intensidade de atividades aeróbicas registradas.',
      color: '#2de8f5',
    },
    {
      key: 'CONS',
      name: 'Constância',
      value: consValue,
      tooltip: 'Frequência semanal de treinos: dias ativos dividido pela sua meta de dias por semana.',
      color: '#a855f7',
    },
    {
      key: 'TEC',
      name: 'Técnica',
      value: tecValue,
      tooltip: 'Pontuação gerada pelo Bio-feedback e precisão na execução dos treinos.',
      color: '#f5c518',
    },
    {
      key: 'REC',
      name: 'Recuperação',
      value: recValue,
      tooltip: 'Baseado no tempo de descanso inter-sessões e na qualidade do repouso.',
      color: '#22c55e',
    },
    {
      key: 'VOL',
      name: 'Volume',
      value: volValue,
      tooltip: 'Volume total de peso levantado na última semana (Séries × Repetições × Carga em KG).',
      color: '#1d70f5',
    },
  ];
}
