import React, { useState, useEffect, useRef, useCallback, useMemo, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { BottomNav } from '../components/layout/BottomNav';
import { supabase } from '../lib/supabase';
import { CheckCircle, Check, Clock, Loader2, Layers, RefreshCw, Info, Zap, TrendingUp, AlertTriangle, SkipForward, Award, Play, Pause, Square, Edit2, Dumbbell, ArrowUp, ArrowDown, Video } from 'lucide-react';
import { useDragScroll } from '../hooks/useDragScroll';
import { Stepper, LogSetModal } from '../components/LogSetModal';
import { ChallengeVideoModal } from '../components/ChallengeVideoModal';
import { getCurrentUserId } from '../lib/auth';
import { useActiveWorkout } from '../contexts/WorkoutContext';
import { useFeedChallenges } from '../hooks/useFeedChallenges';
import type { FeedChallenge } from '../hooks/useFeedChallenges';

import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { FitCheckCamera } from '../components/FitCheckCamera';
import confetti from 'canvas-confetti';

const DEFAULT_EXERCISE_IMAGE = 'https://fafisurbnecapdpguudb.supabase.co/storage/v1/object/public/assets/geral/exercise_default_min.png';

interface HistoryRecord {
    id: string;
    exercicio_id: string;
    serie_atual: number;
    repeticoes_feitas: number;
    carga_usada: number;
    created_at: string;
    feedback: string;
}

interface DayExercise {
    id: string;
    exercicio_id: string;
    nome: string;
    imagem_url: string | null;
    video_url: string | null;
    series: number;
    repeticoes: number;
    carga: number;
    descanso: number;
    ordem: number;
    grupo?: string;
    ultimo_feedback?: string;
    is_pyramid?: boolean;
    pyramid_series?: { reps: number; kg: number }[] | null;
}

type ChartPeriod = '1S' | '1M' | '3M' | 'Todos';

class TimerErrorBoundary extends Component<{children: ReactNode, onSkipError: () => void}, {hasError: boolean}> {
    constructor(props: {children: ReactNode, onSkipError: () => void}) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Timer Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#1c2436] to-[#121825] rounded-[24px]">
                    <AlertTriangle size={48} className="text-red-500 mb-6" />
                    <h3 className="text-white text-xl font-bold mb-2">Erro no Descanso</h3>
                    <p className="text-slate-400 text-sm text-center mb-6">Não foi possível carregar o cronômetro para este exercício.</p>
                    <button 
                        onClick={() => { 
                            this.setState({hasError: false}); 
                            this.props.onSkipError(); 
                        }} 
                        className="w-full py-4 rounded-xl bg-blue-500 text-white font-bold text-base shadow-lg shadow-blue-500/25"
                    >
                        Continuar Treino
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

class WorkoutErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error?: Error, errorInfo?: ErrorInfo}> {
    constructor(props: {children: ReactNode}) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Critical Workout Error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#0f141e] flex flex-col items-center justify-center p-6 font-sans">
                    <AlertTriangle size={64} className="text-red-500 mb-6 animate-pulse" />
                    <h1 className="text-white text-2xl font-bold mb-4 text-center">Ops! Ocorreu um erro.</h1>
                    <p className="text-slate-400 text-center mb-8 max-w-sm">
                        Detectamos uma falha inesperada na tela de treino. Fique tranquilo, seu progresso até aqui está salvo.
                    </p>
                    <button 
                        onClick={() => window.location.href = '/treino'} 
                        className="w-full max-w-xs py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl active:scale-95 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={20} />
                        Recarregar Treino
                    </button>
                    {this.state.error && (
                        <div className="mt-12 w-full max-w-md p-4 bg-black/40 rounded-xl border border-red-500/20">
                            <p className="text-red-400 text-[10px] font-mono break-all">
                                {this.state.error.message}
                            </p>
                        </div>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}

// Extracted component to avoid IIFE inside JSX (causes Babel parse error)
function RestCardContent({
    exercise, currentIndex, currentSetIndex, completedIndices, exercises,
    restTimeRemaining, formatTime, jumpedRef, handleSaveSetLogRef,
    pendingLogRepsRef, pendingLogWeightRef, pendingLogFeedbackRef,
    setIsResting, setRestEndTime,
    pendingLogReps, setPendingLogReps,
    pendingLogWeight, setPendingLogWeight,
    pendingLogFeedback, setPendingLogFeedback,
}: {
    exercise: DayExercise;
    currentIndex: number;
    currentSetIndex: number;
    completedIndices: number[];
    exercises: DayExercise[];
    restTimeRemaining: number;
    formatTime: (s: number) => string;
    jumpedRef: React.MutableRefObject<boolean>;
    handleSaveSetLogRef: React.MutableRefObject<((reps: number, weight: number, feedback: string) => void) | null>;
    pendingLogRepsRef: React.MutableRefObject<number>;
    pendingLogWeightRef: React.MutableRefObject<number>;
    pendingLogFeedbackRef: React.MutableRefObject<string>;
    setIsResting: (v: boolean) => void;
    setRestEndTime: (v: number | null) => void;
    pendingLogReps: number;
    setPendingLogReps: (v: number) => void;
    pendingLogWeight: number;
    setPendingLogWeight: (v: number) => void;
    pendingLogFeedback: string;
    setPendingLogFeedback: (v: string) => void;
}) {
    const isLastExerciseAndLastSet =
        exercises.every((_, i) => i === currentIndex || completedIndices.includes(i)) &&
        currentSetIndex === exercise.series - 1;

    return (
        <div className="flex flex-col h-full w-full">
            {!isLastExerciseAndLastSet && (
                <div className="flex flex-col items-center justify-center shrink-0 gap-2 mb-4">
                    <div className="flex items-center justify-center gap-2 w-full text-center">
                        <Clock size={18} className="text-blue-500" />
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[15px]">
                            Descanso <span className="text-blue-500">{currentSetIndex + 1}</span>{' '}
                            <span className="text-slate-500 text-[12px]">de</span>{' '}
                            <span className="text-blue-500">{exercise.series}</span>
                        </span>
                    </div>
                    <div className="text-white text-[76px] font-black tabular-nums tracking-tighter drop-shadow-lg leading-none text-center mt-[-6px]">
                        {formatTime(restTimeRemaining)}
                    </div>
                    <button
                        onClick={() => {
                            if (!jumpedRef.current && handleSaveSetLogRef.current) {
                                handleSaveSetLogRef.current(pendingLogRepsRef.current, pendingLogWeightRef.current, pendingLogFeedbackRef.current);
                            } else {
                                setIsResting(false);
                                setRestEndTime(null);
                            }
                        }}
                        className="w-auto self-center mt-1 py-2 px-5 rounded-xl bg-slate-700/80 text-slate-300 font-bold text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 flex-shrink-0 tracking-widest uppercase"
                    >
                        FINALIZAR DESCANSO
                        <SkipForward size={14} strokeWidth={2} className="text-blue-500" />
                    </button>
                </div>
            )}

            {isLastExerciseAndLastSet && (
                <div className="flex items-center justify-center gap-2 w-full text-center shrink-0 mb-3 pt-2">
                    <CheckCircle size={16} className="text-blue-500" />
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[13px]">
                        Série <span className="text-blue-500">{currentSetIndex + 1}</span>{' '}
                        <span className="text-slate-500 text-[11px]">de</span>{' '}
                        <span className="text-blue-500">{exercise.series}</span>
                    </span>
                </div>
            )}

            <div className="flex-1 flex flex-col justify-center">
                <div className="w-full border-t border-slate-800/60 mb-4" />
                <p className="w-full text-left text-slate-500 text-[11px] font-bold uppercase tracking-widest opacity-80 px-1 mb-3">
                    COMO FOI ESSA SÉRIE?
                </p>
                <div className="grid grid-cols-2 gap-3 w-full mb-6">
                    <Stepper label="Repetições" value={pendingLogReps} onChange={setPendingLogReps} min={0} max={300} icon={<RefreshCw />} compact={true} />
                    <Stepper label="Carga" value={pendingLogWeight} onChange={setPendingLogWeight} min={0} max={500} step={1} fastStep={5} unit="kg" icon={<Dumbbell />} compact={true} />
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="flex flex-col items-center gap-1.5">
                        <button onClick={() => setPendingLogFeedback('facil')} className={`w-full flex items-center justify-center py-2 rounded-xl transition-all active:scale-95 ${pendingLogFeedback === 'facil' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700/80 text-slate-300 hover:text-white'}`}>
                            <ArrowUp size={20} />
                        </button>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${pendingLogFeedback === 'facil' ? 'text-green-400' : 'text-slate-500'}`}>+Carga</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                        <button onClick={() => setPendingLogFeedback('ideal')} className={`w-full flex items-center justify-center py-2 rounded-xl transition-all active:scale-95 ${pendingLogFeedback === 'ideal' ? 'bg-blue-500 text-white' : 'bg-slate-700/80 text-slate-300 hover:text-white'}`}>
                            <Check size={20} strokeWidth={3} />
                        </button>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${pendingLogFeedback === 'ideal' ? 'text-blue-500' : 'text-slate-500'}`}>Manter</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                        <button onClick={() => setPendingLogFeedback('dificil')} className={`w-full flex items-center justify-center py-2 rounded-xl transition-all active:scale-95 ${pendingLogFeedback === 'dificil' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700/80 text-slate-300 hover:text-white'}`}>
                            <ArrowDown size={20} />
                        </button>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${pendingLogFeedback === 'dificil' ? 'text-red-400' : 'text-slate-500'}`}>-Carga</span>
                    </div>
                </div>
                <div className="w-full border-t border-slate-800/60" />
            </div>

            {/* Button is OUTSIDE the overflow-y-auto div to prevent horizontal glow clipping */}
            {isLastExerciseAndLastSet && (
                <button
                    onClick={() => {
                        if (handleSaveSetLogRef.current) {
                            handleSaveSetLogRef.current(pendingLogRepsRef.current, pendingLogWeightRef.current, pendingLogFeedbackRef.current);
                        }
                    }}
                    className="galactic-btn w-[calc(100%-28px)] mx-auto flex-shrink-0 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-4 mb-1"
                >
                    <div className="relative z-10 flex items-center justify-center gap-2">
                        <CheckCircle size={18} />
                        <span className="text-[15px] font-black tracking-wide galactic-text-glow uppercase">Finalizar Treino</span>
                    </div>
                </button>
            )}
        </div>
    );
}

const PerformanceChart = ({ 
    data, 
    isWeightBased, 
    bestValOverall,
    label
}: { 
    data: { date: string, dateLabel: string, bestSetCarga: number, bestSetReps: number }[],
    isWeightBased: boolean,
    bestValOverall: number,
    label: string
}) => {
    const [period, setPeriod] = useState<ChartPeriod>('3M');
    const [hovered, setHovered] = useState<number | null>(null);

    const filteredData = useMemo(() => {
        if (period === 'Todos') return data;
        const cutoff = new Date();
        if (period === '1S') cutoff.setDate(cutoff.getDate() - 7);
        if (period === '1M') cutoff.setMonth(cutoff.getMonth() - 1);
        if (period === '3M') cutoff.setMonth(cutoff.getMonth() - 3);
        
        return data.filter(d => new Date(d.date) >= cutoff);
    }, [data, period]);

    const chartMax = Math.max(bestValOverall * 1.1, 10);

    return (
        <div className="bg-[#242e42]/30 rounded-[20px] p-6 shadow-xl flex flex-col gap-6 w-full">
            <div className="flex items-center justify-between w-full">
                <span className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-wider drop-shadow-sm truncate pr-2">Evolução</span>
                <div className="flex bg-[#0f141e]/80 rounded-lg p-1 shadow-inner shrink-0">
                    {(['1S', '1M', '3M', 'Todos'] as ChartPeriod[]).map(p => (
                        <button 
                            key={p} 
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all active:scale-95 ${period === p ? 'bg-slate-700/80 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>
            
            {filteredData.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-center px-4">
                    <TrendingUp size={24} className="mb-2 opacity-50" />
                    <span className="text-sm font-medium leading-tight">Realize mais um treino para ver o gráfico.</span>
                </div>
            ) : (
                <div className="relative w-full h-[220px] flex pl-10 pr-4 select-none touch-none">
                     {/* Y Axis Labels */}
                     <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-slate-500 text-xs font-medium text-right pr-3">
                          <span>{Math.round(chartMax)}</span>
                          <span>{Math.round(chartMax / 2)}</span>
                          <span>0</span>
                     </div>
        
                     {/* Chart Content and X-axis labels area */}
                     <div className="relative flex-1 h-full flex flex-col">
                          {/* Grid and Bars Area */}
                          <div className="relative flex-1 border-l border-b border-slate-700/50 flex items-end justify-around px-2 pb-[1px]">
                               {/* PR Line */}
                               {bestValOverall > 0 && (
                                   <div 
                                      className="absolute left-0 right-0 border-t border-dashed border-slate-500/30 pointer-events-none z-0" 
                                      style={{ bottom: `${(bestValOverall / chartMax) * 100}%` }}
                                   >
                                        <span className="absolute -top-[16px] left-1 text-[9px] font-bold text-slate-400/70 uppercase tracking-widest px-1.5 py-0.5 bg-[#1a2133] rounded">PR</span>
                                   </div>
                               )}

                               {filteredData.map((d, i) => {
                                    const val = isWeightBased ? d.bestSetCarga : d.bestSetReps;
                                    const heightPct = Math.max((val / chartMax) * 100, 3);
                                    const isPR = val === bestValOverall;
                                    const isHovered = hovered === i;

                                    return (
                                        <div 
                                            key={d.date} 
                                            className="flex-1 max-w-[44px] mx-1 h-full flex flex-col justify-end cursor-pointer group z-10 relative"
                                            onMouseEnter={() => setHovered(i)}
                                            onMouseLeave={() => setHovered(null)}
                                            onTouchStart={() => setHovered(i)}
                                        >
                                            {/* Tooltip */}
                                            <div className={`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[#0f141e] text-white text-xs font-bold py-2.5 px-3.5 rounded-lg border border-white/10 shadow-xl whitespace-nowrap transition-all duration-200 pointer-events-none flex gap-[0.4rem] items-center z-20 ${isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-[0.90]'}`}>
                                                <span className="text-slate-400 tracking-wider text-[11px]">{d.dateLabel}</span>
                                                {isWeightBased && (
                                                    <>
                                                        <span className="w-px h-3.5 bg-white/10" />
                                                        <span className="text-blue-400">{d.bestSetCarga}kg</span>
                                                    </>
                                                )}
                                                <span className="w-px h-3.5 bg-white/10" />
                                                <span className="text-slate-300">{d.bestSetReps} {label === 'Tempo (min)' ? 'min' : 'reps'}</span>
                                            </div>

                                            <div 
                                                className={`w-full rounded-t-md transition-all duration-300 relative flex flex-col justify-end items-center pb-1 ${
                                                    isPR 
                                                        ? 'bg-gradient-to-t from-blue-600/40 via-blue-500 to-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)]' 
                                                        : 'bg-gradient-to-t from-slate-700/40 via-slate-600/80 to-slate-500 group-hover:from-blue-500/30 group-hover:to-blue-400 group-hover:scale-y-[1.02] origin-bottom'
                                                }`}
                                                style={{ height: `${heightPct}%` }}
                                            >
                                                <span className={`text-[11px] font-black tracking-tight ${isPR ? 'text-white' : 'text-slate-200'} select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]`}>
                                                    {val}
                                                </span>
                                            </div>
                                        </div>
                                    )
                               })}
                          </div>

                          {/* X Axis Labels perfectly aligned with columns! */}
                          <div className="h-8 flex justify-around items-center px-2 pt-1">
                               {filteredData.map((d) => (
                                   <div key={d.date} className="flex-1 max-w-[44px] mx-1 text-center">
                                       <span className="text-slate-500 text-[11px] font-semibold">{d.dateLabel}</span>
                                   </div>
                               ))}
                          </div>
                     </div>
                </div>
            )}
        </div>
    );
};

/**
 * Analyzes exercise history to produce a smart feedback tip.
 * Rules:
 * - Mostly 'facil' in last session → suggest increasing weight
 * - Mostly 'dificil' + hit reps in most sets → encourage keeping weight, focus on quality
 * - Mostly 'dificil' + missed reps in most sets → suggest reducing weight or maintaining
 * - 'ideal' for 2 consecutive sessions + hit reps → suggest increasing weight
 * - 'ideal' only 1 session → no feedback
 * - All other cases → no feedback
 */
export function getExerciseFeedbackTip(
    exerciseId: string,
    targetReps: number,
    history: HistoryRecord[]
): { message: string; color: string; icon: 'up' | 'keep' | 'down' } | null {
    // Filter history for this exercise, sorted ascending by date
    const exHist = history
        .filter(h => h.exercicio_id === exerciseId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (exHist.length === 0) return null;

    // Group by workout session (date only)
    const sessions: Record<string, HistoryRecord[]> = {};
    exHist.forEach(h => {
        const date = h.created_at.split('T')[0];
        if (!sessions[date]) sessions[date] = [];
        sessions[date].push(h);
    });

    // Ignorar treino de "hoje" para que o feedback baseie-se em dias passados
    const todayStr = new Date().toISOString().split('T')[0];
    const sessionDates = Object.keys(sessions).filter(date => date !== todayStr).sort();
    
    if (sessionDates.length === 0) return null;

    const lastSession = sessions[sessionDates[sessionDates.length - 1]];
    const prevSession = sessionDates.length >= 2 ? sessions[sessionDates[sessionDates.length - 2]] : null;

    // Helper: get majority feedback for a session
    const getMajorityFeedback = (s: HistoryRecord[]): string | null => {
        const counts: Record<string, number> = {};
        s.forEach(r => {
            const fb = r.feedback || 'ideal';
            counts[fb] = (counts[fb] || 0) + 1;
        });
        let maxFb = '';
        let maxCount = 0;
        for (const [fb, count] of Object.entries(counts)) {
            if (count > maxCount) { maxCount = count; maxFb = fb; }
        }
        return maxCount > s.length / 2 ? maxFb : null;
    };

    // Helper: did user hit target reps in most sets?
    const hitRepsMajority = (s: HistoryRecord[]): boolean => {
        const hitCount = s.filter(r => r.repeticoes_feitas >= targetReps).length;
        return hitCount > s.length / 2;
    };

    // Helper: get predominant load for a session
    const getPredominantCarga = (s: HistoryRecord[]): number => {
        const counts: Record<number, number> = {};
        s.forEach(r => {
            const carga = r.carga_usada;
            counts[carga] = (counts[carga] || 0) + 1;
        });
        let maxCarga = 0;
        let maxCount = 0;
        for (const [c, count] of Object.entries(counts)) {
            if (count > maxCount) { maxCount = count; maxCarga = Number(c); }
        }
        return maxCarga;
    };

    const lastFeedback = getMajorityFeedback(lastSession);

    // Rule 1: Mostly 'facil' → suggest increasing weight
    if (lastFeedback === 'facil') {
        return {
            message: 'Último treino pareceu fácil! Que tal aumentar a carga?',
            color: 'green',
            icon: 'up'
        };
    }

    // Rule 2 & 3: Mostly 'dificil'
    if (lastFeedback === 'dificil') {
        if (hitRepsMajority(lastSession)) {
            return {
                message: 'Foi difícil, mas você completou! Mantenha o peso e foque na qualidade.',
                color: 'blue',
                icon: 'keep'
            };
        } else {
            return {
                message: 'Considere reduzir a carga ou manter e buscar bater as repetições.',
                color: 'amber',
                icon: 'down'
            };
        }
    }

    // Rule 4 & 5: 'ideal'
    if (lastFeedback === 'ideal') {
        if (prevSession) {
            const prevFeedback = getMajorityFeedback(prevSession);
            const lastCarga = getPredominantCarga(lastSession);
            const prevCarga = getPredominantCarga(prevSession);
            
            if (
                prevFeedback === 'ideal' && 
                hitRepsMajority(lastSession) && 
                hitRepsMajority(prevSession) &&
                lastCarga === prevCarga
            ) {
                return {
                    message: `Dois treinos ideais seguidos com ${lastCarga}kg! Hora de subir o peso! 💪`,
                    color: 'green',
                    icon: 'up'
                };
            }
        }
        return null;
    }

    return null;
}

const coachPhrasesGlobal = [
    "A dor é o sinal de que a fraqueza está saindo. Faltam {setsLeft} séries.",
    "Não negocie com a sua mente. Execute. Só mais {setsLeft}.",
    "Seu corpo aguenta, é sua mente que você precisa convencer. Faltam {setsLeft}.",
    "O descanso é um privilégio de quem terminou. Só faltam {setsLeft}.",
    "Conforto não constrói resultados de elite. Sangue no olho, faltam {setsLeft}.",
    "Cada repetição é uma martelada no físico. Só mais {setsLeft}.",
    "Onde a maioria para, você acelera. Faltam {setsLeft} séries.",
    "Silencie o cansaço. O resultado não ouve desculpas. Só mais {setsLeft}.",
    "Transforme o 'não consigo' em 'está feito'. Faltam {setsLeft}.",
    "Pare de ser comum. Atletas de elite não param. Só faltam {setsLeft}.",
    "O ferro não mente. Ele sabe se houve esforço máximo. Faltam {setsLeft}.",
    "A vitória é construída agora, no cansaço. Só mais {setsLeft}.",
    "Ninguém vai treinar por você. Faltam {setsLeft} séries.",
    "A disciplina é o que mantém você no caminho. Só mais {setsLeft}.",
    "Supere a vontade de parar. Faltam {setsLeft}.",
    "Cada gota de suor é um investimento no seu objetivo. Faltam {setsLeft}.",
    "Mantenha a densidade. A evolução exige foco total. Faltam {setsLeft}.",
    "Controle a fase negativa. Domine a carga. Só mais {setsLeft}.",
    "Eficiência metabólica máxima. Use bem este descanso. Faltam {setsLeft}.",
    "Conexão mente-músculo ativada. Concentração máxima. Só mais {setsLeft}.",
    "Treino técnico é treino eficiente. Faltam {setsLeft} séries.",
    "Sua melhor versão exige sua melhor execução. Faltam {setsLeft}.",
    "Cadência controlada, resultado garantido. Só mais {setsLeft}.",
    "Respeite o plano, confie no processo. Faltam {setsLeft} séries.",
    "A constância é a base da excelência. Só mais {setsLeft}.",
    "Aumente a tensão mecânica. Não alivie agora. Faltam {setsLeft} séries.",
    "Sinta cada fibra recrutada. O progresso é real. Só mais {setsLeft}.",
    "Padrão de movimento impecável. É assim que se evolui. Faltam {setsLeft}.",
    "Cada série é uma oportunidade de perfeição. Só mais {setsLeft}.",
    "O físico de elite exige o esforço de hoje. Faltam {setsLeft}."
];

const saideiraPhrasesGlobal = [
    "É AGORA! O esforço final separa vencedores de amadores. ÚLTIMA!",
    "Tudo o que restou no tanque. Deixe tudo aqui. ÚLTIMA SÉRIE!",
    "O round final. É aqui que a verdadeira mudança acontece. VAI!",
    "Missão quase cumprida. Dê o seu melhor na última!",
    "Sem reservas agora. Finalize com intensidade máxima. ÚLTIMA!",
    "É a saideira! Honre o seu treino até o último segundo!",
    "Foco total na última série. Acabe com autoridade!",
    "A última repetição é a que define o seu compromisso. VAI!",
    "Não guarde energia para depois. É a última. EXPLODE!",
    "Feche o treino como um verdadeiro campeão. Última série!"
];

function generateRestPhrase(seriesRestantes: number): string {
    if (seriesRestantes === 1) {
        const idx = Math.floor(Math.random() * saideiraPhrasesGlobal.length);
        return saideiraPhrasesGlobal[idx];
    } else {
        const idx = Math.floor(Math.random() * coachPhrasesGlobal.length);
        return coachPhrasesGlobal[idx].replace(/{setsLeft}/g, String(seriesRestantes));
    }
}

function ActiveWorkoutContent() {
    const navigate = useNavigate();
    const { workoutConfig, endWorkout, recordAction } = useActiveWorkout();
    
    // Get state passed from context
    const { fichaId, dia, grupos } = workoutConfig || {};
    const gruposList: string[] = grupos || [];

    const [exerciseHistory, setExerciseHistory] = useState<HistoryRecord[]>([]);
    const [exercises, setExercises] = useState<DayExercise[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(() => parseInt(localStorage.getItem('@fw:currentIndex') || '0', 10));
    const [currentSetIndex, setCurrentSetIndex] = useState(() => parseInt(localStorage.getItem('@fw:currentSetIndex') || '0', 10));
    const [focusedIndex, setFocusedIndex] = useState(() => parseInt(localStorage.getItem('@fw:focusedIndex') || '0', 10));
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [workoutStarted, setWorkoutStarted] = useState(() => localStorage.getItem('@fw:workoutStarted') === 'true');
    const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(() => {
        const val = localStorage.getItem('@fw:workoutStartTime');
        return val ? parseInt(val, 10) : null;
    });
    const [showExitModal, setShowExitModal] = useState(false);
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);
    const [recordingExercise, setRecordingExercise] = useState<DayExercise | null>(null);
    const [showValidationRules, setShowValidationRules] = useState(false);

    // ── Challenge state ──────────────────────────────────────────────────
    const { challenges: allChallenges } = useFeedChallenges();

    // FitCheck States
    const [showWorkoutCompletedModal, setShowWorkoutCompletedModal] = useState(false);
    const [showFitCheckCamera, setShowFitCheckCamera] = useState(false);
    const [earnedFitPoints, setEarnedFitPoints] = useState(0);
    const [sessionVolumeKg, setSessionVolumeKg] = useState(0);
    const [fitCheckInitialImage, setFitCheckInitialImage] = useState<string | null>(null);
    const fitCheckFileInputRef = useRef<HTMLInputElement>(null);

    const [editingSet, setEditingSet] = useState<{
        id: string;
        exercicio_id: string;
        weight: number;
        reps: number;
        setNumber: number;
        exerciseName: string;
        exerciseGroup: string;
        exerciseImage?: string;
        totalSets: number;
    } | null>(null);

    const [pendingLogReps, setPendingLogReps] = useState<number>(0);
    const [pendingLogWeight, setPendingLogWeight] = useState<number>(0);
    const [pendingLogFeedback, setPendingLogFeedback] = useState<string>('ideal');

    useEffect(() => {
        if (showWorkoutCompletedModal) {
            const duration = 3000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function() {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
                confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
            }, 250);
        }
    }, [showWorkoutCompletedModal]);

    const [cardioState, setCardioState] = useState<'idle' | 'running' | 'paused'>(() => {
        return (localStorage.getItem('@fw:cardioState') as 'idle' | 'running' | 'paused') || 'idle';
    });
    const [cardioEndTime, setCardioEndTime] = useState<number | null>(() => {
        const val = localStorage.getItem('@fw:cardioEndTime');
        return val ? parseInt(val, 10) : null;
    });
    const [cardioRemainingDuration, setCardioRemainingDuration] = useState<number>(() => {
        const val = localStorage.getItem('@fw:cardioRemainingDuration');
        return val ? parseInt(val, 10) : 0;
    });
    const [showStopCardioConfirm, setShowStopCardioConfirm] = useState(false);

    const [sessionHistoryIds, setSessionHistoryIds] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('@fw:sessionHistoryIds') || '[]'); } catch { return []; }
    });
    const [completedIndices, setCompletedIndices] = useState<number[]>(() => {
        try { return JSON.parse(localStorage.getItem('@fw:completedIndices') || '[]'); } catch { return []; }
    });
    const [setsLoggedByIndex, setSetsLoggedByIndex] = useState<Record<number, number>>(() => {
        try { return JSON.parse(localStorage.getItem('@fw:setsLoggedByIndex') || '{}'); } catch { return {}; }
    });
    const [isSavingExit, setIsSavingExit] = useState(false);
    const [isResting, setIsResting] = useState(() => localStorage.getItem('@fw:isResting') === 'true');
    const [restTimeRemaining, setRestTimeRemaining] = useState(0);
    const [restEndTime, setRestEndTime] = useState<number | null>(() => {
        const val = localStorage.getItem('@fw:restEndTime');
        return val ? parseInt(val, 10) : null;
    });
    const [currentRestPhrase, setCurrentRestPhrase] = useState(() => localStorage.getItem('@fw:currentRestPhrase') || '');
    const carouselRef = useDragScroll<HTMLDivElement>({ disabled: false });
    const isScrollingProgrammatically = useRef(false);
    const handleNextExerciseRef = useRef<(() => void) | null>(null);
    const jumpedRef = useRef(false);
    const exerciseHistoryRef = useRef<HistoryRecord[]>([]);
    const sessionHistoryIdsRef = useRef<string[]>([]);
    const setsLoggedByIndexRef = useRef<Record<number, number>>({});
    /** Mutex: prevents handleFinishWorkout from running more than once (timer + button race condition) */
    const isFinishingWorkoutRef = useRef(false);
    /** Mirror of workoutStartTime in a ref so closures always read the latest value */
    const workoutStartTimeRef = useRef<number | null>(null);
    
    const pendingLogRepsRef = useRef(pendingLogReps);
    const pendingLogWeightRef = useRef(pendingLogWeight);
    const pendingLogFeedbackRef = useRef(pendingLogFeedback);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSaveSetLogRef = useRef<any>(null);

    useEffect(() => {
        pendingLogRepsRef.current = pendingLogReps;
        pendingLogWeightRef.current = pendingLogWeight;
        pendingLogFeedbackRef.current = pendingLogFeedback;
    }, [pendingLogReps, pendingLogWeight, pendingLogFeedback]);

    useEffect(() => {
        if (!workoutConfig) return;

        localStorage.setItem('@fw:currentIndex', currentIndex.toString());
        localStorage.setItem('@fw:currentSetIndex', currentSetIndex.toString());
        localStorage.setItem('@fw:focusedIndex', focusedIndex.toString());
        localStorage.setItem('@fw:workoutStarted', workoutStarted.toString());
        if (workoutStartTime) localStorage.setItem('@fw:workoutStartTime', workoutStartTime.toString());
        else localStorage.removeItem('@fw:workoutStartTime');
        localStorage.setItem('@fw:sessionHistoryIds', JSON.stringify(sessionHistoryIds));
        localStorage.setItem('@fw:isResting', isResting.toString());
        if (restEndTime) localStorage.setItem('@fw:restEndTime', restEndTime.toString());
        else localStorage.removeItem('@fw:restEndTime');
        
        localStorage.setItem('@fw:cardioState', cardioState);
        if (cardioEndTime) localStorage.setItem('@fw:cardioEndTime', cardioEndTime.toString());
        else localStorage.removeItem('@fw:cardioEndTime');
        localStorage.setItem('@fw:cardioRemainingDuration', cardioRemainingDuration.toString());
        localStorage.setItem('@fw:completedIndices', JSON.stringify(completedIndices));
        localStorage.setItem('@fw:setsLoggedByIndex', JSON.stringify(setsLoggedByIndex));
        localStorage.setItem('@fw:currentRestPhrase', currentRestPhrase);
    }, [workoutConfig, currentIndex, currentSetIndex, focusedIndex, workoutStarted, workoutStartTime, sessionHistoryIds, isResting, restEndTime, cardioState, cardioEndTime, cardioRemainingDuration, completedIndices, setsLoggedByIndex, currentRestPhrase]);

    // Keep refs in sync with state so closures always read fresh values
    useEffect(() => { exerciseHistoryRef.current = exerciseHistory; }, [exerciseHistory]);
    useEffect(() => { sessionHistoryIdsRef.current = sessionHistoryIds; }, [sessionHistoryIds]);
    useEffect(() => { setsLoggedByIndexRef.current = setsLoggedByIndex; }, [setsLoggedByIndex]);
    useEffect(() => { workoutStartTimeRef.current = workoutStartTime; }, [workoutStartTime]);

    const isInitialMount = useRef(true);
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        
        // Read sets done for this specific workout position (not exercicio_id) to avoid duplicate-exercise bug
        const setsDone = setsLoggedByIndexRef.current[currentIndex] ?? 0;
        setCurrentSetIndex(setsDone);
        
        // Resetar cardio state
        setCardioState('idle');
        setCardioEndTime(null);
        setCardioRemainingDuration(0);
    }, [currentIndex]);

    useEffect(() => {
        if (!fichaId || !dia) {
            endWorkout();
            return;
        }

        async function fetchExercisesAndHistory() {
            setIsLoading(true);
            setFetchError(null);
            const { data, error } = await supabase
                .from('tbTreinos')
                .select(`
                    id,
                    exercicio_id,
                    series,
                    repeticoes,
                    carga,
                    descanso,
                    ordem,
                    is_pyramid,
                    pyramid_series,
                    tbExercicios (
                        nome,
                        imagem_url,
                        video_url,
                        grupo
                    )
                `)
                .eq('ficha_id', fichaId)
                .eq('dia', dia)
                .order('ordem');

            if (!error && data) {
                const mapped = data.map((row: any) => ({
                    id: row.id,
                    exercicio_id: row.exercicio_id,
                    nome: row.tbExercicios?.nome || 'Exercício',
                    imagem_url: row.tbExercicios?.imagem_url || null,
                    video_url: row.tbExercicios?.video_url || null,
                    series: row.series,
                    repeticoes: row.repeticoes,
                    carga: row.carga,
                    descanso: row.descanso,
                    ordem: row.ordem,
                    grupo: row.tbExercicios?.grupo,
                    is_pyramid: row.is_pyramid,
                    pyramid_series: row.pyramid_series
                }));
                const expIds = mapped.map((m: any) => m.exercicio_id);
                if (expIds.length > 0) {
                    const { data: histData } = await supabase
                        .from('tbHistorico')
                        .select('id, exercicio_id, carga_usada, repeticoes_feitas, serie_atual, created_at, feedback')
                        .in('exercicio_id', expIds)
                        .eq('user_id', getCurrentUserId())
                        .order('created_at', { ascending: true });
                    
                    if (histData && histData.length > 0) {
                        setExerciseHistory(histData as HistoryRecord[]);

                        // Atualiza a carga de cada exercício para o valor da última vez que o usuário o fez
                        const reversedHist = [...histData].reverse();
                        mapped.forEach((m: any) => {
                            const lastRecord = reversedHist.find(h => h.exercicio_id === m.exercicio_id);
                            if (lastRecord) {
                                if (lastRecord.carga_usada !== undefined && lastRecord.carga_usada !== null) {
                                    m.carga = lastRecord.carga_usada;
                                }
                                if (lastRecord.feedback) {
                                    m.ultimo_feedback = lastRecord.feedback;
                                }
                            }
                        });
                    }
                }

                setExercises(mapped as any);
            } else if (error) {
                console.error("Erro ao carregar exercícios:", error);
                setFetchError(error.message);
            }
            setIsLoading(false);
        }

        fetchExercisesAndHistory();
    }, [fichaId, dia, endWorkout]);

    // ── Filter challenges that match this workout's exercises ───────────
    const workoutChallenges = useMemo<FeedChallenge[]>(() => {
        const exercicioIds = new Set(exercises.map(e => e.exercicio_id));
        return allChallenges.filter(c => exercicioIds.has(c.exercicioId));
    }, [allChallenges, exercises]);

    // Set of exercicio_ids that have an active challenge (for card styling)
    const challengeExercicioIds = useMemo(
        () => new Set(workoutChallenges.map(c => c.exercicioId)),
        [workoutChallenges]
    );

    const handleStartWorkout = () => {
        setWorkoutStarted(true);
        setWorkoutStartTime(Date.now());
        recordAction();
    };

    const formatTime = (totalSeconds: number) => {
        if (isNaN(totalSeconds) || totalSeconds === undefined || totalSeconds === null) totalSeconds = 0;
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Scroll carousel to a specific card index
    const scrollToCard = useCallback((index: number) => {
        const container = carouselRef.current;
        if (!container) return;
        const cards = container.children;
        if (index >= cards.length) return;
        const card = cards[index] as HTMLElement;
        const containerRect = container.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const scrollOffset = cardRect.left - containerRect.left + container.scrollLeft - (containerRect.width - cardRect.width) / 2;
        isScrollingProgrammatically.current = true;
        setFocusedIndex(index);
        container.scrollTo({ left: scrollOffset, behavior: 'smooth' });
        setTimeout(() => { isScrollingProgrammatically.current = false; }, 500);
    }, [carouselRef]);

    const initialScrollDone = useRef(false);
    useEffect(() => {
        if (!isLoading && exercises.length > 0 && !initialScrollDone.current) {
            setTimeout(() => {
                scrollToCard(focusedIndex);
                initialScrollDone.current = true;
            }, 100);
        }
    }, [isLoading, exercises.length, scrollToCard, focusedIndex]);

    const handleEditSessionRecord = (recordId: string, currentWeight: number, currentReps: number, _isCardio: boolean, setNumber: number) => {
        const currentEx = exercises[focusedIndex] as any;
        if (!currentEx) return;

        setEditingSet({
            id: recordId,
            exercicio_id: currentEx.exercicio_id,
            weight: currentWeight,
            reps: currentReps,
            setNumber: setNumber,
            exerciseName: currentEx.nome || "Exercício",
            exerciseGroup: currentEx.grupo || "Musculação",
            exerciseImage: currentEx.imagem_url || undefined,
            totalSets: currentEx.series || 1
        });
    };

    const handleInitiateRestAndLog = () => {
        const currentExercise = exercises[currentIndex];
        if (!currentExercise) return;

        let defaultReps = currentExercise.repeticoes;
        let defaultWeight = currentExercise.carga;

        if (currentExercise.is_pyramid && currentExercise.pyramid_series && currentExercise.pyramid_series.length > 0) {
            const targetSet = currentExercise.pyramid_series[currentSetIndex];
            if (targetSet) {
                defaultReps = targetSet.reps;
                defaultWeight = targetSet.kg;
            }
        }

        setPendingLogReps(defaultReps);
        setPendingLogWeight(defaultWeight);
        setPendingLogFeedback('ideal');

        const isLastSet = currentSetIndex === currentExercise.series - 1;
        const isLastExercise = exercises.every((_, i) => i === currentIndex || completedIndices.includes(i));
        const isLastExerciseAndLastSet = isLastSet && isLastExercise;

        if (isLastExerciseAndLastSet) {
            // No timer for the final set — just open the log panel
            setRestTimeRemaining(0);
            setRestEndTime(null);
            setCurrentRestPhrase('Última série concluída — bora finalizar! 🏆');
        } else {
            const descanso = Number(currentExercise.descanso) || 60;
            setRestTimeRemaining(descanso);
            setRestEndTime(Date.now() + descanso * 1000);

            if (isLastSet) {
                setCurrentRestPhrase('Prepare-se para o próximo exercício 🔥💪');
            } else {
                const totalSeries = currentExercise.series || 0;
                const seriesRestantes = totalSeries - currentSetIndex - 1;
                setCurrentRestPhrase(generateRestPhrase(seriesRestantes));
            }
        }

        setIsResting(true);
    };

    const handleSaveSetLog = async (reps: number, weight: number, feedback: string) => {
        const currentExercise = exercises[currentIndex];
        
        if (!currentExercise) {
            console.error("Exercício atual não encontrado");
            if (isLoading) {
                return false; // Permite tentar novamente no próximo tick
            }
            alert("Erro interno: Exercício não encontrado.");
            return false;
        }

        let insertedRow;

        console.log('[DEBUG Timer] Iniciando gravação da série:', { reps, weight, feedback });

        try {
            const { data, error } = await supabase.from('tbHistorico').insert({
                ficha_id: fichaId,
                dia: dia,
                exercicio_id: currentExercise.exercicio_id,
                serie_atual: currentSetIndex + 1,
                repeticoes_feitas: reps,
                carga_usada: weight,
                feedback: feedback,
                user_id: getCurrentUserId()
            }).select('id').single();

            if (error) {
                console.error("Erro ao salvar histórico:", error);
                
                if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('auth') || (error as any).status === 401) {
                    alert("Sua sessão expirou. Redirecionando para o login...");
                    navigate('/login', { replace: true });
                    return;
                }
                
                alert("Erro ao salvar a série. Verifique sua conexão. O treino continuará.");
            } else {
                console.log('[DEBUG Timer] Resposta do Supabase com sucesso:', data);
                insertedRow = data;
            }
        } catch (err) {
            console.error("Exceção ao salvar histórico:", err);
            alert("Erro de conexão ao salvar a série. O treino continuará.");
        }

        try {
            console.log('[DEBUG Timer] Calculando próximo estado');

            // Track the session record ID so it can be deleted if user discards
            const finalId = insertedRow?.id || (Date.now() + Math.random()).toString();
            
            setSessionHistoryIds(prev => [...prev, finalId]);
            // Accumulate session volume (weight × reps per set; skip bodyweight sets with 0 kg)
            if (weight > 0) {
                setSessionVolumeKg(prev => prev + weight * reps);
            }
            
            // Track sets by index (position in workout) — avoids duplicate exercicio_id collision
            setSetsLoggedByIndex(prev => ({
                ...prev,
                [currentIndex]: (prev[currentIndex] ?? 0) + 1
            }));

            // Add to local state dynamically so chart updates immediately
            setExerciseHistory(prev => [...prev, {
                id: finalId,
                exercicio_id: currentExercise.exercicio_id,
                carga_usada: weight,
                repeticoes_feitas: reps,
                serie_atual: currentSetIndex + 1,
                feedback: feedback,
                created_at: new Date().toISOString()
            }]);

            recordAction();
            // Atualiza a carga do exercício e o último feedback localmente
            setExercises(prev => prev.map((ex, i) => {
                if (i === currentIndex) {
                    const newEx = { ...ex, ultimo_feedback: feedback };
                    if (feedback === 'ideal' || feedback === 'facil') {
                        newEx.carga = weight;
                    }
                    return newEx;
                }
                return ex;
            }));

            const isLastSet = currentSetIndex === currentExercise.series - 1;

            // Verifica se ao concluir este exercício, todos estarão finalizados
            const wouldFinishAll = isLastSet && exercises.every((_, idx) =>
                idx === currentIndex || completedIndices.includes(idx)
            );

            setIsResting(false);
            setRestEndTime(null);

            if (wouldFinishAll) {
                console.log('[DEBUG Timer] Todos concluídos, finalizando treino.');
                const newCompletedIndices = Array.from(new Set([...completedIndices, currentIndex]));
                setCompletedIndices(newCompletedIndices);
                handleFinishWorkout();
            } else if (currentExercise.grupo === 'Cardio') {
                console.log('[DEBUG Timer] Cardio finalizado, avançando.');
                handleNextExercise();
            } else {
                console.log('[DEBUG Timer] Set concluído, avançando.');
                handleNextExercise();
            }
        } catch (stateErr) {
            console.error('[DEBUG Timer] Erro crítico ao atualizar estado após série:', stateErr);
            alert('Ops! Ocorreu um erro. Tente novamente.');
            setIsResting(false);
            setRestEndTime(null);
            return false;
        }
        return true;
    };
    
    useEffect(() => {
        handleSaveSetLogRef.current = handleSaveSetLog;
    }, [handleSaveSetLog]);

    // Called when user clicks STOP or BACK
    const handleEarlyExitRequest = () => {
        if (!workoutStarted) {
            endWorkout();
            navigate('/treino', { replace: true });
            return;
        }
        setShowExitModal(true);
    };

    const handleSavePartialWorkout = async () => {
        setIsSavingExit(true);
        // Capture elapsed seconds immediately before any async operations
        const finalElapsedSeconds = workoutStartTimeRef.current
            ? Math.floor((Date.now() - workoutStartTimeRef.current) / 1000)
            : elapsedSeconds;
        let points = 50;
        try {
            const uid = getCurrentUserId();
            
            // Verifica se já treinou hoje
            const { data: lastWorkout } = await supabase
                .from('tbTreinosCompletos')
                .select('concluido_em')
                .eq('user_id', uid)
                .order('concluido_em', { ascending: false })
                .limit(1);

            if (lastWorkout && lastWorkout.length > 0) {
                const lastDate = new Date(lastWorkout[0].concluido_em).toDateString();
                const today = new Date().toDateString();
                if (lastDate === today) {
                    points = 0; // Ganha pontos apenas no primeiro treino do dia
                }
            }

            await supabase.from('tbTreinosCompletos').insert({
                user_id: uid,
                ficha_id: fichaId,
                dia: dia,
                duracao_segundos: finalElapsedSeconds
            });
            
            if (points > 0) {
                await supabase.from('tbFitPoints').insert({
                    user_id: uid,
                    pontos: points,
                    motivo: 'treino_parcial'
                });
            }
        } catch (err) {
            console.error('Erro ao registrar treino parcial:', err);
        }
        setIsSavingExit(false);
        setEarnedFitPoints(points);
        setShowExitModal(false);
        setShowWorkoutCompletedModal(true);
    };

    // Discard workout — delete all history records created in this session
    const handleDiscardWorkout = async () => {
        setIsSavingExit(true);
        try {
            if (workoutStartTime) {
                const startDate = new Date(workoutStartTime).toISOString();
                await supabase.from('tbHistorico')
                    .delete()
                    .eq('user_id', getCurrentUserId())
                    .eq('ficha_id', fichaId)
                    .eq('dia', dia)
                    .gte('created_at', startDate);
            } else if (sessionHistoryIds.length > 0) {
                const validIds = sessionHistoryIds.filter(id => id.includes('-'));
                if (validIds.length > 0) {
                    await supabase.from('tbHistorico').delete().in('id', validIds);
                }
            }
        } catch (err) {
            console.error('Erro ao descartar histórico da sessão:', err);
        }
        setIsSavingExit(false);
        endWorkout();
        navigate('/treino', { replace: true });
    };

    const handleFinishWorkout = async () => {
        // ── Mutex: prevent double-execution from timer + button race condition ──
        if (isFinishingWorkoutRef.current) {
            console.log('[handleFinishWorkout] Already finishing, skipping duplicate call.');
            return;
        }
        isFinishingWorkoutRef.current = true;

        // ── Capture elapsed seconds immediately before any async gap ──
        const finalElapsedSeconds = workoutStartTimeRef.current
            ? Math.floor((Date.now() - workoutStartTimeRef.current) / 1000)
            : elapsedSeconds;

        // ── Stop the workout timer and all sub-timers immediately ──
        setWorkoutStarted(false);
        setIsResting(false);
        setRestEndTime(null);
        setRestTimeRemaining(0);
        setCardioState('idle');
        setCardioEndTime(null);
        setCardioRemainingDuration(0);

        // ── Clear the workout context and localStorage immediately ──
        // This prevents any re-entry via the forgotten-workout recovery flow
        endWorkout();

        let points = 100;
        try {
            const uid = getCurrentUserId();
            
            // Verifica se já treinou hoje
            const { data: lastWorkout } = await supabase
                .from('tbTreinosCompletos')
                .select('concluido_em')
                .eq('user_id', uid)
                .order('concluido_em', { ascending: false })
                .limit(1);

            if (lastWorkout && lastWorkout.length > 0) {
                const lastDate = new Date(lastWorkout[0].concluido_em).toDateString();
                const today = new Date().toDateString();
                if (lastDate === today) {
                    points = 0; // Ganha pontos apenas no primeiro treino do dia
                }
            }

            await supabase.from('tbTreinosCompletos').insert({
                user_id: uid,
                ficha_id: fichaId,
                dia: dia,
                duracao_segundos: finalElapsedSeconds
            });
            
            if (points > 0) {
                await supabase.from('tbFitPoints').insert({
                    user_id: uid,
                    pontos: points,
                    motivo: 'treino_concluido'
                });
            }
        } catch (err) {
            console.error('Erro ao registrar conclusão:', err);
        }
        
        setEarnedFitPoints(points);
        
        // Delay para prevenir ghost clicks (toques fantasmas) de interfaces anteriores 
        // que estavam na mesma posição na tela
        setTimeout(() => {
            setShowWorkoutCompletedModal(true);
        }, 350);
    };

    const handleCloseWorkoutCompleted = () => {
        endWorkout();
        navigate('/treino', { replace: true });
    };

    const handleOpenFitCheckFilePicker = () => {
        fitCheckFileInputRef.current?.click();
    };

    const handleFitCheckFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target?.result as string;
            setFitCheckInitialImage(src);
            setShowWorkoutCompletedModal(false);
            setShowFitCheckCamera(true);
        };
        reader.readAsDataURL(file);
    };

    const handleFitCheckShare = async () => {
        try {
            await supabase.from('tbFitPoints').insert({
                user_id: getCurrentUserId(),
                pontos: 50,
                motivo: 'fitcheck'
            });
        } catch (err) {
            console.error('Erro ao registrar pontos do fitcheck:', err);
        }
        
        setShowFitCheckCamera(false);
        handleCloseWorkoutCompleted();
    };

    const handleNextExercise = useCallback(() => {
        const currentExercise = exercises[currentIndex];
        
        // Se ainda tem séries no exercício atual, apenas incrementa a série
        if (currentSetIndex < currentExercise.series - 1) {
            setCurrentSetIndex(prev => prev + 1);
        } else {
            const newCompletedIndices = Array.from(new Set([...completedIndices, currentIndex]));
            setCompletedIndices(newCompletedIndices);
            
            // Só finaliza o treino se TODOS os exercícios foram concluídos
            const allDone = exercises.every((_, idx) => newCompletedIndices.includes(idx));
            if (allDone) {
                handleFinishWorkout();
            } else {
                // Procura o próximo exercício pendente (começa pelo próximo, depois faz wrap)
                let nextIndex = -1;
                for (let i = 1; i <= exercises.length; i++) {
                    const candidate = (currentIndex + i) % exercises.length;
                    if (!newCompletedIndices.includes(candidate)) {
                        nextIndex = candidate;
                        break;
                    }
                }
                if (nextIndex !== -1) {
                    setCurrentIndex(nextIndex);
                    setTimeout(() => scrollToCard(nextIndex), 50);
                }
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exercises, currentIndex, currentSetIndex, completedIndices]);

    const handleSkipExercise = () => {
        // Só finaliza se todos os outros exercícios também estiverem concluídos
        const allDone = exercises.every((_, idx) => idx === currentIndex || completedIndices.includes(idx));
        if (allDone) {
            handleFinishWorkout();
        } else if (currentIndex < exercises.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            setTimeout(() => scrollToCard(nextIndex), 50);
        } else {
            // Último por posição mas há pendentes antes — vai para o primeiro pendente
            const firstPending = exercises.findIndex((_, idx) => idx !== currentIndex && !completedIndices.includes(idx));
            if (firstPending !== -1) {
                setCurrentIndex(firstPending);
                setTimeout(() => scrollToCard(firstPending), 50);
            }
        }
    };

    const handleJumpToExercise = (index: number) => {
        // Signal to the rest timer that we jumped — prevent it from calling handleNextExercise
        jumpedRef.current = true;
        setTimeout(() => { jumpedRef.current = false; }, 1000);
        
        setIsResting(false);
        setRestEndTime(null);
        setCurrentIndex(index);
        setTimeout(() => scrollToCard(index), 50);
    };

    useEffect(() => {
        handleNextExerciseRef.current = handleNextExercise;
    }, [handleNextExercise]);

    const playAlarmSound = useCallback(() => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            
            // Frequências aproximadas do alarme Radar (sequência estilo marimba)
            const freqs = [622.25, 830.61, 1046.50, 1244.51];
            
            const playSequence = (startTime: number) => {
                freqs.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    
                    const noteTime = startTime + idx * 0.12;
                    
                    gain.gain.setValueAtTime(0, noteTime);
                    // Fast attack, quick decay
                    gain.gain.linearRampToValueAtTime(0.5, noteTime + 0.01);
                    gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3);
                    
                    osc.start(noteTime);
                    osc.stop(noteTime + 0.35);
                });
            };

            // Toca a sequência 4 vezes (padrão de alarme)
            for (let i = 0; i < 4; i++) {
                playSequence(ctx.currentTime + i * 0.6);
            }
        } catch (e) {
            console.error("Erro ao reproduzir o som de alarme", e);
        }
    }, []);

    useEffect(() => {
        let isHandlingRest = false;
        let isHandlingCardioEnd = false;
        
        const calculateElapsed = () => {
            if (workoutStarted && workoutStartTime) {
                setElapsedSeconds(Math.floor((Date.now() - workoutStartTime) / 1000));
            }
            if (isResting && restEndTime && !isHandlingRest) {
                const remaining = Math.ceil((restEndTime - Date.now()) / 1000);
                if (remaining > 0) {
                    setRestTimeRemaining(remaining);
                } else {
                    isHandlingRest = true;
                    if (!jumpedRef.current && handleSaveSetLogRef.current) {
                        handleSaveSetLogRef.current(pendingLogRepsRef.current, pendingLogWeightRef.current, pendingLogFeedbackRef.current).then((success: boolean) => {
                            if (!success) isHandlingRest = false; // Se falhou porque ainda está carregando, tenta de novo
                            else playAlarmSound(); // Só toca o alarme se conseguiu processar
                        });
                    } else {
                        setIsResting(false);
                        setRestEndTime(null);
                        if (handleNextExerciseRef.current) handleNextExerciseRef.current();
                    }
                }
            }
            if (cardioState === 'running' && cardioEndTime && !isHandlingCardioEnd) {
                const remaining = Math.ceil((cardioEndTime - Date.now()) / 1000);
                if (remaining > 0) {
                    setCardioRemainingDuration(remaining);
                } else {
                    isHandlingCardioEnd = true;
                    if (handleSaveSetLogRef.current) {
                        handleSaveSetLogRef.current(pendingLogRepsRef.current, pendingLogWeightRef.current, pendingLogFeedbackRef.current).then((success: boolean) => {
                            if (!success) {
                                isHandlingCardioEnd = false;
                            } else {
                                playAlarmSound();
                                setCardioState('idle');
                                setCardioEndTime(null);
                                setCardioRemainingDuration(0);
                            }
                        });
                    } else {
                        playAlarmSound();
                        setCardioState('idle');
                        setCardioEndTime(null);
                        setCardioRemainingDuration(0);
                    }
                }
            }
        };

        const intervalId = setInterval(calculateElapsed, 500);

        const handleVisibilityChange = () => {
            if (!document.hidden || document.visibilityState === 'visible') {
                calculateElapsed();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', calculateElapsed);
        window.addEventListener('pageshow', calculateElapsed);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', calculateElapsed);
            window.removeEventListener('pageshow', calculateElapsed);
        };
    }, [workoutStarted, workoutStartTime, isResting, restEndTime, playAlarmSound, cardioState, cardioEndTime]);

    // Detect which card is centered when user manually scrolls the carousel
    const handleCarouselScroll = useCallback(() => {
        if (isScrollingProgrammatically.current) return;
        const container = carouselRef.current;
        if (!container) return;
        const containerCenter = container.scrollLeft + container.clientWidth / 2;
        let closestIndex = 0;
        let closestDistance = Infinity;
        Array.from(container.children).forEach((child, idx) => {
            const el = child as HTMLElement;
            const cardCenter = el.offsetLeft + el.offsetWidth / 2;
            const distance = Math.abs(containerCenter - cardCenter);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = idx;
            }
        });
        setFocusedIndex(closestIndex);
    }, [carouselRef]);




    // Chart Data Computation for Current Exercise
    const currentHist = exerciseHistory.filter(h => h.exercicio_id === exercises[focusedIndex]?.exercicio_id);
    
    const isWeightBased = currentHist.some(h => h.carga_usada > 0);
    const chartMetricLabel = isWeightBased ? 'Carga (kg)' : (exercises[focusedIndex]?.grupo === 'Cardio' ? 'Tempo (min)' : 'Repetições (max)');

    // Group records by day
    const groupedHistoryMap = currentHist.reduce((acc, h) => {
        const date = h.created_at.split('T')[0];
        if (!acc[date]) {
            const dateObj = new Date(h.created_at);
            const dd = String(dateObj.getDate()).padStart(2, '0');
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            
            acc[date] = { 
                date, 
                dateLabel: `${dd}/${mm}`, 
                maxCarga: 0, 
                maxReps: 0, 
                totalReps: 0, 
                totalSeries: 0,
                bestSetCarga: 0,
                bestSetReps: 0
            };
        }
        acc[date].totalReps += h.repeticoes_feitas;
        acc[date].totalSeries += 1;
        
        const isBetter = isWeightBased 
            ? (h.carga_usada > acc[date].bestSetCarga || (h.carga_usada === acc[date].bestSetCarga && h.repeticoes_feitas > acc[date].bestSetReps))
            : (h.repeticoes_feitas > acc[date].bestSetReps);
            
        if (isBetter || acc[date].totalSeries === 1) {
            acc[date].bestSetCarga = h.carga_usada;
            acc[date].bestSetReps = h.repeticoes_feitas;
        }

        acc[date].maxCarga = acc[date].bestSetCarga;
        acc[date].maxReps = acc[date].bestSetReps;
        return acc;
    }, {} as Record<string, { date: string, dateLabel: string, maxCarga: number, maxReps: number, totalReps: number, totalSeries: number, bestSetCarga: number, bestSetReps: number }>);
    
    const groupedHistory = Object.values(groupedHistoryMap);
    groupedHistory.sort((a, b) => a.date.localeCompare(b.date));

    // Stats variables
    let lastWorkoutSub = "Sem registro anterior";
    let lastWorkoutVal = "-";
    let lastWorkoutReps: number | null = null;
    let bestMarkSub = "Nenhum histórico";
    let bestMarkVal = "-";
    let bestMarkReps: number | null = null;
    let bestValOverallNum = 0;

    if (groupedHistory.length > 0) {
        const last = groupedHistory[groupedHistory.length - 1]; // "hoje" ou mais recente
        lastWorkoutSub = `${last.totalSeries} séries • ${last.totalReps} ${exercises[focusedIndex]?.grupo === 'Cardio' ? 'min' : 'rep'} totais`;
        lastWorkoutVal = isWeightBased ? `${last.bestSetCarga}kg` : `${last.bestSetReps}`;
        lastWorkoutReps = isWeightBased ? last.bestSetReps : null;
        
        const best = [...groupedHistory].sort((a,b) => {
            if (isWeightBased) {
                if (b.bestSetCarga !== a.bestSetCarga) return b.bestSetCarga - a.bestSetCarga;
                return b.bestSetReps - a.bestSetReps;
            }
            return b.bestSetReps - a.bestSetReps;
        })[0];
        
        bestMarkSub = `Realizado dia ${best.dateLabel}`;
        bestMarkVal = isWeightBased ? `${best.bestSetCarga}kg` : `${best.bestSetReps}`;
        bestMarkReps = isWeightBased ? best.bestSetReps : null;
        bestValOverallNum = isWeightBased ? best.bestSetCarga : best.bestSetReps;
    }

    // Removed old chartData slice since component renders it.

    return (
        <div className="min-h-screen bg-[#0f141e]">
            <div className="w-full flex-col flex min-h-screen bg-[#0f141e] font-sans max-w-[1024px] mx-auto relative shadow-2xl shadow-black/50">
                <TopBar 
                  showBackButton 
                  onBackClick={handleEarlyExitRequest} 
                  backIconType={workoutStarted ? 'stop' : 'arrow'}
                  timerLabel={workoutStarted ? formatTime(elapsedSeconds) : undefined}
                />
                
                <div className="px-4 w-full pt-2 flex flex-col flex-1">
                    {/* Cabeçalho */}
                    <div className="w-full mb-1">
                        <div className="flex items-center justify-between">
                            <h1 className="text-white text-[22px] font-bold uppercase tracking-wide truncate">
                                {dia && (
                                    <span className="text-blue-500 mr-2">{dia}.</span>
                                )}
                                {gruposList.length > 0 ? gruposList.map((group, index) => (
                                    <span key={group}>
                                        {group}
                                        {index < gruposList.length - 1 && (
                                            <span className="text-blue-500 mx-1.5">+</span>
                                        )}
                                    </span>
                                )) : 'Execução do Treino'}
                            </h1>
                        </div>
                    </div>

                    {isLoading && (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <Loader2 size={32} className="text-blue-500 animate-spin mb-4" />
                            <p className="text-slate-400">Carregando treino...</p>
                        </div>
                    )}
                    
                    {exercises.length === 0 && !isLoading && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#1a2235]/50 backdrop-blur-md rounded-[32px] border border-white/5 mx-4 my-8">
                            {fetchError ? (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4">
                                        <AlertTriangle size={32} />
                                    </div>
                                    <h3 className="text-white font-bold text-lg mb-2">Erro de Conexão</h3>
                                    <p className="text-slate-400 text-sm max-w-[240px] mb-6">
                                        Não foi possível carregar seu treino. Sua sessão pode ter expirado.
                                    </p>
                                    <button 
                                        onClick={() => window.location.reload()}
                                        className="px-6 py-2.5 rounded-full bg-blue-500 text-white font-bold text-sm"
                                    >
                                        Recarregar Página
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-4">
                                        <Info size={32} />
                                    </div>
                                    <p className="text-slate-400 text-[15px] font-medium max-w-[200px]">
                                        Este dia não possui exercícios configurados.
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    <div className={`flex flex-col gap-4 pb-[80px] ${isLoading || exercises.length === 0 ? 'hidden' : 'flex-1'}`}>

                        {/* Carrossel de Exercícios */}
                        <div className="notranslate" translate="no">
                            <div
                                ref={carouselRef}
                                className="flex gap-4 -mx-4 px-[7.5vw] sm:px-[calc(50%-190px)] pt-4 pb-8 scrollbar-none overflow-x-auto snap-x"
                                onScroll={handleCarouselScroll}
                            >
                                {exercises.map((exercise, idx) => {
                                    const hasChallenge = challengeExercicioIds.has(exercise.exercicio_id);
                                    const challenge = workoutChallenges.find(c => c.exercicioId === exercise.exercicio_id);
                                    const showActiveBadge = workoutStarted && !isResting && idx === currentIndex && exercise.grupo !== 'Cardio';
                                    return (
                                    <div
                                        key={exercise.id}
                                        className={`w-[94%] sm:w-[470px] h-[460px] snap-center flex-shrink-0 rounded-[24px] shadow-xl shadow-black/40 transition-all duration-300 relative overflow-hidden bg-[#121825] ${
                                            idx === focusedIndex ? '' : 'opacity-60'
                                        }`}
                                    >
                                        {/* Timer View */}
                                        <div className={`absolute z-20 flex flex-col items-center justify-center p-4 bg-[#121825] transition-all duration-500 inset-0 rounded-[24px] ${
                                            idx === currentIndex && isResting ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                                        }`}>
                                            <TimerErrorBoundary onSkipError={() => { setIsResting(false); setRestEndTime(null); if(handleNextExerciseRef.current) handleNextExerciseRef.current(); }}>
                                                {(!exercise || currentSetIndex === undefined) ? (
                                                    <div className="flex flex-col items-center justify-center h-full w-full">
                                                        <AlertTriangle size={48} className="text-red-500 mb-4" />
                                                        <h3 className="text-white font-bold mb-2 text-lg">Erro ao carregar descanso</h3>
                                                        <p className="text-slate-400 text-sm text-center mb-6">Não foi possível carregar os dados deste exercício.</p>
                                                        <button 
                                                            onClick={() => { setIsResting(false); setRestEndTime(null); if(handleNextExerciseRef.current) handleNextExerciseRef.current(); }}
                                                            className="px-6 py-3 bg-slate-800 rounded-xl text-white font-bold active:scale-95 transition-all"
                                                        >
                                                            Pular Descanso
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <RestCardContent
                                                        exercise={exercise}
                                                        currentIndex={currentIndex}
                                                        currentSetIndex={currentSetIndex}
                                                        completedIndices={completedIndices}
                                                        exercises={exercises}
                                                        restTimeRemaining={restTimeRemaining}
                                                        formatTime={formatTime}
                                                        jumpedRef={jumpedRef}
                                                        handleSaveSetLogRef={handleSaveSetLogRef}
                                                        pendingLogRepsRef={pendingLogRepsRef}
                                                        pendingLogWeightRef={pendingLogWeightRef}
                                                        pendingLogFeedbackRef={pendingLogFeedbackRef}
                                                        setIsResting={setIsResting}
                                                        setRestEndTime={setRestEndTime}
                                                        pendingLogReps={pendingLogReps}
                                                        setPendingLogReps={setPendingLogReps}
                                                        pendingLogWeight={pendingLogWeight}
                                                        setPendingLogWeight={setPendingLogWeight}
                                                        pendingLogFeedback={pendingLogFeedback}
                                                        setPendingLogFeedback={setPendingLogFeedback}
                                                    />
                                                )
                                                }
                                            </TimerErrorBoundary>
                                        </div>

                                        {/* Exercise View */}
                                        <div className={`flex flex-col h-full transition-all duration-500 relative overflow-hidden rounded-[24px] ${ idx === currentIndex && isResting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100' }`}>

                                             {/* Imagem do Exercicio */}
                                             <div className="w-full shrink-0 bg-white relative overflow-hidden h-[200px] rounded-t-[24px]">
                                                 <img
                                                     src={exercise.imagem_url || DEFAULT_EXERCISE_IMAGE}
                                                     alt={exercise.nome}
                                                     className="w-full h-full object-contain p-2"
                                                     onError={(e) => {
                                                         (e.target as HTMLImageElement).src = DEFAULT_EXERCISE_IMAGE;
                                                     }}
                                                 />
                                                 <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-[#121825] via-[#121825]/30 to-transparent pointer-events-none" />

                                                 {/* Grupo tag (e.g. PEITO) */}
                                                 {exercise.grupo && (
                                                     <div className="absolute top-3 left-3 z-30 bg-[#0f141e]/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-[10px] font-black uppercase tracking-widest shadow-md border border-white/5">
                                                         {exercise.grupo}
                                                     </div>
                                                 )}

                                                 {/* Tags right side */}
                                                 <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5 items-end">
                                                     {/* Feedback tag (e.g. MANTER) */}
                                                     {exercise.ultimo_feedback && (
                                                         <div className={`bg-[#0f141e]/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md border border-white/5 flex items-center gap-1 ${
                                                             exercise.ultimo_feedback === 'facil' ? 'text-green-400' :
                                                             exercise.ultimo_feedback === 'ideal' ? 'text-blue-400' :
                                                             'text-red-400'
                                                         }`}>
                                                             {exercise.ultimo_feedback === 'facil' ? (
                                                                 <><ArrowUp size={11} className="mb-[1px]" />+CARGA</>
                                                             ) : exercise.ultimo_feedback === 'ideal' ? (
                                                                 <><Check size={11} className="mb-[1px]" />MANTER</>
                                                             ) : (
                                                                 <><ArrowDown size={11} className="mb-[1px]" />-CARGA</>
                                                             )}
                                                         </div>
                                                     )}
                                                     {/* Pyramid tag */}
                                                     {exercise.is_pyramid && (
                                                         <div className="bg-[#0f141e]/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md border border-white/5 text-orange-500">
                                                             PIRÂMIDE
                                                         </div>
                                                     )}
                                                 </div>
                                             </div>

                                        {/* Infos do Exercicio */}
                                        <div className="px-4 pb-4 pt-1.5 flex flex-col gap-1 flex-1 min-h-0">
                                            {/* Header do Exercicio */}
                                            <div className="flex flex-col mb-0.5">
                                                <h2 className="text-white text-lg font-black leading-tight line-clamp-1">{exercise.nome}</h2>
                                            </div>

                                            {/* Grid de Metricas */}
                                            {(() => {
                                                const isActive = idx === currentIndex;
                                                const displaySetIndex = isActive ? currentSetIndex : 0;
                                                const currentSeriesValueText = isActive ? `${displaySetIndex + 1}ª` : exercise.series;
                                                const currentSeriesLabelText = isActive ? "SÉRIE" : "SÉRIES";
                                                
                                                const currentPyramidReps = exercise.is_pyramid && exercise.pyramid_series && exercise.pyramid_series[displaySetIndex] ? exercise.pyramid_series[displaySetIndex].reps : exercise.repeticoes;
                                                const prevPyramidReps = exercise.is_pyramid && exercise.pyramid_series && displaySetIndex > 0 && exercise.pyramid_series[displaySetIndex - 1] ? exercise.pyramid_series[displaySetIndex - 1].reps : currentPyramidReps;
                                                
                                                const currentPyramidCarga = exercise.is_pyramid && exercise.pyramid_series && exercise.pyramid_series[displaySetIndex] ? exercise.pyramid_series[displaySetIndex].kg : exercise.carga;
                                                const prevPyramidCarga = exercise.is_pyramid && exercise.pyramid_series && displaySetIndex > 0 && exercise.pyramid_series[displaySetIndex - 1] ? exercise.pyramid_series[displaySetIndex - 1].kg : currentPyramidCarga;
                                                
                                                return (
                                                    <div className={`grid gap-1 ${exercise.grupo === 'Cardio' ? 'grid-cols-1' : 'grid-cols-4'}`}>
                                                        {exercise.grupo !== 'Cardio' && (
                                                        <div className="bg-[#0f141e]/80 rounded-xl py-1.5 px-1 flex flex-col items-center justify-center shadow-inner overflow-hidden">
                                                            <Layers size={12} className="text-blue-500 mb-0.5 relative z-10" />
                                                            <span key={`s-${displaySetIndex}`} className={`font-black text-[14px] leading-none text-white ${isActive ? 'animate-odometer' : ''}`}>{currentSeriesValueText}</span>
                                                            <span className="text-slate-400 text-[9px] uppercase font-bold mt-0.5 tracking-wider relative z-10">{currentSeriesLabelText}</span>
                                                        </div>
                                                        )}
                                                        <div className={`bg-[#0f141e]/80 rounded-xl flex flex-col items-center justify-center shadow-inner overflow-hidden ${exercise.grupo === 'Cardio' ? 'py-3' : 'py-1.5 px-1'}`}>
                                                            {exercise.grupo === 'Cardio' ? <Clock size={16} className="text-blue-500 mb-1 relative z-10" /> : <RefreshCw size={12} className="text-blue-500 mb-0.5 relative z-10" />}
                                                            <div className="flex items-center justify-center gap-0.5">
                                                                <span key={`r-${displaySetIndex}`} className={`font-black leading-none ${exercise.grupo === 'Cardio' ? 'text-xl text-white' : 'text-[14px] text-white'} ${isActive ? 'animate-odometer' : ''}`}>{currentPyramidReps}{exercise.grupo === 'Cardio' && "'"}</span>
                                                                {isActive && exercise.is_pyramid && currentPyramidReps > prevPyramidReps && <ArrowUp size={10} strokeWidth={3} className="text-orange-500 relative z-10" />}
                                                                {isActive && exercise.is_pyramid && currentPyramidReps < prevPyramidReps && <ArrowDown size={10} strokeWidth={3} className="text-orange-500 relative z-10" />}
                                                            </div>
                                                            <span className="text-slate-400 text-[9px] uppercase font-bold mt-0.5 tracking-wider relative z-10">{exercise.grupo === 'Cardio' ? 'Duração' : 'Reps'}</span>
                                                        </div>
                                                        {exercise.grupo !== 'Cardio' && (
                                                        <div className="bg-[#0f141e]/80 rounded-xl py-1.5 px-1 flex flex-col items-center justify-center shadow-inner overflow-hidden">
                                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 mb-0.5 text-blue-500 relative z-10"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" /></svg>
                                                            <div className="flex items-center justify-center gap-0.5">
                                                                <span key={`k-${displaySetIndex}`} className={`font-black text-[14px] leading-none text-white ${isActive ? 'animate-odometer' : ''}`}>{currentPyramidCarga}</span>
                                                                {isActive && exercise.is_pyramid && currentPyramidCarga > prevPyramidCarga && <ArrowUp size={10} strokeWidth={3} className="text-orange-500 relative z-10" />}
                                                                {isActive && exercise.is_pyramid && currentPyramidCarga < prevPyramidCarga && <ArrowDown size={10} strokeWidth={3} className="text-orange-500 relative z-10" />}
                                                            </div>
                                                            <span className="text-slate-400 text-[9px] uppercase font-bold mt-0.5 tracking-wider relative z-10">Kg</span>
                                                        </div>
                                                        )}
                                                        {exercise.grupo !== 'Cardio' && (
                                                        <div className="bg-[#0f141e]/80 rounded-xl py-1.5 px-1 flex flex-col items-center justify-center shadow-inner">
                                                            <Clock size={12} className="text-blue-500 mb-0.5 relative z-10" />
                                                            <span className="text-white font-black text-[14px] leading-none">{exercise.descanso}</span>
                                                            <span className="text-slate-400 text-[9px] uppercase font-bold mt-0.5 tracking-wider relative z-10">Seg</span>
                                                        </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* Desafio bar abaixo das métricas */}
                                            {hasChallenge && challenge && (
                                                 <button
                                                     onClick={(e) => { e.stopPropagation(); setShowValidationRules(true); }}
                                                     className="galactic-badge w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all mt-2.5 cursor-pointer hover:brightness-110 active:scale-95 text-left border-0 outline-none notranslate"
                                                     translate="no"
                                                 >
                                                     <div className="flex items-center z-10">
                                                         <span className="text-white font-black text-[10px] uppercase tracking-[0.12em] galactic-text-glow">
                                                             Desafio
                                                         </span>
                                                     </div>
                                                     <div className="flex items-center gap-2 font-black text-[10px] tracking-wider leading-normal text-white galactic-text-glow z-10 flex-1 justify-end min-w-0">
                                                         <div className="truncate whitespace-nowrap text-right flex-1 min-w-0">
                                                             <span className="text-yellow-400">+{challenge.gapKg}kg </span>
                                                             <span className="text-slate-300 font-medium">para superar </span>
                                                             <span className="text-white font-black">{challenge.rivalName.split(' ')[0]}</span>
                                                         </div>
                                                         <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 transition-all select-none">
                                                              <circle cx="8" cy="8" r="7" stroke="white" strokeWidth="1.5" />
                                                              <circle cx="8" cy="4.5" r="0.9" fill="#FFD700" />
                                                              <rect x="7.2" y="6.3" width="1.6" height="5.2" rx="0.5" fill="#FFD700" />
                                                          </svg>
                                                     </div>
                                                 </button>
                                             )}

                                            {/* Botões - sempre exibidos para consistência visual */}
                                            <div className="flex flex-col mt-auto gap-1">
                                                {workoutStarted && exercise.grupo === 'Cardio' && idx === currentIndex ? (
                                                    cardioState === 'idle' ? (
                                                        <button
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                setCardioState('running');
                                                                const durationInSeconds = exercise.repeticoes * 60;
                                                                setCardioRemainingDuration(durationInSeconds);
                                                                setCardioEndTime(Date.now() + durationInSeconds * 1000);
                                                                recordAction();
                                                            }}
                                                            className="w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all bg-green-500 hover:bg-green-600 text-white active:scale-[0.98] shadow-lg shadow-green-500/25"
                                                        >
                                                            <Play size={18} />
                                                            <span className="text-[15px]">Iniciar Cardio</span>
                                                        </button>
                                                    ) : (
                                                        <div className="flex flex-col gap-2 w-full">
                                                            <div className="flex items-center justify-between px-3 py-2 bg-[#0f141e]/80 rounded-xl border border-white/5">
                                                                <span className="text-white font-black text-2xl tabular-nums tracking-wider">{formatTime(cardioRemainingDuration)}</span>
                                                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{cardioState === 'running' ? 'Em andamento' : 'Pausado'}</span>
                                                            </div>
                                                            <div className="flex gap-2 w-full">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (cardioState === 'running') {
                                                                            setCardioState('paused');
                                                                            setCardioEndTime(null);
                                                                        } else {
                                                                            setCardioState('running');
                                                                            setCardioEndTime(Date.now() + cardioRemainingDuration * 1000);
                                                                        }
                                                                        recordAction();
                                                                    }}
                                                                    className={`flex-1 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg ${cardioState === 'running' ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25' : 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/25'}`}
                                                                >
                                                                    {cardioState === 'running' ? <Pause size={18} /> : <Play size={18} />}
                                                                    <span className="text-[15px]">{cardioState === 'running' ? 'Pausar' : 'Continuar'}</span>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setShowStopCardioConfirm(true); }}
                                                                    className="w-[60px] flex-shrink-0 font-bold py-3 rounded-xl flex items-center justify-center transition-all bg-red-500/10 hover:bg-red-500/20 text-red-500 active:scale-[0.98]"
                                                                >
                                                                    <Square size={18} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                ) : workoutStarted && idx !== currentIndex && !completedIndices.includes(idx) ? (
                                                    (() => {
                                                        const setsDone = setsLoggedByIndex[idx] ?? 0;
                                                        
                                                        if (isResting) {
                                                            return (
                                                                <div className="w-full flex items-center justify-center py-1 h-10">
                                                                    <span className="text-slate-400 font-bold text-[13px] tracking-widest bg-slate-800/60 px-4 py-1.5 rounded-full border border-white/5">
                                                                        {setsDone}/{exercise.series} SÉRIES
                                                                    </span>
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        return (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleJumpToExercise(idx); }}
                                                                className="w-full font-bold h-10 rounded-xl flex items-center relative justify-center gap-2 transition-all border-0 border-transparent outline-none focus:outline-none focus:ring-0 bg-slate-700 hover:bg-slate-600 text-white active:scale-95 shadow-lg shadow-black/20"
                                                            >
                                                                <span className="text-[12px] tracking-widest uppercase relative z-10">
                                                                    {setsDone > 0 ? 'Continuar exercício' : 'Fazer exercício'}
                                                                </span>
                                                                {setsDone === 0 && <Play size={16} className="relative z-10 text-blue-500" />}
                                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-black/20 text-white/80 text-[11px] font-black tracking-widest z-10">
                                                                    {setsDone}/{exercise.series}
                                                                </span>
                                                            </button>
                                                        );
                                                    })()
                                                ) : completedIndices.includes(idx) ? (
                                                    <div className="w-full flex items-center justify-center h-10 mt-1">
                                                        <div className="w-[52px] h-[52px] rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                                            <CheckCircle size={28} className="text-emerald-500" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleInitiateRestAndLog(); }}
                                                        disabled={!workoutStarted || isResting || idx !== currentIndex}
                                                        className={`w-full font-bold h-10 rounded-xl flex items-center relative justify-center gap-2 transition-all border-0 border-transparent outline-none focus:outline-none focus:ring-0 ${
                                                            workoutStarted && !isResting && idx === currentIndex
                                                                ? 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95 shadow-lg shadow-black/20'
                                                                : isResting
                                                                ? 'opacity-0 pointer-events-none'
                                                                : 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        <span className="text-[12px] tracking-widest uppercase relative z-10">
                                                            {!workoutStarted
                                                                ? 'Aguarde'
                                                                : exercise.grupo === 'Cardio'
                                                                ? 'Concluir exercício'
                                                                : 'Concluir série'}
                                                        </span>
                                                        <CheckCircle size={16} className="relative z-10" />
                                                        {showActiveBadge && (
                                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-black/20 text-white/80 text-[11px] font-black tracking-widest z-10">
                                                                {currentSetIndex + 1}/{exercise.series}
                                                            </span>
                                                        )}
                                                    </button>
                                                )}
                                                
                                                {workoutStarted && !isResting && idx === currentIndex && exercise.grupo !== 'Cardio' ? (
                                                    <div className="flex gap-2 w-full mt-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setShowSkipConfirm(true); }}
                                                            className="flex-1 py-1.5 px-3 rounded-xl bg-slate-700/80 text-slate-300 font-bold text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 tracking-widest uppercase"
                                                        >
                                                            PULAR EXERCÍCIO
                                                            <SkipForward size={14} strokeWidth={2} className="text-blue-500" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setRecordingExercise(exercise); }}
                                                            className="flex-1 py-1.5 px-3 rounded-xl bg-slate-700/80 text-slate-300 font-bold text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 tracking-widest uppercase"
                                                        >
                                                            GRAVAR PROVA
                                                            <Video size={14} strokeWidth={2} className="text-yellow-400" />
                                                        </button>
                                                    </div>
                                                ) : exercise.grupo !== 'Cardio' ? (
                                                    <div className="flex gap-2 w-full mt-1 opacity-0 pointer-events-none select-none">
                                                        <div className="flex-1 py-1.5 px-3 rounded-xl bg-slate-700/80 text-slate-300 font-bold text-[10px] flex items-center justify-center gap-2 transition-all tracking-widest uppercase">
                                                            PULAR EXERCÍCIO
                                                            <SkipForward size={14} strokeWidth={2} className="text-blue-500" />
                                                        </div>
                                                        <div className="flex-1 py-1.5 px-3 rounded-xl bg-slate-700/80 text-slate-300 font-bold text-[10px] flex items-center justify-center gap-2 transition-all tracking-widest uppercase">
                                                            GRAVAR PROVA
                                                            <Video size={14} strokeWidth={2} className="text-yellow-400" />
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                    );
                                })}
                            </div>
                        </div>

                            {/* Nova seção de histórico abaixo do card */}
                            {exercises.length > 0 && exercises[focusedIndex] && (
                                <div className="-mt-8 flex flex-col w-full gap-4 pb-8">
                                    <h2 className="text-[#f8fafc] font-bold text-[24px] px-1 tracking-[-0.5px]">Sua performance neste exercício</h2>
                                    
                                    {(() => {
                                        const currentEx = exercises[focusedIndex];
                                        if (!currentEx) return null;
                                        const currentExHistory = exerciseHistory
                                            .filter(h => h.exercicio_id === currentEx.exercicio_id && sessionHistoryIds.includes(h.id))
                                            .sort((a, b) => a.serie_atual - b.serie_atual);
                                        
                                        const totalSeriesPlanned = currentEx.series || 3;
                                        const isCardio = currentEx.grupo === 'Cardio';

                                        const maxCompletedSerie = currentExHistory.reduce((max, r) => Math.max(max, r.serie_atual), 0);
                                        const displayCount = Math.max(totalSeriesPlanned, maxCompletedSerie);
                                        const seriesList = Array.from({ length: displayCount }, (_, i) => i + 1);

                                        return (
                                            <div className="bg-[#242e42]/30 rounded-[20px] p-5 flex flex-col gap-3 shadow-xl w-full">
                                                <span className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-wider drop-shadow-sm">Séries Hoje</span>
                                                <div className="flex flex-col gap-2">
                                                    {seriesList.map((s) => {
                                                        const record = currentExHistory.find(r => r.serie_atual === s);
                                                        const isCompleted = !!record;

                                                        if (isCompleted) {
                                                            return (
                                                                <div key={`series-${s}`} className="flex items-center justify-between bg-[#0f141e]/50 px-4 py-3 rounded-xl border border-white/5 transition-all duration-300">
                                                                    <div className="flex items-center gap-3">
                                                                        {(() => {
                                                                            const fb = record.feedback || 'ideal';
                                                                            if (fb === 'facil') {
                                                                                return (
                                                                                    <div title="Feedback: +Carga" className="w-[26px] h-[26px] rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center transition-all">
                                                                                        <ArrowUp size={14} className="text-emerald-400" />
                                                                                    </div>
                                                                                );
                                                                            } else if (fb === 'dificil') {
                                                                                return (
                                                                                    <div title="Feedback: -Carga" className="w-[26px] h-[26px] rounded-full bg-rose-500/15 border border-rose-500/20 flex items-center justify-center transition-all">
                                                                                        <ArrowDown size={14} className="text-rose-400" />
                                                                                    </div>
                                                                                );
                                                                            } else {
                                                                                return (
                                                                                    <div title="Feedback: Manter" className="w-[26px] h-[26px] rounded-full bg-blue-500/15 border border-blue-500/20 flex items-center justify-center transition-all">
                                                                                        <Check size={12} className="text-blue-400" />
                                                                                    </div>
                                                                                );
                                                                            }
                                                                        })()}
                                                                        <span className="text-slate-300 font-bold text-sm">Série {s}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        {!isCardio && (
                                                                            <>
                                                                                <span className="text-blue-400 font-bold text-[15px]">{record.carga_usada}kg</span>
                                                                                <span className="text-slate-600 font-medium text-xs">×</span>
                                                                            </>
                                                                        )}
                                                                        <span className="text-white font-bold text-[15px]">{record.repeticoes_feitas} <span className="text-slate-500 text-xs font-medium ml-0.5">{isCardio ? 'min' : 'reps'}</span></span>
                                                                        <button
                                                                            onClick={() => handleEditSessionRecord(record.id, record.carga_usada, record.repeticoes_feitas, isCardio, record.serie_atual)}
                                                                            className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-all active:scale-90 ml-2"
                                                                        >
                                                                            <Edit2 size={18} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        } else {
                                                            return (
                                                                <div key={`series-${s}`} className="flex items-center justify-between bg-[#0f141e]/15 px-4 py-3 rounded-xl border border-white/[0.02] opacity-40 select-none transition-all duration-300">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-[26px] h-[26px] rounded-full bg-slate-700/20 border border-white/5 flex items-center justify-center">
                                                                            <span className="text-slate-500 font-bold text-xs">{s}</span>
                                                                        </div>
                                                                        <span className="text-slate-500 font-bold text-sm">Série {s}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        {!isCardio && (
                                                                            <>
                                                                                <span className="text-slate-500 font-bold text-[14px]">{currentEx.carga || 0}kg</span>
                                                                                <span className="text-slate-700 font-medium text-xs">×</span>
                                                                            </>
                                                                        )}
                                                                        <span className="text-slate-500 font-bold text-[14px]">{currentEx.repeticoes || 0} <span className="text-slate-600 text-xs font-medium ml-0.5">{isCardio ? 'min' : 'reps'}</span></span>
                                                                        <div className="w-10 h-10 rounded-full bg-slate-800/10 flex items-center justify-center text-slate-600 ml-2 border border-white/5 cursor-not-allowed">
                                                                            <Edit2 size={16} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    {/* Stats Cards */}
                                    <div className="grid grid-cols-2 gap-3 w-full">
                                        <div className="w-full min-w-0 bg-[#242e42]/30 rounded-[20px] p-6 flex flex-col justify-between shadow-xl relative min-h-[120px]">
                                            <span className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-wider mb-4 drop-shadow-sm">No Último Treino</span>
                                            <div className="flex flex-col mt-auto">
                                                {lastWorkoutVal === '-' ? (
                                                    <span className="text-slate-500 text-3xl font-black tracking-tight leading-none mb-1.5">-</span>
                                                ) : (
                                                    <span className="text-white text-[32px] font-black tracking-tighter leading-none mb-2 flex items-baseline gap-1">
                                                        {lastWorkoutVal}
                                                        {lastWorkoutReps !== null ? (
                                                            <span className="text-base font-bold text-slate-400 tracking-normal ml-0.5">× {lastWorkoutReps}</span>
                                                        ) : (
                                                            <span className="text-base font-bold text-slate-400 tracking-normal ml-0.5">{exercises[focusedIndex]?.grupo === 'Cardio' ? 'min' : 'reps'}</span>
                                                        )}
                                                    </span>
                                                )}
                                                <span className="text-slate-500 text-sm font-medium leading-none truncate">{lastWorkoutSub}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="w-full min-w-0 bg-[#242e42]/30 rounded-[20px] p-6 flex flex-col justify-between shadow-xl relative min-h-[120px]">
                                            <span className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-wider mb-4 drop-shadow-sm">Melhor Marca</span>
                                            <div className="flex flex-col mt-auto">
                                                {bestMarkVal === '-' ? (
                                                    <span className="text-slate-500 text-3xl font-black tracking-tight leading-none mb-1.5">-</span>
                                                ) : (
                                                    <span className="text-blue-400 text-[32px] font-black tracking-tighter leading-none mb-2 flex items-baseline gap-1">
                                                        {bestMarkVal}
                                                        {bestMarkReps !== null ? (
                                                            <span className="text-base font-bold text-white/40 tracking-normal ml-0.5">× {bestMarkReps}</span>
                                                        ) : (
                                                            <span className="text-base font-bold text-white/40 tracking-normal ml-0.5">{exercises[focusedIndex]?.grupo === 'Cardio' ? 'min' : 'reps'}</span>
                                                        )}
                                                    </span>
                                                )}
                                                <span className="text-slate-500 text-sm font-medium leading-none truncate">{bestMarkSub}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chart Component */}
                                    <PerformanceChart 
                                        data={groupedHistory} 
                                        isWeightBased={isWeightBased} 
                                        bestValOverall={bestValOverallNum} 
                                        label={chartMetricLabel} 
                                    />
                                </div>
                            )}
                        </div>
                </div>

                {/* Footer flutuante: botão ou timer dependendo do estado */}
                <div className="fixed bottom-[90px] inset-x-0 mx-auto w-full max-w-[1024px] px-4 z-50 pointer-events-none">
                    {!workoutStarted && (
                        /* Botão Iniciar Treino */
                        <button
                            onClick={handleStartWorkout}
                            className="w-full pointer-events-auto py-3.5 rounded-xl bg-blue-500 text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-blue-600 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/25"
                        >
                            <Zap size={18} />
                            Iniciar Treino
                        </button>
                    )}
                </div>

                <BottomNav />



                {/* Edit Log Set Modal */}
                {editingSet && (
                    <LogSetModal
                        exerciseName={editingSet.exerciseName}
                        exerciseGroup={editingSet.exerciseGroup}
                        exerciseImage={editingSet.exerciseImage}
                        setNumber={editingSet.setNumber}
                        totalSets={editingSet.totalSets}
                        defaultReps={editingSet.reps}
                        defaultWeight={editingSet.weight}
                        isEditing={true}
                        onClose={() => setEditingSet(null)}
                        onSave={async (reps, weight, feedback) => {
                            const { error } = await supabase
                                .from('tbHistorico')
                                .update({ carga_usada: weight, repeticoes_feitas: reps, feedback })
                                .eq('id', editingSet.id);

                            if (error) {
                                console.error("Erro ao atualizar histórico:", error);
                                alert("Erro ao atualizar a série. Tente novamente.");
                                return;
                            }

                            setExerciseHistory(prev => prev.map(h => 
                                h.id === editingSet.id ? { ...h, carga_usada: weight, repeticoes_feitas: reps, feedback } : h
                            ));

                            // Atualiza a carga do exercício e o último feedback localmente
                            setExercises(prev => prev.map((ex) => {
                                if (ex.exercicio_id === editingSet.exercicio_id) {
                                    const newEx = { ...ex, ultimo_feedback: feedback };
                                    if (feedback === 'ideal' || feedback === 'facil') {
                                        newEx.carga = weight;
                                    }
                                    return newEx;
                                }
                                return ex;
                            }));

                            setEditingSet(null);
                        }}
                    />
                )}



                {/* ── Exit Workout Modal ── */}
                {showExitModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]" onClick={() => setShowExitModal(false)} />
                        
                        <div className="relative w-full max-w-sm bg-[#1a1f2e] rounded-3xl p-6 animate-[slideUp_300ms_ease-out] shadow-2xl shadow-black/50 z-10 flex flex-col items-center text-center">
                            
                            <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-4">
                                <AlertTriangle size={28} />
                            </div>

                            <h2 className="text-white font-bold text-xl leading-tight mb-2">
                                Encerrar treino incompleto?
                            </h2>
                            
                            <p className="text-[#8e95a3] text-[15px] font-medium leading-relaxed mb-6">
                                Você concluiu {completedIndices.length}/{exercises.length} exercícios. O que deseja fazer com o progresso atual?
                            </p>

                            <div className="flex flex-col gap-3 w-full">
                                <button
                                    onClick={handleSavePartialWorkout}
                                    disabled={isSavingExit}
                                    className="w-full py-3.5 rounded-xl bg-blue-500 text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-blue-500/25"
                                >
                                    {isSavingExit && <Loader2 size={18} className="animate-spin" />}
                                    Registrar progresso
                                </button>
                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => setShowExitModal(false)}
                                        disabled={isSavingExit}
                                        className="flex-1 py-3.5 rounded-xl bg-slate-700/50 text-white font-bold text-base hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleDiscardWorkout}
                                        disabled={isSavingExit}
                                        className="flex-1 py-3.5 rounded-xl bg-red-500/10 text-red-500 font-bold text-base hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                                    >
                                        Descartar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showSkipConfirm && createPortal(
                    <ConfirmDeleteModal
                        title="Pular exercício?"
                        description="Tem certeza que deseja marcar este exercício como não concluído?"
                        onConfirm={() => {
                            setShowSkipConfirm(false);
                            handleSkipExercise();
                        }}
                        onCancel={() => setShowSkipConfirm(false)}
                        confirmText="Sim, pular"
                        icon={SkipForward}
                        variant="warning"
                    />,
                    document.body
                )}

                {recordingExercise && createPortal(
                    <ChallengeVideoModal
                        challenge={
                            workoutChallenges.find(c => c.exercicioId === recordingExercise.exercicio_id) || {
                                exercicioId: recordingExercise.exercicio_id,
                                exercicioNome: recordingExercise.nome,
                                fichaId: 'fallback',
                                dia: 'fallback',
                                grupos: [],
                                myBestCarga: recordingExercise.carga || 0,
                                rivalCarga: 0,
                                gapKg: 0,
                                progressPercent: 100,
                                rivalName: 'a Comunidade',
                                rivalAvatarUrl: ''
                            }
                        }
                        myName={''}
                        onClose={() => setRecordingExercise(null)}
                        onPublished={() => {
                            setRecordingExercise(null);
                        }}
                    />,
                    document.body
                )}

                {showValidationRules && createPortal(
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
                            onClick={() => setShowValidationRules(false)}
                        />

                        {/* Modal */}
                        <div className="relative w-full max-w-sm bg-[#1a1f2e] rounded-3xl p-6 animate-[slideUp_300ms_ease-out] shadow-2xl shadow-black/50 z-10 flex flex-col items-center text-center">
                            
                            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-yellow-500/10 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                                <Info size={28} />
                            </div>

                            <h2 className="text-white font-bold text-xl leading-tight mb-3">
                                REGRAS DE VALIDAÇÃO
                            </h2>
                            
                            <div className="text-[#8e95a3] text-[14px] font-medium leading-relaxed mb-6 text-left flex flex-col gap-4">
                                <p className="font-semibold text-slate-200">
                                    Para garantir seus <span className="font-bold"><span className="text-white notranslate">fit</span><span className="text-[#4d9fff] notranslate">Points</span></span>:
                                </p>
                                <div className="flex flex-col gap-3">
                                    <div className="flex gap-2.5 items-start">
                                        <span className="text-[15px] shrink-0 mt-0.5">✅</span>
                                        <p>
                                            <strong className="text-white">Grave a execução:</strong> Clique em <strong className="text-white">"GRAVAR PROVA"</strong> e filme sua série.
                                        </p>
                                    </div>
                                    <div className="flex gap-2.5 items-start">
                                        <span className="text-[15px] shrink-0 mt-0.5">🏆</span>
                                        <p>
                                            <strong className="text-white">Votação da Comunidade:</strong>{' '}
                                            Alcance um saldo de 3 votos a favor para liberar seus{' '}
                                            <strong className="text-yellow-400">+50 <span className="text-white notranslate">fit</span><span className="text-[#4d9fff] notranslate">Points</span></strong>.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowValidationRules(false)}
                                className="w-full py-3.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-base transition-all active:scale-95 shadow-md border-0 outline-none focus:outline-none"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Workout Completed / FitCheck Prompt Modal */}
                {showWorkoutCompletedModal && createPortal(
                    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]" />
                        
                        <div className="relative w-full max-w-sm bg-[#1a1f2e] rounded-3xl p-6 animate-[slideUp_300ms_ease-out] shadow-2xl shadow-black/50 z-10 flex flex-col items-center text-center">
                            
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                                <CheckCircle size={32} />
                            </div>

                            <h2 className="text-white font-bold text-2xl leading-tight mb-2">
                                Treino Concluído!
                            </h2>

                            <p className="text-[#8e95a3] text-[15px] font-medium leading-relaxed mb-4">
                                Excelente trabalho! Seu progresso foi salvo com sucesso. Faça o FitCheck do dia, compartilhe nas redes sociais e ganhe <span className="font-bold"><span className="text-yellow-400">+50 </span><span className="text-white notranslate">fit</span><span className="text-[#4d9fff] notranslate">Points</span></span> extras.
                            </p>

                            {earnedFitPoints > 0 ? (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 w-full flex items-center justify-center gap-3 mb-6">
                                    <Award className="text-yellow-500" size={24} />
                                    <div className="text-left">
                                        <div className="font-black text-xl leading-none animate-[pulse_1.5s_ease-in-out_infinite] drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]"><span className="text-yellow-400">+{earnedFitPoints} </span><span className="text-white notranslate">fit</span><span className="text-[#4d9fff] notranslate">Points</span></div>
                                        <div className="text-yellow-500/70 text-xs font-bold uppercase tracking-wider mt-1">Conquistados hoje</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 w-full flex items-center justify-center gap-3 mb-6">
                                    <Award className="text-blue-500 shrink-0" size={20} />
                                    <div className="text-left">
                                        <div className="font-bold text-[13px] text-slate-300 leading-tight">Os pontos diários de treino já foram coletados hoje!</div>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 w-full">
                                <input
                                    ref={fitCheckFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFitCheckFileSelect}
                                />
                                <button
                                    onClick={handleOpenFitCheckFilePicker}
                                    className="w-full py-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                                >
                                    <span>📸 Registrar meu fitCheck</span>
                                </button>
                                
                                <button
                                    onClick={handleCloseWorkoutCompleted}
                                    className="w-full py-3.5 rounded-xl bg-slate-800 text-white font-bold text-base hover:bg-slate-700 transition-all active:scale-[0.98]"
                                >
                                    Voltar para o Início
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {showStopCardioConfirm && createPortal(
                    <ConfirmDeleteModal
                        title="Parar Cardio?"
                        description="Você não completou o tempo planejado. Tem certeza que deseja parar o cardio agora?"
                        onConfirm={() => {
                            setShowStopCardioConfirm(false);
                            setCardioState('idle');
                            setCardioRemainingDuration(0);
                            setCardioEndTime(null);
                            handleSkipExercise();
                        }}
                        onCancel={() => setShowStopCardioConfirm(false)}
                        confirmText="Sim, parar"
                        icon={Square}
                        variant="danger"
                    />,
                    document.body
                )}

                {/* FitCheck Gallery Interface */}
                {showFitCheckCamera && createPortal(
                    <FitCheckCamera
                        fitPoints={earnedFitPoints}
                        workoutDivision={dia ? `${dia}. ${gruposList.join(' + ')}` : gruposList.join(' + ')}
                        elapsedSeconds={elapsedSeconds}
                        totalVolumeKg={sessionVolumeKg}
                        initialImageSrc={fitCheckInitialImage || undefined}
                        onClose={() => {
                            setShowFitCheckCamera(false);
                            setFitCheckInitialImage(null);
                            endWorkout();
                            navigate('/', { replace: true });
                        }}
                        onShare={handleFitCheckShare}
                    />,
                    document.body
                )}
            </div>
        </div>
    );
}

export function ActiveWorkout() {
    return (
        <WorkoutErrorBoundary>
            <ActiveWorkoutContent />
        </WorkoutErrorBoundary>
    );
}
