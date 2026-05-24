import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Minus, Plus, Layers, RefreshCw, Clock, Link2 } from 'lucide-react';

interface CatalogExercise {
    id: string;
    nome: string;
    grupo: string;
    subgrupo: string | null;
    imagem_url: string | null;
}

type DayKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

interface ExerciseDetailModalProps {
    exercise: CatalogExercise;
    combinedExercises?: CatalogExercise[];
    selectedDay: DayKey;
    currentLength: number;
    initialValues?: {
        series: number;
        repeticoes: number;
        carga: number;
        descanso: number;
        is_pyramid?: boolean;
        pyramid_series?: { reps: number; kg: number }[];
    };
    isEditing?: boolean;
    onClose: () => void;
    onAdded?: (data: Record<string, unknown>) => void;
    onEdited?: (data: Record<string, unknown>) => void;
    onRequestCombine?: (currentExercises: CatalogExercise[]) => void;
}

const DEFAULT_IMAGE = 'https://fafisurbnecapdpguudb.supabase.co/storage/v1/object/public/assets/geral/exercise_default_min.png';

interface StepperProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    fastStep?: number;
    unit?: string;
    icon: React.ReactNode;
}

function Stepper({ label, value, onChange, min = 0, max = 999, step = 1, fastStep, unit, icon }: StepperProps) {
    const valueRef = useRef(value);
    
    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasHeldRef = useRef(false);

    const stopHold = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
    }, []);

    useEffect(() => {
        return stopHold;
    }, [stopHold]);

    const handlePointerDown = (isIncrement: boolean) => {
        hasHeldRef.current = false;
        
        timeoutRef.current = setTimeout(() => {
            hasHeldRef.current = true;
            
            const amount = isIncrement ? (fastStep || step) : -(fastStep || step);
            const nextValue = Math.max(min, Math.min(max, valueRef.current + amount));
            onChange(nextValue);
            valueRef.current = nextValue;
            
            intervalRef.current = setInterval(() => {
                const stepAmount = isIncrement ? (fastStep || step) : -(fastStep || step);
                const val = Math.max(min, Math.min(max, valueRef.current + stepAmount));
                onChange(val);
                valueRef.current = val;
            }, 150);
        }, 500);
    };

    const handlePointerUp = (isIncrement: boolean) => {
        stopHold();
        
        if (!hasHeldRef.current) {
            const amount = isIncrement ? step : -step;
            onChange(Math.max(min, Math.min(max, valueRef.current + amount)));
        }
    };

    return (
        <div className="flex items-center justify-between bg-[#0f141e] rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-400">
                    {icon}
                </div>
                <span className="text-slate-300 text-[15px] font-medium">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onPointerDown={() => handlePointerDown(false)}
                    onPointerUp={() => handlePointerUp(false)}
                    onPointerLeave={stopHold}
                    className="w-10 h-10 rounded-lg bg-slate-700/80 flex items-center justify-center text-slate-300 hover:bg-slate-600 transition-all active:scale-90 select-none touch-manipulation"
                    style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                >
                    <Minus size={20} />
                </button>
                <div className="w-16 text-center">
                    <span className="text-white font-bold text-xl">{value}</span>
                    {unit && <span className="text-slate-500 text-xs ml-0.5">{unit}</span>}
                </div>
                <button
                    onPointerDown={() => handlePointerDown(true)}
                    onPointerUp={() => handlePointerUp(true)}
                    onPointerLeave={stopHold}
                    className="w-10 h-10 rounded-lg bg-slate-700/80 flex items-center justify-center text-slate-300 hover:bg-slate-600 transition-all active:scale-90 select-none touch-manipulation"
                    style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                >
                    <Plus size={20} />
                </button>
            </div>
        </div>
    );
}

const DAY_LABELS: Record<DayKey, string> = {
    A: 'Treino A',
    B: 'Treino B',
    C: 'Treino C',
    D: 'Treino D',
    E: 'Treino E',
    F: 'Treino F',
    G: 'Treino G',
};

const DAY_PREFIX: Record<DayKey, string> = {
    A: 'ao',
    B: 'ao',
    C: 'ao',
    D: 'ao',
    E: 'ao',
    F: 'ao',
    G: 'ao',
};

function getCombineLabel(count: number): string {
    if (count === 2) return 'BI-SET';
    if (count === 3) return 'TRI-SET';
    if (count === 4) return 'GIANT SET';
    return `${count}x SET`;
}

export function ExerciseDetailModal({ exercise, combinedExercises = [], selectedDay, currentLength, initialValues, isEditing, onClose, onAdded, onEdited, onRequestCombine }: ExerciseDetailModalProps) {
    const allExercises = combinedExercises.length > 0 ? combinedExercises : [exercise];
    const isCombineMode = allExercises.length > 1;

    const [series, setSeries] = useState(initialValues?.series ?? 3);
    const [repeticoes, setRepeticoes] = useState(initialValues?.repeticoes ?? 10);
    const [carga, setCarga] = useState(initialValues?.carga ?? 0);
    const [descanso, setDescanso] = useState(initialValues?.descanso ?? 60);

    const [isPyramidMode, setIsPyramidMode] = useState(initialValues?.is_pyramid ?? false);
    const [pyramidSeries, setPyramidSeries] = useState<{reps: number, kg: number}[]>(() => {
        if (initialValues?.pyramid_series && initialValues.pyramid_series.length > 0) {
            return initialValues.pyramid_series;
        }
        return Array.from({ length: initialValues?.series ?? 3 }, () => ({
            reps: initialValues?.repeticoes ?? 10,
            kg: initialValues?.carga ?? 0
        }));
    });

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPyramidSeries(prev => {
            if (prev.length === series) return prev;
            const newArr = [...prev];
            if (newArr.length < series) {
                const last = newArr[newArr.length - 1] || {reps: repeticoes, kg: carga};
                while (newArr.length < series) {
                    newArr.push({ reps: last.reps, kg: last.kg });
                }
            } else {
                newArr.length = series;
            }
            return newArr;
        });
    }, [series, repeticoes, carga]);

    const pyramidTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pyramidIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pyramidHasHeldRef = useRef(false);

    const stopPyramidHold = useCallback(() => {
        if (pyramidTimeoutRef.current) clearTimeout(pyramidTimeoutRef.current);
        if (pyramidIntervalRef.current) clearInterval(pyramidIntervalRef.current);
    }, []);

    useEffect(() => stopPyramidHold, [stopPyramidHold]);

    const applyPyramidDelta = useCallback((index: number, field: 'reps' | 'kg', delta: number) => {
        setPyramidSeries(prev => {
            const arr = [...prev];
            const current = arr[index][field];
            const next = current + delta;
            arr[index] = { ...arr[index], [field]: field === 'reps' ? Math.max(1, next) : Math.max(0, next) };
            return arr;
        });
    }, []);

    const handlePyramidPointerDown = (index: number, field: 'reps' | 'kg', isIncrement: boolean) => {
        pyramidHasHeldRef.current = false;
        const fastDelta = field === 'kg' ? (isIncrement ? 5 : -5) : (isIncrement ? 1 : -1);

        pyramidTimeoutRef.current = setTimeout(() => {
            pyramidHasHeldRef.current = true;
            applyPyramidDelta(index, field, fastDelta);

            pyramidIntervalRef.current = setInterval(() => {
                applyPyramidDelta(index, field, fastDelta);
            }, 150);
        }, 500);
    };

    const handlePyramidPointerUp = (index: number, field: 'reps' | 'kg', isIncrement: boolean) => {
        stopPyramidHold();
        if (!pyramidHasHeldRef.current) {
            const tapDelta = isIncrement ? 1 : -1;
            applyPyramidDelta(index, field, tapDelta);
        }
    };

    const handleCombineToggle = () => {
        if (onRequestCombine) {
            onRequestCombine(allExercises);
        }
    };

    const handleAction = () => {
        const nome = allExercises.map(ex => ex.nome).join(' + ');
        const data = {
            exercicio_id: exercise.id,
            dia: selectedDay,
            series: exercise.grupo === 'Cardio' ? 1 : series,
            repeticoes: isPyramidMode ? pyramidSeries[0].reps : repeticoes,
            carga: isPyramidMode ? pyramidSeries[0].kg : carga,
            descanso: exercise.grupo === 'Cardio' ? 0 : descanso,
            nome,
            imagem_url: exercise.imagem_url,
            grupo: exercise.grupo,
            is_pyramid: isPyramidMode,
            pyramid_series: isPyramidMode ? pyramidSeries : null,
            ...(isEditing ? {} : { ordem: currentLength, id: `temp_${Date.now()}_${Math.random()}` })
        };

        if (isEditing && onEdited) {
            onEdited(data);
        } else if (onAdded) {
            onAdded(data);
        }
    };

    const renderExerciseInfo = (ex: CatalogExercise, compact = false) => (
        <div className={`flex items-center gap-4 ${compact ? '' : ''}`}>
            <div className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} bg-white rounded-xl p-1.5 flex items-center justify-center flex-shrink-0`}>
                <img
                    src={ex.imagem_url || DEFAULT_IMAGE}
                    alt={ex.nome}
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_IMAGE;
                    }}
                />
            </div>
            <div className="min-w-0 flex-1">
                <h2 className={`text-white font-bold leading-tight truncate ${compact ? 'text-[15px]' : 'text-lg'}`}>{ex.nome}</h2>
                <p className="text-slate-500 text-sm mt-0.5 truncate">
                    {ex.grupo}{ex.subgrupo ? ` · ${ex.subgrupo}` : ''}
                </p>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-[#1a1f2e] rounded-t-3xl p-6 pb-8 animate-[slideUp_300ms_ease-out] shadow-2xl shadow-black/50 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Handle bar */}
                <div className="flex justify-center mb-4 flex-shrink-0">
                    <div className="w-10 h-1 rounded-full bg-slate-600" />
                </div>

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90 z-10"
                >
                    <X size={18} />
                </button>

                <div className="overflow-y-auto overflow-x-hidden flex-1 scrollbar-none pb-4">
                    {/* Exercise info — stacked with connectors */}
                    <div className="mb-6 relative">
                        {allExercises.map((ex, idx) => (
                            <div key={ex.id}>
                                {idx > 0 && (
                                    <div className="flex items-center relative my-1 ml-6">
                                        <div className="absolute left-2 -top-1 -bottom-1 w-0.5 bg-blue-500/30 z-0"></div>
                                        <div className="relative z-10 ml-0 bg-[#1a1f2e] py-0.5 px-1">
                                            <span className="text-[10px] font-bold tracking-widest text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/30 shadow-sm shadow-blue-500/10">
                                                {getCombineLabel(allExercises.length)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {renderExerciseInfo(ex, isCombineMode && idx > 0)}
                            </div>
                        ))}
                    </div>

                    {/* Combine Toggle */}
                    {onRequestCombine && (
                        <div className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-3 mb-2.5">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-400">
                                    <Link2 size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-slate-200 font-bold text-[15px]">Combinar Exercícios</span>
                                    <span className="text-slate-500 text-[11px] uppercase tracking-wide font-bold">
                                        {isCombineMode ? getCombineLabel(allExercises.length) : 'Bi-Set / Tri-Set'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleCombineToggle}
                                className="px-3 py-1.5 rounded-lg bg-[#1d70f5] text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95 flex items-center gap-1.5"
                            >
                                <Plus size={14} />
                                Adicionar
                            </button>
                        </div>
                    )}

                    {/* Pyramid Toggle */}
                    {exercise.grupo !== 'Cardio' && (
                    <div className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-3 mb-2.5">
                        <div className="flex flex-col">
                            <span className="text-slate-200 font-bold text-[15px]">Personalizar Séries</span>
                            <span className="text-slate-500 text-[11px] uppercase tracking-wide font-bold">Modo Pirâmide</span>
                        </div>
                        <button
                            onClick={() => setIsPyramidMode(!isPyramidMode)}
                            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                                isPyramidMode ? 'bg-blue-500' : 'bg-slate-700'
                            }`}
                        >
                            <div
                                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                    isPyramidMode ? 'translate-x-6' : 'translate-x-0'
                                } shadow-sm`}
                            />
                        </button>
                    </div>
                    )}

                    {/* Steppers */}
                    <div className="flex flex-col gap-2.5">
                        {exercise.grupo !== 'Cardio' && (
                        <Stepper
                            label="Séries"
                            value={series}
                            onChange={setSeries}
                            min={1}
                            max={20}
                            icon={<Layers size={18} />}
                        />
                        )}

                        {/* Global Reps/Carga */}
                        {!isPyramidMode && (
                            <>
                                <Stepper
                                    label={exercise.grupo === 'Cardio' ? "Tempo" : "Repetições"}
                                    value={repeticoes}
                                    onChange={setRepeticoes}
                                    min={1}
                                    max={300}
                                    unit={exercise.grupo === 'Cardio' ? "min" : undefined}
                                    icon={exercise.grupo === 'Cardio' ? <Clock size={18} /> : <RefreshCw size={18} />}
                                />
                                {exercise.grupo !== 'Cardio' && (
                                <Stepper
                                    label="Carga"
                                    value={carga}
                                    onChange={setCarga}
                                    min={0}
                                    max={500}
                                    step={1}
                                    fastStep={5}
                                    unit="kg"
                                    icon={
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
                                            <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" />
                                        </svg>
                                    }
                                />
                                )}
                            </>
                        )}

                        {/* Pyramid Series List */}
                        {isPyramidMode && (
                            <div className="flex flex-col gap-2 mt-1 mb-1 bg-[#0f141e] rounded-xl p-3 shadow-inner shadow-black/20">
                                {pyramidSeries.map((s, idx) => (
                                    <div key={`pyramid-${idx}`} className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${idx % 2 === 0 ? 'bg-slate-800' : 'bg-transparent'}`}>
                                        <span className="text-slate-300 font-bold text-[13px] uppercase tracking-wider">Série {idx + 1}</span>
                                        <div className="flex gap-3">
                                            {/* Reps */}
                                            <div className="flex items-center bg-slate-900/50 rounded-lg p-0.5 border border-slate-700/50">
                                                <button
                                                    onPointerDown={() => handlePyramidPointerDown(idx, 'reps', false)}
                                                    onPointerUp={() => handlePyramidPointerUp(idx, 'reps', false)}
                                                    onPointerLeave={stopPyramidHold}
                                                    className="w-8 h-8 rounded-md flex items-center justify-center text-slate-300 hover:bg-slate-700/80 active:scale-95 transition-all select-none touch-manipulation"
                                                    style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                                                ><Minus size={14}/></button>
                                                <div className="w-8 text-center flex flex-col items-center justify-center">
                                                    <span className="text-white font-bold text-[15px] leading-none">{s.reps}</span>
                                                </div>
                                                <button
                                                    onPointerDown={() => handlePyramidPointerDown(idx, 'reps', true)}
                                                    onPointerUp={() => handlePyramidPointerUp(idx, 'reps', true)}
                                                    onPointerLeave={stopPyramidHold}
                                                    className="w-8 h-8 rounded-md flex items-center justify-center text-slate-300 hover:bg-slate-700/80 active:scale-95 transition-all select-none touch-manipulation"
                                                    style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                                                ><Plus size={14}/></button>
                                            </div>
                                            {/* KG */}
                                            <div className="flex items-center bg-slate-900/50 rounded-lg p-0.5 border border-slate-700/50">
                                                <button
                                                    onPointerDown={() => handlePyramidPointerDown(idx, 'kg', false)}
                                                    onPointerUp={() => handlePyramidPointerUp(idx, 'kg', false)}
                                                    onPointerLeave={stopPyramidHold}
                                                    className="w-8 h-8 rounded-md flex items-center justify-center text-slate-300 hover:bg-slate-700/80 active:scale-95 transition-all select-none touch-manipulation"
                                                    style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                                                ><Minus size={14}/></button>
                                                <div className="w-10 text-center flex flex-col items-center justify-center">
                                                    <span className="text-white font-bold text-[15px] leading-none mb-0.5">{s.kg}<span className="text-[9px] text-slate-500 ml-0.5 font-bold uppercase">kg</span></span>
                                                </div>
                                                <button
                                                    onPointerDown={() => handlePyramidPointerDown(idx, 'kg', true)}
                                                    onPointerUp={() => handlePyramidPointerUp(idx, 'kg', true)}
                                                    onPointerLeave={stopPyramidHold}
                                                    className="w-8 h-8 rounded-md flex items-center justify-center text-slate-300 hover:bg-slate-700/80 active:scale-95 transition-all select-none touch-manipulation"
                                                    style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                                                ><Plus size={14}/></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {exercise.grupo !== 'Cardio' && (
                        <Stepper
                            label="Descanso"
                            value={descanso}
                            onChange={setDescanso}
                            min={5}
                            max={300}
                            step={1}
                            fastStep={5}
                            unit="seg"
                            icon={<Clock size={18} />}
                        />
                        )}
                    </div>
                </div>

                {/* Add/Edit button */}
                <button
                    onClick={handleAction}
                    className="w-full mt-4 py-3.5 rounded-xl bg-[#1d70f5] text-white font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/25 flex-shrink-0"
                >
                    {isEditing ? (
                        <>
                            <RefreshCw size={18} />
                            Salvar Alterações
                        </>
                    ) : (
                        <>
                            <Plus size={18} />
                            Adicionar {DAY_PREFIX[selectedDay]} {DAY_LABELS[selectedDay]}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
