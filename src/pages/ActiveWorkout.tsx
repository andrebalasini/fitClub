import { useState, useEffect, useRef, useCallback, useMemo, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { BottomNav } from '../components/layout/BottomNav';
import { supabase } from '../lib/supabase';
import { CheckCircle, Clock, Loader2, Layers, RefreshCw, Info, Zap, TrendingUp, AlertTriangle, SkipForward, MessageCircle, Camera, Award, Play, Pause, Square } from 'lucide-react';
import { useDragScroll } from '../hooks/useDragScroll';
import { LogSetModal } from '../components/LogSetModal';
import { getCurrentUserId } from '../lib/auth';
import { useActiveWorkout } from '../contexts/WorkoutContext';

import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { FitCheckCamera } from '../components/FitCheckCamera';

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
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#1c2436] to-[#121825]">
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
        return <>{this.props.children}</>;
    }
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
    const getYPct = (val: number) => 100 - (val / chartMax) * 100;
    const getXPct = (idx: number) => filteredData.length > 1 ? (idx / (filteredData.length - 1)) * 100 : 50;

    const svgPath = useMemo(() => {
        if (filteredData.length === 0) return '';
        if (filteredData.length === 1) {
            const y = getYPct(isWeightBased ? filteredData[0].bestSetCarga : filteredData[0].bestSetReps);
            return `M 0 ${y} L 100 ${y}`;
        }
        
        let p = `M 0 ${getYPct(isWeightBased ? filteredData[0].bestSetCarga : filteredData[0].bestSetReps)}`;
        for(let i = 0; i < filteredData.length - 1; i++){
            const p0x = getXPct(i);
            const p0y = getYPct(isWeightBased ? filteredData[i].bestSetCarga : filteredData[i].bestSetReps);
            const p1x = getXPct(i+1);
            const p1y = getYPct(isWeightBased ? filteredData[i+1].bestSetCarga : filteredData[i+1].bestSetReps);
            
            p += ` C ${p0x + (p1x - p0x) / 2} ${p0y}, ${p0x + (p1x - p0x) / 2} ${p1y}, ${p1x} ${p1y}`;
        }
        return p;
    }, [filteredData, isWeightBased, chartMax]);

    const prY = getYPct(bestValOverall);

    return (
        <div className="bg-[#242e42]/30 rounded-[20px] p-6 shadow-xl flex flex-col gap-8 w-full">
            <div className="flex items-center justify-between w-full">
                <span className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-wider drop-shadow-sm truncate pr-2">Evolução ({label})</span>
                <div className="flex bg-[#0f141e]/80 rounded-lg p-1 shadow-inner shrink-0">
                    {(['1S', '1M', '3M', 'Todos'] as ChartPeriod[]).map(p => (
                        <button 
                            key={p} 
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${period === p ? 'bg-slate-700/80 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>
            
            {filteredData.length <= 1 && period !== 'Todos' ? (
                <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-center px-4">
                    <TrendingUp size={24} className="mb-2 opacity-50" />
                    <span className="text-sm font-medium leading-tight">Poucos dados neste período.<br/>Alterne o filtro para "Todos".</span>
                </div>
            ) : filteredData.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-center px-4">
                    <TrendingUp size={24} className="mb-2 opacity-50" />
                    <span className="text-sm font-medium leading-tight">Realize mais um treino para ver o gráfico.</span>
                </div>
            ) : (
                <div className="relative w-full h-[200px] flex pb-8 pl-10 pr-10 select-none touch-none">
                     {/* Y Axis Labels */}
                     <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-slate-500 text-xs font-medium text-right pr-3">
                          <span>{Math.round(chartMax)}</span>
                          <span>{Math.round(chartMax / 2)}</span>
                          <span>0</span>
                     </div>
        
                     {/* Chart content area */}
                     <div className="relative w-full h-full border-l border-b border-slate-700/50">
                          {/* PR Line */}
                          {bestValOverall > 0 && (
                              <div 
                                 className="absolute left-0 right-0 border-t border-dashed border-slate-500/50 pointer-events-none z-0" 
                                 style={{ top: `${prY}%` }}
                              >
                                   <span className="absolute -top-[16px] left-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1.5 py-0.5 bg-[#1a2133] rounded">PR</span>
                              </div>
                          )}
        
                          {/* SVG Area & Line */}
                          <svg className="absolute inset-0 overflow-visible pointer-events-none z-0" preserveAspectRatio="none" viewBox="0 0 100 100" width="100%" height="100%">
                               <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                   <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                                   <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                               </linearGradient>
                               
                               <path 
                                   d={`${svgPath} L 100 100 L 0 100 Z`} 
                                   fill="url(#areaGrad)" 
                                   vectorEffect="non-scaling-stroke"
                               />
                               <path 
                                   d={svgPath}
                                   fill="none"
                                   stroke="#3b82f6"
                                   strokeWidth="3"
                                   vectorEffect="non-scaling-stroke"
                                   strokeLinecap="round"
                                   strokeLinejoin="round"
                               />
                          </svg>
        
                          {/* Dots & Tooltips */}
                          {filteredData.map((d, i) => {
                               const x = getXPct(i);
                               const val = isWeightBased ? d.bestSetCarga : d.bestSetReps;
                               const y = getYPct(val);
                               const isPR = val === bestValOverall;
                               const isHovered = hovered === i;
        
                               return (
                                   <div 
                                       key={i} 
                                       className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center cursor-pointer group z-10"
                                       style={{ left: `${x}%`, top: `${y}%` }}
                                       onMouseEnter={() => setHovered(i)}
                                       onMouseLeave={() => setHovered(null)}
                                       onTouchStart={() => setHovered(i)}
                                   >
                                       <div className={`w-[9px] h-[9px] rounded-full bg-[#121825] border-[2.5px] transition-all duration-300 ${isPR ? 'border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.9)] scale-125' : 'border-blue-500 group-hover:bg-blue-400 group-hover:scale-110'}`} />
                                       
                                       {/* Tooltip */}
                                       <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#0f141e] text-white text-xs font-bold py-2.5 px-3.5 rounded-lg border border-white/10 shadow-xl whitespace-nowrap transition-all duration-200 pointer-events-none flex gap-[0.4rem] items-center ${isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-[0.90]'}`}>
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
                                   </div>
                               )
                          })}
                     </div>
        
                     {/* X Axis Labels */}
                     <div className="absolute left-10 right-10 bottom-1 flex justify-between pointer-events-none">
                           {filteredData.length > 0 && <span className="text-slate-500 text-[13px] font-medium">{filteredData[0].dateLabel}</span>}
                           {filteredData.length > 2 && <span className="text-slate-500 text-[13px] font-medium absolute left-1/2 -translate-x-1/2">{filteredData[Math.floor(filteredData.length/2)].dateLabel}</span>}
                           {filteredData.length > 1 && <span className="text-slate-500 text-[13px] font-medium">{filteredData[filteredData.length-1].dateLabel}</span>}
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
function getExerciseFeedbackTip(
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

export function ActiveWorkout() {
    const navigate = useNavigate();
    const { workoutConfig, endWorkout } = useActiveWorkout();
    
    // Get state passed from context
    const { fichaId, dia, grupos } = workoutConfig || {};
    const gruposList: string[] = grupos || [];

    const [exerciseHistory, setExerciseHistory] = useState<HistoryRecord[]>([]);
    const [exercises, setExercises] = useState<DayExercise[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(() => parseInt(localStorage.getItem('@fw:currentIndex') || '0', 10));
    const [currentSetIndex, setCurrentSetIndex] = useState(() => parseInt(localStorage.getItem('@fw:currentSetIndex') || '0', 10));
    const [focusedIndex, setFocusedIndex] = useState(() => parseInt(localStorage.getItem('@fw:focusedIndex') || '0', 10));
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [workoutStarted, setWorkoutStarted] = useState(() => localStorage.getItem('@fw:workoutStarted') === 'true');
    const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(() => {
        const val = localStorage.getItem('@fw:workoutStartTime');
        return val ? parseInt(val, 10) : null;
    });
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);
    
    // FitCheck States
    const [showWorkoutCompletedModal, setShowWorkoutCompletedModal] = useState(false);
    const [showFitCheckCamera, setShowFitCheckCamera] = useState(false);
    const [earnedFitPoints, setEarnedFitPoints] = useState(0);
    const [sessionVolumeKg, setSessionVolumeKg] = useState(0);

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

    useEffect(() => {
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
    }, [currentIndex, currentSetIndex, focusedIndex, workoutStarted, workoutStartTime, sessionHistoryIds, isResting, restEndTime, cardioState, cardioEndTime, cardioRemainingDuration, completedIndices, setsLoggedByIndex, currentRestPhrase]);

    // Keep refs in sync with state so closures always read fresh values
    useEffect(() => { exerciseHistoryRef.current = exerciseHistory; }, [exerciseHistory]);
    useEffect(() => { sessionHistoryIdsRef.current = sessionHistoryIds; }, [sessionHistoryIds]);
    useEffect(() => { setsLoggedByIndexRef.current = setsLoggedByIndex; }, [setsLoggedByIndex]);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex]);

    useEffect(() => {
        if (!fichaId || !dia) {
            endWorkout();
            return;
        }

        async function fetchExercisesAndHistory() {
            setIsLoading(true);
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
                    grupo: row.tbExercicios?.grupo
                }));
                setExercises(mapped);

                const expIds = mapped.map((m: any) => m.exercicio_id);
                if (expIds.length > 0) {
                    const { data: histData } = await supabase
                        .from('tbHistorico')
                        .select('id, exercicio_id, carga_usada, repeticoes_feitas, serie_atual, created_at, feedback')
                        .in('exercicio_id', expIds)
                        .eq('user_id', getCurrentUserId())
                        .order('created_at', { ascending: true });
                    
                    if (histData) {
                        setExerciseHistory(histData as HistoryRecord[]);
                    }
                }
            }
            setIsLoading(false);
        }

        fetchExercisesAndHistory();
    }, [fichaId, dia, endWorkout]);

    const handleStartWorkout = () => {
        setWorkoutStarted(true);
        setWorkoutStartTime(Date.now());
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
    }, []);

    const initialScrollDone = useRef(false);
    useEffect(() => {
        if (!isLoading && exercises.length > 0 && !initialScrollDone.current) {
            setTimeout(() => {
                scrollToCard(focusedIndex);
                initialScrollDone.current = true;
            }, 100);
        }
    }, [isLoading, exercises.length, scrollToCard, focusedIndex]);

    const handleSaveSetLog = async (reps: number, weight: number, feedback: string) => {
        const currentExercise = exercises[currentIndex];
        
        if (!currentExercise) {
            console.error("Exercício atual não encontrado");
            alert("Erro interno: Exercício não encontrado.");
            return;
        }

        let insertedRow;

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
                alert("Erro ao salvar a série. Verifique sua conexão. O treino continuará.");
            } else {
                insertedRow = data;
            }
        } catch (err) {
            console.error("Exceção ao salvar histórico:", err);
            alert("Erro de conexão ao salvar a série. O treino continuará.");
        }

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

        setIsLogModalOpen(false);
        // Atualiza a carga do exercício se feedback for "ideal" ou "facil"
        if (feedback === 'ideal' || feedback === 'facil') {
            setExercises(prev => prev.map((ex, i) =>
                i === currentIndex ? { ...ex, carga: weight } : ex
            ));
        }

        const isLastSet = currentSetIndex === currentExercise.series - 1;

        // Verifica se ao concluir este exercício, todos estarão finalizados
        const wouldFinishAll = isLastSet && exercises.every((_, idx) =>
            idx === currentIndex || completedIndices.includes(idx)
        );

        if (wouldFinishAll) {
            // Todos os exercícios concluídos → finaliza direto, sem descanso
            const newCompletedIndices = Array.from(new Set([...completedIndices, currentIndex]));
            setCompletedIndices(newCompletedIndices);
            handleFinishWorkout();
        } else if (currentExercise.grupo === 'Cardio') {
            // Cardio: sem descanso, vai direto pro próximo exercício pendente
            handleNextExercise();
        } else if (isLastSet) {
            // Última série de exercício normal → descanso e avança
            const descanso = Number(currentExercise.descanso) || 60;
            setRestTimeRemaining(descanso);
            setRestEndTime(Date.now() + descanso * 1000);
            
            const isLastExercise = exercises.every((_, i) => i === currentIndex || completedIndices.includes(i));
            const finalMsg = isLastExercise
                ? 'Última série concluída — bora finalizar! 🏆'
                : 'Prepare-se para o próximo exercício 🔥💪';
            setCurrentRestPhrase(finalMsg);
            setIsResting(true);
        } else {
            // Série intermediária → descanso e incrementa série
            const descanso = Number(currentExercise.descanso) || 60;
            setRestTimeRemaining(descanso);
            setRestEndTime(Date.now() + descanso * 1000);
            
            const totalSeries = currentExercise.series || 0;
            const seriesRestantes = totalSeries - currentSetIndex - 1;
            setCurrentRestPhrase(generateRestPhrase(seriesRestantes));
            setIsResting(true);
        }
    };

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
        const points = 50;
        try {
            await supabase.from('tbTreinosCompletos').insert({
                user_id: getCurrentUserId(),
                ficha_id: fichaId,
                dia: dia,
                duracao_segundos: elapsedSeconds
            });
            await supabase.from('tbFitPoints').insert({
                user_id: getCurrentUserId(),
                pontos: points,
                motivo: 'treino_parcial'
            });
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
        if (sessionHistoryIds.length > 0) {
            try {
                await supabase.from('tbHistorico').delete().in('id', sessionHistoryIds);
            } catch (err) {
                console.error('Erro ao descartar histórico da sessão:', err);
            }
        }
        setIsSavingExit(false);
        endWorkout();
        navigate('/treino', { replace: true });
    };

    const handleFinishWorkout = async () => {
        // Garantir limpeza de estado para evitar execuções redundantes no timer
        setIsResting(false);
        setRestEndTime(null);
        setRestTimeRemaining(0);
        setCardioState('idle');
        setCardioEndTime(null);
        setCardioRemainingDuration(0);

        const points = 100;
        try {
            await supabase.from('tbTreinosCompletos').insert({
                user_id: getCurrentUserId(),
                ficha_id: fichaId,
                dia: dia,
                duracao_segundos: elapsedSeconds
            });
            await supabase.from('tbFitPoints').insert({
                user_id: getCurrentUserId(),
                pontos: points,
                motivo: 'treino_concluido'
            });
        } catch (err) {
            console.error('Erro ao registrar conclusão:', err);
        }
        
        setEarnedFitPoints(points);
        
        // Delay para prevenir ghost clicks (toques fantasmas) de interfaces anteriores 
        // que estavam na mesma posição na tela
        setTimeout(() => {
            setShowWorkoutCompletedModal(true);
        }, 350);
        // Do not immediately navigate or clear context; wait for the user to interact with the FitCheck modal
    };

    const handleCloseWorkoutCompleted = () => {
        endWorkout();
        navigate('/treino', { replace: true });
    };

    const handleOpenFitCheck = () => {
        setShowWorkoutCompletedModal(false);
        setShowFitCheckCamera(true);
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

    const handleNextExercise = () => {
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
    };

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
                    playAlarmSound();
                    setIsResting(false);
                    setRestEndTime(null);
                    if (!jumpedRef.current && handleNextExerciseRef.current) {
                        handleNextExerciseRef.current();
                    }
                }
            }
            if (cardioState === 'running' && cardioEndTime && !isHandlingCardioEnd) {
                const remaining = Math.ceil((cardioEndTime - Date.now()) / 1000);
                if (remaining > 0) {
                    setCardioRemainingDuration(remaining);
                } else {
                    isHandlingCardioEnd = true;
                    playAlarmSound();
                    setCardioState('idle');
                    setCardioEndTime(null);
                    setCardioRemainingDuration(0);
                    setIsLogModalOpen(true);
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
    }, []);



    // Estimativa de ~6 kcal por minuto de treino
    const kcalBurned = Math.floor((elapsedSeconds / 60) * 6);

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
            <div className="w-full flex-col flex min-h-screen bg-[#0f141e] font-sans pb-32 max-w-[1024px] mx-auto relative shadow-2xl shadow-black/50">
                <TopBar 
                  showBackButton 
                  onBackClick={handleEarlyExitRequest} 
                  backIconType={workoutStarted ? 'stop' : 'arrow'} 
                />
                
                <div className="px-4 w-full pt-2 flex flex-col flex-1 pb-10">
                    {/* Cabeçalho */}
                    <div className="w-full mb-4">
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
                    
                    {!isLoading && exercises.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#131b2b] rounded-3xl shadow-inner text-center">
                            <Info size={32} className="text-slate-500 mb-4" />
                            <p className="text-slate-400 text-sm">Este dia não possui exercícios configurados.</p>
                        </div>
                    )}

                    <div className={`flex flex-col gap-4 ${isLoading || exercises.length === 0 ? 'hidden' : 'flex-1'}`}>

                        {/* Carrossel de Exercícios */}
                        <div
                            ref={carouselRef}
                            className="flex gap-4 -mx-4 px-[7.5vw] sm:px-[calc(50%-190px)] pb-8 h-full scrollbar-none overflow-x-auto snap-x"
                            onScroll={handleCarouselScroll}
                        >
                                {exercises.map((exercise, idx) => (
                                    <div
                                        key={exercise.id}
                                        className={`w-[85%] sm:w-[380px] snap-center flex-shrink-0 bg-[#121825] rounded-[24px] shadow-xl shadow-black/40 transition-all duration-300 relative ${
                                            idx === focusedIndex
                                                ? ''
                                                : 'opacity-60'
                                        }`}
                                    >
                                        {/* Timer View */}
                                        <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-[#121825] rounded-[24px] transition-all duration-500 ${
                                            idx === currentIndex && isResting ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                                        }`}>
                                            <TimerErrorBoundary onSkipError={() => { setIsResting(false); setRestEndTime(null); if(handleNextExerciseRef.current) handleNextExerciseRef.current(); }}>
                                                <Clock size={48} className="text-blue-500 mb-6 animate-pulse" />
                                                <h3 className="text-slate-400 text-[15px] font-bold uppercase tracking-widest mb-2">Tempo de Descanso</h3>
                                                <div className="text-white text-7xl font-black tabular-nums tracking-tighter mb-4 drop-shadow-lg">
                                                    {formatTime(restTimeRemaining)}
                                                </div>
                                                {/* Mensagem sutil de séries restantes */}
                                                {(() => {
                                                    if (!exercise) return null;

                                                    const phraseToRender = currentRestPhrase || (
                                                        (exercise.series || 1) === 1
                                                        ? "É AGORA! O esforço final separa vencedores de amadores. ÚLTIMA!"
                                                        : `Não negocie com a sua mente. Execute.`
                                                    );

                                                    return (
                                                        <p className="text-slate-400/80 text-[13px] font-medium text-center mb-6 px-4 leading-relaxed animate-[fadeIn_600ms_ease-out]">
                                                            {phraseToRender}
                                                        </p>
                                                    );
                                                })()}
                                                <button
                                                    onClick={() => {
                                                        setIsResting(false);
                                                        setRestEndTime(null);
                                                        if (handleNextExerciseRef.current) handleNextExerciseRef.current();
                                                    }}
                                                    className="w-full mt-auto py-4 rounded-xl bg-blue-500 text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-blue-600 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/25"
                                                >
                                                    Continuar
                                                </button>
                                            </TimerErrorBoundary>
                                        </div>

                                        {/* Exercise View */}
                                        <div className={`flex flex-col h-full transition-all duration-500 ${
                                            idx === currentIndex && isResting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
                                        }`}>
                                            {/* Imagem do Exercicio */}
                                            <div className="w-full h-[150px] bg-white relative overflow-hidden rounded-t-[24px]">
                                            <img
                                                src={exercise.imagem_url || DEFAULT_EXERCISE_IMAGE}
                                                alt={exercise.nome}
                                                className="w-full h-full object-contain p-2"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = DEFAULT_EXERCISE_IMAGE;
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#121825] via-[#121825]/50 to-transparent" />

                                            {/* Titulo sobre a imagem */}
                                            <div className="absolute bottom-2.5 left-3.5 right-12">
                                                <h2 className="text-white text-xl font-black leading-tight drop-shadow-lg truncate">{exercise.nome}</h2>
                                                {exercise.grupo && (
                                                    <span className="text-blue-400 text-[11px] font-bold uppercase tracking-wider drop-shadow-md">{exercise.grupo}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Infos do Exercicio */}
                                        <div className="px-4 pb-4 pt-3 flex flex-col gap-3">
                                            {/* Grid de Metricas */}
                                            <div className={`grid gap-2 ${exercise.grupo === 'Cardio' ? 'grid-cols-1' : 'grid-cols-4'}`}>
                                                {exercise.grupo !== 'Cardio' && (
                                                <div className="bg-[#0f141e]/80 rounded-xl p-2.5 flex flex-col items-center justify-center shadow-inner">
                                                    <Layers size={14} className="text-blue-500 mb-1" />
                                                    <span className="text-white font-black text-base leading-none">{exercise.series}</span>
                                                    <span className="text-slate-400 text-[9px] uppercase font-bold mt-1 tracking-wider">Séries</span>
                                                </div>
                                                )}
                                                <div className={`bg-[#0f141e]/80 rounded-xl flex flex-col items-center justify-center shadow-inner ${exercise.grupo === 'Cardio' ? 'py-4' : 'p-2.5'}`}>
                                                    {exercise.grupo === 'Cardio' ? <Clock size={18} className="text-blue-500 mb-1.5" /> : <RefreshCw size={14} className="text-blue-500 mb-1" />}
                                                    <span className={`text-white font-black leading-none ${exercise.grupo === 'Cardio' ? 'text-2xl' : 'text-base'}`}>{exercise.repeticoes}{exercise.grupo === 'Cardio' && "'"}</span>
                                                    <span className="text-slate-400 text-[9px] uppercase font-bold mt-1 tracking-wider">{exercise.grupo === 'Cardio' ? 'Duração' : 'Reps'}</span>
                                                </div>
                                                {exercise.grupo !== 'Cardio' && (
                                                <div className="bg-[#0f141e]/80 rounded-xl p-2.5 flex flex-col items-center justify-center shadow-inner">
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-blue-500 mb-1"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" /></svg>
                                                    <span className="text-white font-black text-base leading-none">{exercise.carga}</span>
                                                    <span className="text-slate-400 text-[9px] uppercase font-bold mt-1 tracking-wider">Kg</span>
                                                </div>
                                                )}
                                                {exercise.grupo !== 'Cardio' && (
                                                <div className="bg-[#0f141e]/80 rounded-xl p-2.5 flex flex-col items-center justify-center shadow-inner">
                                                    <Clock size={14} className="text-blue-500 mb-1" />
                                                    <span className="text-white font-black text-base leading-none">{exercise.descanso}</span>
                                                    <span className="text-slate-400 text-[9px] uppercase font-bold mt-1 tracking-wider">Seg</span>
                                                </div>
                                                )}
                                            </div>

                                            {/* Feedback Tip */}
                                            {exercise.grupo !== 'Cardio' && (() => {
                                                const tip = getExerciseFeedbackTip(exercise.exercicio_id, exercise.repeticoes, exerciseHistory);
                                                if (!tip) return null;
                                                const colorMap = {
                                                    green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: 'text-emerald-400' },
                                                    blue:  { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-300',    icon: 'text-blue-400' },
                                                    amber: { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-300',   icon: 'text-amber-400' },
                                                };
                                                const c = colorMap[tip.color as keyof typeof colorMap] || colorMap.blue;
                                                return (
                                                    <div className={`${c.bg} border ${c.border} rounded-xl px-3 py-2.5 flex items-start gap-2.5`}>
                                                        <MessageCircle size={16} className={`${c.icon} flex-shrink-0 mt-0.5`} />
                                                        <span className={`${c.text} text-[13px] font-medium leading-snug`}>{tip.message}</span>
                                                    </div>
                                                );
                                            })()}

                                            {/* Botões - sempre exibidos para consistência visual */}
                                            <div className="flex flex-col mt-1 gap-1">
                                                {workoutStarted && exercise.grupo === 'Cardio' && idx === currentIndex ? (
                                                    cardioState === 'idle' ? (
                                                        <button
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                setCardioState('running');
                                                                const durationInSeconds = exercise.repeticoes * 60;
                                                                setCardioRemainingDuration(durationInSeconds);
                                                                setCardioEndTime(Date.now() + durationInSeconds * 1000);
                                                            }}
                                                            className="w-full font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all bg-green-500 hover:bg-green-600 text-white active:scale-[0.98] shadow-lg shadow-green-500/25"
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
                                                                    }}
                                                                    className={`flex-1 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg ${cardioState === 'running' ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25' : 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/25'}`}
                                                                >
                                                                    {cardioState === 'running' ? <Pause size={18} /> : <Play size={18} />}
                                                                    <span className="text-[15px]">{cardioState === 'running' ? 'Pausar' : 'Continuar'}</span>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setShowStopCardioConfirm(true); }}
                                                                    className="w-[60px] flex-shrink-0 font-bold py-3.5 rounded-xl flex items-center justify-center transition-all bg-red-500/10 hover:bg-red-500/20 text-red-500 active:scale-[0.98]"
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
                                                                <div className="w-full flex items-center justify-center py-2 h-[52px]">
                                                                    <span className="text-slate-400 font-bold text-[13px] tracking-widest bg-slate-800/60 px-4 py-1.5 rounded-full border border-white/5">
                                                                        {setsDone}/{exercise.series} SÉRIES
                                                                    </span>
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        return (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleJumpToExercise(idx); }}
                                                                className="w-full font-bold py-3.5 rounded-xl flex items-center justify-between px-4 transition-all bg-slate-700 hover:bg-slate-600 text-white active:scale-[0.98] shadow-lg shadow-black/20"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <SkipForward size={18} />
                                                                    <span className="text-[15px]">
                                                                        {setsDone > 0 ? 'Continuar exercício' : 'Fazer este exercício'}
                                                                    </span>
                                                                </div>
                                                                <span className="px-2.5 py-1 rounded-md bg-black/20 text-white/80 text-[12px] font-black tracking-widest">
                                                                    {setsDone}/{exercise.series}
                                                                </span>
                                                            </button>
                                                        );
                                                    })()
                                                ) : completedIndices.includes(idx) ? (
                                                    <div className="w-full flex items-center justify-center py-2 min-h-[52px]">
                                                        <div className="w-[60px] h-[60px] rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                                            <CheckCircle size={32} className="text-emerald-500" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setIsLogModalOpen(true)}
                                                        disabled={!workoutStarted || isResting || idx !== currentIndex}
                                                        className={`w-full font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
                                                            workoutStarted && !isResting && idx === currentIndex
                                                                ? 'bg-blue-500 hover:bg-blue-600 text-white active:scale-[0.98] shadow-lg shadow-blue-500/25' 
                                                                : isResting
                                                                ? 'opacity-0 pointer-events-none'
                                                                : 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        <CheckCircle size={18} />
                                                        <span className="text-[15px]">
                                                            {!workoutStarted
                                                                ? 'Aguarde'
                                                                : exercise.grupo === 'Cardio'
                                                                ? (currentIndex === exercises.length - 1 ? 'Finalizar Treino' : 'Concluir exercício')
                                                                : currentIndex === exercises.length - 1 && currentSetIndex === exercise.series - 1
                                                                ? 'Finalizar Treino' 
                                                                : currentSetIndex === exercise.series - 1 
                                                                ? 'Concluir exercício'
                                                                : `Concluir série (${currentSetIndex + 1}/${exercise.series})`}
                                                        </span>
                                                    </button>
                                                )}
                                                
                                                {workoutStarted && !isResting && idx === currentIndex && exercise.grupo !== 'Cardio' ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setShowSkipConfirm(true); }}
                                                        className="w-full font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-slate-400 bg-transparent hover:text-slate-200 hover:bg-white/5 active:scale-[0.95]"
                                                    >
                                                        <SkipForward size={16} />
                                                        <span className="text-[14px]">Não fiz o exercício</span>
                                                    </button>
                                                ) : exercise.grupo !== 'Cardio' ? (
                                                    <div className="h-[40px] w-full" />
                                                ) : null}
                                            </div>
                                        </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Nova seção de histórico abaixo do card */}
                            {exercises.length > 0 && exercises[focusedIndex] && (
                                <div className="-mt-8 flex flex-col w-full gap-4 pb-8">
                                    <h2 className="text-[#f8fafc] font-bold text-[24px] px-1 tracking-[-0.5px]">Sua performance neste exercício</h2>
                                    
                                    {/* Stats Cards */}
                                    <div className="flex gap-3 w-full">
                                        <div className="flex-1 bg-[#242e42]/30 rounded-[20px] p-6 flex flex-col justify-between shadow-xl relative min-h-[120px]">
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
                                        
                                        <div className="flex-1 bg-[#242e42]/30 rounded-[20px] p-6 flex flex-col justify-between shadow-xl relative min-h-[120px]">
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
                    {!workoutStarted ? (
                        /* Botão Iniciar Treino */
                        <button
                            onClick={handleStartWorkout}
                            className="w-full pointer-events-auto py-3.5 rounded-xl bg-blue-500 text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-blue-600 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/25"
                        >
                            <Zap size={18} />
                            Iniciar Treino
                        </button>
                    ) : (
                        /* Container do Timer */
                        <div className="pointer-events-auto bg-[#1a2235]/95 backdrop-blur-xl border border-white/5 rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                            {/* Exercícios Feitos */}
                            <div className="flex flex-col flex-1 items-start gap-1">
                                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest leading-none">Exercícios</span>
                                <span className="text-white font-black text-lg leading-none tabular-nums tracking-tight">{currentIndex}/{exercises.length}</span>
                            </div>

                            <div className="w-[1px] h-8 bg-white/10 mx-2" />

                            {/* Tempo Total */}
                            <div className="flex flex-col flex-1 items-center gap-1">
                                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest leading-none">Tempo</span>
                                <span className="text-white font-black text-lg leading-none tabular-nums tracking-tight">{formatTime(elapsedSeconds)}</span>
                            </div>

                            <div className="w-[1px] h-8 bg-white/10 mx-2" />

                            {/* Calorias Gastas */}
                            <div className="flex flex-col flex-1 items-end gap-1">
                                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest leading-none">Calorias</span>
                                <div className="flex items-baseline gap-1 leading-none">
                                    <span className="text-orange-400 font-black text-lg leading-none tabular-nums tracking-tight">{kcalBurned}</span>
                                    <span className="text-slate-500 text-[11px] font-bold leading-none">kcal</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <BottomNav />

                {/* Log Set Modal */}
                {isLogModalOpen && exercises[currentIndex] && (
                    <LogSetModal
                        exerciseName={exercises[currentIndex].nome}
                        exerciseGroup={exercises[currentIndex].grupo}
                        exerciseImage={exercises[currentIndex].imagem_url}
                        setNumber={currentSetIndex + 1}
                        totalSets={exercises[currentIndex].series}
                        defaultReps={exercises[currentIndex].repeticoes}
                        defaultWeight={exercises[currentIndex].carga}
                        onClose={() => setIsLogModalOpen(false)}
                        onSave={handleSaveSetLog}
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
                                Você concluiu {currentIndex}/{exercises.length} exercícios. O que deseja fazer com o progresso atual?
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
                                Excelente trabalho! Seu progresso foi salvo com sucesso. Faça o FitCheck do dia, compartilhe nas redes sociais e ganhe <span className="font-bold"><span className="text-yellow-400">+50 </span><span className="text-white">fit</span><span className="text-[#4d9fff]">Points</span></span> extras.
                            </p>

                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 w-full flex items-center justify-center gap-3 mb-6">
                                <Award className="text-yellow-500" size={24} />
                                <div className="text-left">
                                    <div className="font-black text-xl leading-none"><span className="text-yellow-400">+{earnedFitPoints} </span><span className="text-white">fit</span><span className="text-[#4d9fff]">Points</span></div>
                                    <div className="text-yellow-500/70 text-xs font-bold uppercase tracking-wider mt-1">Conquistados hoje</div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 w-full">
                                <button
                                    onClick={handleOpenFitCheck}
                                    className="w-full py-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/25"
                                >
                                    <Camera size={20} />
                                    <span>Selecione uma imagem do seu treino</span>
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
                        onClose={() => {
                            setShowFitCheckCamera(false);
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
