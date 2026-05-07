import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Loader2, Minus, Plus, RefreshCw, ThumbsUp, ThumbsDown, Target, Clock, Edit2 } from 'lucide-react';

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
        <div className="flex items-center justify-between bg-[#0f141e] rounded-[16px] px-4 py-3 border border-transparent">
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
                    className="w-10 h-10 rounded-lg bg-slate-700/80 flex items-center justify-center text-slate-300 hover:bg-slate-600 transition-all active:scale-95 select-none touch-manipulation"
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
                    className="w-10 h-10 rounded-lg bg-slate-700/80 flex items-center justify-center text-slate-300 hover:bg-slate-600 transition-all active:scale-95 select-none touch-manipulation"
                    style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                >
                    <Plus size={20} />
                </button>
            </div>
        </div>
    );
}

interface LogSetModalProps {
    exerciseName: string;
    exerciseGroup?: string;
    exerciseImage?: string | null;
    setNumber: number;
    totalSets: number;
    defaultReps: number;
    defaultWeight: number;
    isEditing?: boolean;
    onClose: () => void;
    onSave: (reps: number, weight: number, feedback: string) => Promise<void>;
}

export function LogSetModal({ 
    exerciseName, 
    exerciseGroup,
    exerciseImage,
    setNumber, 
    totalSets, 
    defaultReps, 
    defaultWeight, 
    isEditing = false,
    onClose, 
    onSave 
}: LogSetModalProps) {
    const [repsDone, setRepsDone] = useState<number>(defaultReps);
    const [weightUsed, setWeightUsed] = useState<number>(defaultWeight);
    const [feedback, setFeedback] = useState<string>('ideal');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(repsDone, weightUsed, feedback);
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-[#1a1f2e] rounded-t-3xl p-6 pb-8 animate-[slideUp_300ms_ease-out] shadow-2xl shadow-black/50 z-10 flex flex-col">
                {/* Handle bar */}
                <div className="flex justify-center mb-4">
                    <div className="w-10 h-1 rounded-full bg-slate-600" />
                </div>

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95"
                    aria-label="Fechar modal"
                >
                    <X size={18} />
                </button>

                {/* Exercise info (Header) */}
                <div className="flex items-center gap-4 mb-6 pr-8">
                    <div className="w-16 h-16 bg-white rounded-xl p-1.5 flex items-center justify-center flex-shrink-0">
                        <img
                            src={exerciseImage || DEFAULT_IMAGE}
                            alt={exerciseName}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_IMAGE;
                            }}
                        />
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-white font-bold text-lg leading-tight">
                            {exerciseName}
                        </h2>
                        <span className="text-slate-500 text-sm mt-0.5 truncate max-w-[280px]">
                            {exerciseGroup || 'Exercício'} {exerciseGroup !== 'Cardio' && `• Série ${setNumber} de ${totalSets}`}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    {/* Steppers */}
                    <Stepper
                        label={exerciseGroup === 'Cardio' ? 'Tempo' : 'Repetições'}
                        value={repsDone}
                        onChange={setRepsDone}
                        min={0}
                        max={300}
                        unit={exerciseGroup === 'Cardio' ? 'min' : undefined}
                        icon={exerciseGroup === 'Cardio' ? <Clock size={18} /> : <RefreshCw size={18} />}
                    />
                    {exerciseGroup !== 'Cardio' && (
                        <Stepper
                            label="Carga"
                            value={weightUsed}
                            onChange={setWeightUsed}
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

                    {/* Feedback */}
                    <div className="flex flex-col gap-2 mt-2">
                        <label className="text-slate-300 text-[15px] font-medium ml-1">
                            Como foi esta série?
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setFeedback('facil')}
                                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-[16px] transition-all border border-transparent active:scale-95 ${
                                    feedback === 'facil'
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-[#0f141e] text-slate-400 hover:text-white'
                                }`}
                            >
                                <ThumbsUp size={18} />
                                <span className="text-xs font-bold font-sans">Fácil</span>
                            </button>
                            <button
                                onClick={() => setFeedback('ideal')}
                                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-[16px] transition-all border border-transparent active:scale-95 ${
                                    feedback === 'ideal'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-[#0f141e] text-slate-400 hover:text-white'
                                }`}
                            >
                                <Target size={18} />
                                <span className="text-xs font-bold font-sans">Ideal</span>
                            </button>
                            <button
                                onClick={() => setFeedback('dificil')}
                                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-[16px] transition-all border border-transparent active:scale-95 ${
                                    feedback === 'dificil'
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-[#0f141e] text-slate-400 hover:text-white'
                                }`}
                            >
                                <ThumbsDown size={18} />
                                <span className="text-xs font-bold font-sans">Difícil</span>
                            </button>
                        </div>
                    </div>

                    {/* Create / Save button */}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full mt-4 py-4 rounded-xl bg-blue-500 text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-blue-500/25"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                {isEditing ? "Editando..." : "Registrando..."}
                            </>
                        ) : (
                            <>
                                {isEditing ? <Edit2 size={18} /> : <Clock size={18} />}
                                {isEditing ? "Editar" : "Descansar"}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
