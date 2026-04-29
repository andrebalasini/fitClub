import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PerformanceCards } from '../components/PerformanceCards';
import { Activity, Camera, TrendingUp, CalendarDays, Award } from 'lucide-react';
import { useParams, useLocation } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { computeAttributes } from '../pages/Dashboard';
import { useProfileTimeline } from '../hooks/useProfileTimeline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Profile() {
  const { user } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const location = useLocation();
  const preloadedProfile = location.state?.preloadedProfile;
  
  const [activeTab, setActiveTab] = useState<'timeline' | 'fotos' | 'performance'>('timeline');

  // Fetch real data
  const { profile, stats, loading } = useDashboardData(userId, preloadedProfile);
  const { timeline, loading: timelineLoading } = useProfileTimeline(userId);

  // Compute attributes based on real stats
  const attributes = computeAttributes(stats);
  const fitPoints = stats.fitPoints;
  const isOwnProfile = !userId || userId === user?.id;
  const userName = profile?.nome || (isOwnProfile ? user?.user_metadata?.name : undefined) || 'Atleta';
  const avatarUrl = profile?.avatarUrl || (isOwnProfile ? user?.user_metadata?.avatar_url : undefined) || '';
  const isPremium = true; // Placeholder for premium status

  const accentColor = '#4d9fff';

  if (loading || timelineLoading) {
    return (
      <div className="flex-1 w-full flex items-center justify-center min-h-[50vh]">
        <Activity className="w-8 h-8 text-[#4d9fff] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-md mx-auto flex flex-col pt-6 pb-24 px-5">
      {/* --- Perfil Info (Fora do Card) --- */}
      <div className="relative w-full flex flex-col mb-8 select-none transition-all duration-200">
        
        {/* Header: Avatar, Name, OVR */}
        <div className="flex items-center gap-4 z-10 w-full mb-6">
          <div className="relative flex-shrink-0">
            <div className="w-[80px] h-[80px] rounded-[22px] overflow-hidden border-2 flex items-center justify-center shadow-lg"
              style={{ 
                borderColor: isPremium ? '#e2c172' : 'rgba(255,255,255,0.1)',
                background: !avatarUrl ? '#1a2744' : undefined,
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[#4d9fff] font-bold text-[32px]">
                  {userName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {isPremium && (
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center bg-[#121212]"
                style={{ border: `1px solid #e2c172` }}
              >
                <Award className="w-3.5 h-3.5 text-[#e2c172]" style={{ filter: 'drop-shadow(0 0 4px rgba(226,193,114,0.4))' }} />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h1 className="text-white font-bold text-[28px] leading-tight truncate">{userName}</h1>
            <div className="flex items-center gap-1.5 mt-1 text-[15px] font-medium tracking-tight text-[#8e95a3]" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }}>
              {isPremium && (
                <>
                  <span style={{ color: '#e2c172' }} className="font-bold">Premium</span>
                  <span className="mx-0.5">•</span>
                </>
              )}
              <span>Temporada 1</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center flex-shrink-0 px-2">
            <span className="text-white font-black leading-none" style={{ fontSize: '42px', letterSpacing: '-0.02em' }}>
              {fitPoints.toLocaleString('pt-BR')}
            </span>
            <div className="text-[14px] font-bold tracking-[-0.03em] mt-0.5 uppercase" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }}>
              <span className="text-white">fit</span>
              <span style={{ color: accentColor }}>Points</span>
            </div>
          </div>
        </div>

        {/* Horizontal Divider */}
        <div className="w-full h-[1px] opacity-20 mb-6 z-10" style={{ background: accentColor }} />

        {/* Content Row: Scrollable Performance Cards */}
        <div className="w-full z-10 relative mb-1">
          <PerformanceCards attributes={attributes} />
        </div>
      </div>

      {/* --- Timeline Section --- */}
      <div className="flex-1 flex flex-col w-full animate-fadeInUp" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#4d9fff]" />
          Linha do Tempo
        </h2>

        {/* Tabs for Timeline Filtering */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-[13px] transition-all whitespace-nowrap ${
              activeTab === 'timeline' 
                ? 'bg-[#4d9fff] text-white shadow-[0_0_15px_rgba(77,159,255,0.4)]' 
                : 'bg-[#1a2438] text-[#8e95a3] hover:text-white'
            }`}
          >
            <CalendarDays className="w-4 h-4" /> Todos
          </button>
          <button 
            onClick={() => setActiveTab('fotos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-[13px] transition-all whitespace-nowrap ${
              activeTab === 'fotos' 
                ? 'bg-[#4d9fff] text-white shadow-[0_0_15px_rgba(77,159,255,0.4)]' 
                : 'bg-[#1a2438] text-[#8e95a3] hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" /> FitChecks
          </button>
          <button 
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-[13px] transition-all whitespace-nowrap ${
              activeTab === 'performance' 
                ? 'bg-[#4d9fff] text-white shadow-[0_0_15px_rgba(77,159,255,0.4)]' 
                : 'bg-[#1a2438] text-[#8e95a3] hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Performance
          </button>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 flex flex-col gap-6 relative">
          {/* Vertical Line */}
          <div className="absolute left-6 top-2 bottom-0 w-[2px] bg-[#1a2438] z-0" />

          {timeline.filter(t => activeTab === 'timeline' || (activeTab === 'performance' && t.type === 'pr') || (activeTab === 'fotos' && t.type === 'fitpoint')).map((event) => (
            <div key={event.id} className="relative z-10 flex gap-4 w-full">
              <div 
                className="w-12 h-12 rounded-full bg-[#131b2b] border-[2px] flex items-center justify-center flex-shrink-0 mt-1"
                style={{ 
                  borderColor: event.type === 'pr' ? '#22c55e' : event.type === 'workout' ? '#a855f7' : '#e2c172',
                  boxShadow: `0 0 10px ${event.type === 'pr' ? 'rgba(34,197,94,0.2)' : event.type === 'workout' ? 'rgba(168,85,247,0.2)' : 'rgba(226,193,114,0.2)'}`
                }}
              >
                {event.type === 'workout' && <Activity className="w-5 h-5 text-[#a855f7]" />}
                {event.type === 'pr' && <TrendingUp className="w-5 h-5 text-[#22c55e]" />}
                {event.type === 'fitpoint' && <Award className="w-5 h-5 text-[#e2c172]" />}
              </div>
              <div className="flex-1 bg-[#131b2b] rounded-2xl p-4 border border-[#1a2438] active:scale-[0.98] transition-transform cursor-pointer shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-white font-bold text-[15px]">{event.title}</h3>
                    <p className="text-[#8e95a3] text-[12px] font-medium mt-0.5">{event.subtitle}</p>
                  </div>
                  <span className="text-[#8e95a3] text-[11px] font-bold uppercase tracking-wider text-right">
                    {format(event.date, "dd MMM', 'HH:mm", { locale: ptBR })}
                  </span>
                </div>
                
                {event.type === 'workout' && (
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-[#8e95a3] text-[11px] font-bold uppercase">Duração</span>
                      <span className="text-white font-black text-[15px]">
                        {Math.round((event.details?.duracao_segundos || 0) / 60)}
                        <span className="text-[#8e95a3] text-[12px] font-medium"> MIN</span>
                      </span>
                    </div>
                  </div>
                )}

                {event.type === 'pr' && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="px-3 py-1.5 bg-[rgba(34,197,94,0.1)] rounded-lg border border-[rgba(34,197,94,0.2)]">
                      <span className="text-[#22c55e] font-black text-[18px]">
                        +{event.details?.pontos}
                        <span className="text-[12px] ml-1">PTS</span>
                      </span>
                    </div>
                  </div>
                )}
                
                {event.type === 'fitpoint' && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="px-3 py-1.5 bg-[rgba(226,193,114,0.1)] rounded-lg border border-[rgba(226,193,114,0.2)]">
                      <span className="text-[#e2c172] font-black text-[18px]">
                        +{event.details?.pontos}
                        <span className="text-[12px] ml-1">PTS</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {timeline.length === 0 && (
             <div className="w-full py-8 flex flex-col items-center justify-center opacity-50">
                <CalendarDays className="w-8 h-8 text-[#8e95a3] mb-3" />
                <span className="text-[#8e95a3] text-[13px] font-medium">Nenhum evento registrado ainda.</span>
             </div>
          )}
        </div>

        {/* End of Timeline indicator */}
        <div className="mt-8 mb-6 flex justify-center">
          <div className="w-2 h-2 rounded-full bg-[#1a2438] ring-4 ring-[#121212]" />
        </div>

      </div>
    </div>
  );
}
