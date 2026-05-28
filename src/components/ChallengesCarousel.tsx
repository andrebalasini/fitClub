import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Zap } from 'lucide-react';
import { useFeedChallenges } from '../hooks/useFeedChallenges';
import { useActiveWorkout } from '../contexts/WorkoutContext';
import type { FeedChallenge } from '../hooks/useFeedChallenges';


/** Trigger native haptic feedback if available */
function triggerHaptic(type: 'light' | 'success' = 'light') {
  if ('vibrate' in navigator) {
    navigator.vibrate(type === 'success' ? [30, 50, 80] : [15]);
  }
}

interface ChallengeCardProps {
  challenge: FeedChallenge;
  isActive: boolean;
  onAccept: (challenge: FeedChallenge) => void;
  myAvatarUrl: string;
}

function ChallengeCard({ challenge, isActive, onAccept, myAvatarUrl }: ChallengeCardProps) {
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Animate the progress bar fill on mount/active change
  useEffect(() => {
    const bar = progressBarRef.current;
    if (!bar) return;
    bar.style.width = '0%';
    const raf = requestAnimationFrame(() => {
      bar.style.transition = 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
      bar.style.width = `${challenge.progressPercent}%`;
    });
    return () => cancelAnimationFrame(raf);
  }, [challenge.progressPercent, isActive]);

  return (
    <div
      className="shrink-0 snap-center select-none"
      style={{
        width: 'calc(85vw)',
        maxWidth: '320px',
        opacity: isActive ? 1 : 0.65,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div
        className="w-full rounded-[24px] overflow-hidden flex flex-col shadow-lg"
        style={{
          background: '#131b2b',
        }}
      >
        {/* ── Top bar ── */}
        <div
          className="flex items-center justify-start px-5 py-2.5"
          style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span className="text-white font-black text-[11px] uppercase tracking-widest truncate leading-none mt-[2px]" style={{ letterSpacing: '0.1em' }}>
            {challenge.exercicioNome}
          </span>
        </div>

        {/* ── Race / Progress Layout ── */}
        <div className="px-5 py-3 flex flex-col gap-1.5">
          
          {/* Avatars & Progress Bar Row */}
          <div className="flex items-center justify-between gap-3 relative">
            
            {/* YOU Column */}
            <div className="flex-none flex flex-col items-center gap-1 relative z-10 w-[60px]">
              <span className="font-black text-[10px] uppercase tracking-widest text-[#4da6ff]">
                Você
              </span>
              <div
                className="w-[52px] h-[52px] rounded-full overflow-hidden bg-slate-800 shrink-0"
                style={{
                  border: '2.5px solid rgba(29, 112, 245, 0.9)',
                  boxShadow: '0 0 12px rgba(29, 112, 245, 0.3)',
                }}
              >
                {myAvatarUrl ? (
                  <img
                    src={myAvatarUrl}
                    alt="Você"
                    className="w-full h-full object-cover"
                    draggable={false}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="text-slate-500 w-full h-full p-2.5">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                )}
              </div>
              <span className="text-white font-black text-[13px] leading-none tabular-nums">
                {challenge.myBestCarga}<span className="text-slate-500 text-[10px] font-bold ml-0.5">kg</span>
              </span>
            </div>

            {/* Middle Progress Bar */}
            <div className="flex-1 relative flex flex-col justify-center px-2">
              <div className="w-full flex justify-end text-[#4da6ff] font-bold text-[11px] tracking-wide mb-1">
                {challenge.progressPercent}%
              </div>
              <div
                className="w-full h-2.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <div
                  ref={progressBarRef}
                  className="h-full rounded-full"
                  style={{
                    width: '0%',
                    background: 'linear-gradient(90deg, #1d70f5, #4da6ff)',
                    boxShadow: isActive ? '0 0 10px rgba(29, 112, 245, 0.6)' : 'none',
                  }}
                />
              </div>
              <div className="w-full flex justify-center font-bold tracking-widest text-slate-400 uppercase mt-1.5">
                <span className="text-green-400 text-[12px] drop-shadow-[0_0_4px_rgba(34,197,94,0.3)]">+{challenge.gapKg}kg</span>
              </div>
            </div>

            {/* RIVAL Column */}
            <div className="flex-none flex flex-col items-center gap-1 relative z-10 w-[60px]">
              <span className="font-black text-[10px] uppercase tracking-widest text-[#f87171] truncate max-w-full">
                {challenge.rivalName.split(' ')[0]}
              </span>
              <div
                className="w-[52px] h-[52px] rounded-full overflow-hidden bg-[#1a1a2e] shrink-0"
                style={{
                  border: '2.5px solid rgba(239, 68, 68, 0.8)',
                  boxShadow: '0 0 12px rgba(239, 68, 68, 0.25)',
                }}
              >
                {challenge.rivalAvatarUrl ? (
                  <img
                    src={challenge.rivalAvatarUrl}
                    alt={challenge.rivalName}
                    className="w-full h-full object-cover"
                    draggable={false}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="text-slate-500 w-full h-full p-2.5">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                )}
              </div>
              <span className="text-white font-black text-[13px] leading-none tabular-nums">
                {challenge.rivalCarga}<span className="text-slate-500 text-[10px] font-bold ml-0.5">kg</span>
              </span>
            </div>

          </div>
        </div>

        {/* ── CTA button ── */}
        <div className="px-4 pb-2.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
              onAccept(challenge);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-full font-black text-[11px] uppercase tracking-widest transition-all active:scale-[0.96]"
            style={{
              height: '32px',
              background: 'linear-gradient(135deg, #0047ab, #1d70f5)',
              boxShadow: '0 4px 15px rgba(0, 71, 171, 0.4)',
              color: '#fff',
              letterSpacing: '0.1em',
            }}
          >
            <Zap size={13} className="fill-white" />
            SUPERAR AGORA
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChallengesCarousel() {
  const navigate = useNavigate();
  const { startWorkout, workoutConfig } = useActiveWorkout();
  const { challenges, loading, myAvatarUrl } = useFeedChallenges();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Snap-to-center: detect which card is most visible using lightweight scroll math
  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const { scrollLeft } = container;
    
    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) return;
    
    const cardWidth = children[0].offsetWidth;
    // Math.round detects when the next card crosses the 50% scroll mark
    const index = Math.round(scrollLeft / (cardWidth + 16)); // 16px is gap-4
    if (index >= 0 && index < challenges.length) {
      setActiveIndex(index);
    }
  }, [challenges.length]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleAccept = useCallback((challenge: FeedChallenge) => {
    // Navigate to active workout page
    if (!challenge.fichaId) {
      navigate('/treino/executar');
      return;
    }
    triggerHaptic('success');
    startWorkout({
      fichaId: challenge.fichaId,
      dia: challenge.dia,
      grupos: challenge.grupos,
    });
    navigate('/treino/executar');
  }, [navigate, startWorkout]);

  if (loading) {
    return (
      <div className="w-full flex flex-col justify-center items-center py-12 gap-3.5 select-none">
        <div className="relative flex items-center justify-center">
          {/* Subtle outer pulsing halo */}
          <div className="absolute w-9 h-9 rounded-full bg-[#1d70f5]/10 animate-ping" />
          <Loader2 size={22} className="animate-spin relative z-10" style={{ color: '#1d70f5' }} />
        </div>
        <span className="text-slate-500 font-bold text-[11px] uppercase tracking-[0.12em] animate-pulse">
          Carregando seus desafios...
        </span>
      </div>
    );
  }

    if (challenges.length === 0) {
    return (
      <div
        className="w-full rounded-[24px] flex flex-col items-center justify-center gap-4 py-8 px-6 text-center shadow-xl mx-auto select-none"
        style={{ 
          background: 'linear-gradient(145deg, #131b2b, #0a0f1a)', 
          border: '1px solid rgba(29, 112, 245, 0.15)',
          maxWidth: '360px'
        }}
      >
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_30px_rgba(29, 112, 245, 0.15)]">
          <Zap size={28} className="fill-current" />
        </div>
        
        <div className="flex flex-col gap-1.5">
          <p className="text-white font-black text-[16px] leading-tight tracking-tight">
            Desafios Exclusivos
          </p>
          <p className="text-slate-400 text-[13px] font-medium px-4 leading-relaxed">
            Cadastre e execute seus planos de treino para desbloquear desafios personalizados e competir no ranking! ⚔️
          </p>
        </div>

        <button
          onClick={() => navigate('/treino')}
          className="mt-1 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[13px] tracking-wide transition-all active:scale-95 shadow-[0_4px_15px_rgba(29, 112, 245, 0.3)] uppercase border-none outline-none w-full max-w-[220px]"
        >
          Criar Meu Plano
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Has active workout indicator */}
      {workoutConfig && (
        <div
          className="mx-1 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center"
          style={{ background: 'rgba(29, 112, 245, 0.08)', color: '#4da6ff', border: '1px solid rgba(29,112,245,0.15)' }}
        >
          ⚡ Treino em andamento — aceite um desafio para continuar
        </div>
      )}

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2"
        style={{
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
          paddingLeft: '6vw',
          paddingRight: '6vw',
        }}
      >
        {challenges.map((challenge, index) => (
            <ChallengeCard
            key={challenge.exercicioId}
            challenge={challenge}
            isActive={index === activeIndex}
            onAccept={handleAccept}
            myAvatarUrl={myAvatarUrl}
          />
        ))}
      </div>
    </div>
  );
}
