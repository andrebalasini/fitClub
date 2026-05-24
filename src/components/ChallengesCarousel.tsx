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
          className="h-[36px] flex items-center justify-between px-5"
          style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span className="text-slate-200 font-black text-[10px] uppercase tracking-[0.12em]">
            Radar de Rivais
          </span>
          <div className="font-black text-[10px] tracking-wider leading-none drop-shadow-[0_0_4px_rgba(250,204,21,0.25)]">
            <span className="text-yellow-400 font-black">+25 </span>
            <span className="text-white notranslate">fit</span>
            <span className="text-[#4d9fff] notranslate">Points</span>
          </div>
        </div>

        {/* ── Exercise label ── */}
        <div className="px-5 pt-1 pb-0 flex items-center gap-2">
          <div
            className="h-[1px] flex-1 opacity-20"
            style={{ background: 'linear-gradient(to right, #0047ab, transparent)' }}
          />
          <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest">
            {challenge.exercicioNome}
          </span>
          <div
            className="h-[1px] flex-1 opacity-20"
            style={{ background: 'linear-gradient(to left, #0047ab, transparent)' }}
          />
        </div>

        {/* ── "O Confronto" layout ── */}
        <div className="px-4 py-2 flex items-center justify-between gap-1">
          {/* YOU column */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div
              className="w-[54px] h-[54px] rounded-full overflow-hidden"
              style={{
                border: '2px solid rgba(29, 112, 245, 0.9)',
                boxShadow: '0 0 14px rgba(29, 112, 245, 0.3)',
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
                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="text-slate-500 w-6 h-6">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </div>
            <span
              className="font-black text-[10px] uppercase tracking-widest"
              style={{ color: '#4da6ff' }}
            >
              VOCÊ
            </span>
            <span className="text-white font-black text-[22px] leading-none tabular-nums">
              {challenge.myBestCarga}<span className="text-slate-500 text-[12px] font-bold ml-0.5">kg</span>
            </span>
          </div>

          {/* Center gap indicator */}
          <div className="flex flex-col items-center justify-center px-1">
            <span
              className="font-black text-[13px]"
              style={{ color: '#22c55e', textShadow: '0 0 12px rgba(34,197,94,0.5)' }}
            >
              +{challenge.gapKg}kg
            </span>
            <span className="text-slate-500 text-[8px] uppercase tracking-wider font-bold mt-0.5">
              para superar
            </span>
          </div>

          {/* RIVAL column */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div
              className="w-[54px] h-[54px] rounded-full overflow-hidden"
              style={{
                border: '2px solid rgba(239, 68, 68, 0.7)',
                boxShadow: '0 0 14px rgba(239, 68, 68, 0.2)',
              }}
            >
              {challenge.rivalAvatarUrl ? (
                <img
                  src={challenge.rivalAvatarUrl}
                  alt={challenge.rivalName}
                  className="w-full h-full object-cover"
                  draggable={false}
                  onError={(e) => {
                    // On broken URL, hide and let the sibling div show
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-[#1a1a2e] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="text-slate-500 w-6 h-6">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </div>
            <span
              className="font-black text-[10px] uppercase tracking-widest truncate max-w-[90px] text-center"
              style={{ color: '#f87171' }}
              title={challenge.rivalName}
            >
              {challenge.rivalName.split(' ')[0]}
            </span>
            <span className="text-white font-black text-[22px] leading-none tabular-nums">
              {challenge.rivalCarga}<span className="text-slate-500 text-[12px] font-bold ml-0.5">kg</span>
            </span>
          </div>
        </div>

        {/* ── Pulsing neon progress bar ── */}
        <div className="px-5 mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-500 font-bold text-[8px] uppercase tracking-widest">Sua performance</span>
            <span style={{ color: '#4da6ff' }} className="font-black text-[9px]">
              {challenge.progressPercent}%
            </span>
          </div>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <div
              ref={progressBarRef}
              className="h-full rounded-full"
              style={{
                width: '0%',
                background: 'linear-gradient(90deg, #0047ab, #1d70f5, #4da6ff)',
                boxShadow: isActive ? '0 0 8px rgba(29, 112, 245, 0.8), 0 0 16px rgba(29, 112, 245, 0.4)' : 'none',
              }}
            />
          </div>
        </div>

        {/* ── CTA button ── */}
        <div className="px-4 pb-3.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
              onAccept(challenge);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-full font-black text-[11px] uppercase tracking-widest transition-all active:scale-[0.96]"
            style={{
              height: '38px',
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
