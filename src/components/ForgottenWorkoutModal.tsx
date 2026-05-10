import { useState } from 'react';
import { Clock, Trash2, CheckCircle, Loader2, Edit2 } from 'lucide-react';

export interface ForgottenWorkoutData {
    /** Grupos musculares treinados (ex: ['Pernas', 'Costas']) */
    grupos: string[];
    /** Dia da ficha (ex: 'A') */
    dia: string;
    /** Ficha ID */
    fichaId: string;
    /** Timestamp de quando o treino começou */
    startTime: number;
    /** Timestamp da última ação registrada */
    lastActionTime: number;
    /** Duração estimada em segundos (lastAction - startTime + 5 min) */
    estimatedDurationSeconds: number;
    /** Exercícios concluídos / total */
    completedCount: number;
    totalCount: number;
    /** IDs do histórico da sessão (para poder descartar) */
    sessionHistoryIds: string[];
}

interface ForgottenWorkoutModalProps {
    data: ForgottenWorkoutData;
    onConfirm: (adjustedDurationSeconds: number) => void;
    onDiscard: () => void;
    isSaving: boolean;
}

export function ForgottenWorkoutModal({ data, onConfirm, onDiscard, isSaving }: ForgottenWorkoutModalProps) {
    const estimatedMinutes = Math.max(1, Math.round(data.estimatedDurationSeconds / 60));
    const [durationMinutes, setDurationMinutes] = useState(estimatedMinutes);
    const [isEditing, setIsEditing] = useState(false);

    const startDate = new Date(data.startTime);
    const startTimeStr = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const workoutLabel = data.grupos.length > 0
        ? data.grupos.join(' + ')
        : 'Treino';

    // Determine if workout was yesterday or earlier
    const now = new Date();
    const isToday = startDate.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = startDate.toDateString() === yesterday.toDateString();
    const dateLabel = isToday ? 'hoje' : isYesterday ? 'ontem' : `em ${startDate.toLocaleDateString('pt-BR')}`;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]" />

            {/* Modal */}
            <div className="relative w-full max-w-sm bg-[#1a1f2e] rounded-3xl p-6 animate-[slideUp_300ms_ease-out] shadow-2xl shadow-black/50 z-10 flex flex-col items-center text-center">

                {/* Icon */}
                <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 mb-4">
                    <Clock size={28} />
                </div>

                {/* Title */}
                <h2 className="text-white font-bold text-xl leading-tight mb-2">
                    Esqueceu de finalizar?
                </h2>

                {/* Body */}
                <p className="text-[#8e95a3] text-[15px] font-medium leading-relaxed mb-5">
                    Vimos que você não encerrou o seu treino de{' '}
                    <span className="text-white font-bold">{workoutLabel}</span> {dateLabel}. 
                    Calculamos o tempo estimado para você.
                </p>

                {/* Summary Stats */}
                <div className="w-full bg-[#0f141e]/60 rounded-2xl p-4 mb-5 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-slate-400 text-[13px] font-bold uppercase tracking-wider">Exercícios</span>
                        <span className="text-white font-black text-lg tabular-nums">
                            {data.completedCount}/{data.totalCount}
                        </span>
                    </div>
                    <div className="w-full h-px bg-white/5 mb-3" />
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-slate-400 text-[13px] font-bold uppercase tracking-wider">Início</span>
                        <span className="text-white font-bold text-base tabular-nums">{startTimeStr}</span>
                    </div>
                    <div className="w-full h-px bg-white/5 mb-3" />
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[13px] font-bold uppercase tracking-wider">Tempo Estimado</span>
                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        value={durationMinutes}
                                        onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                                        onBlur={() => setIsEditing(false)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') setIsEditing(false); }}
                                        autoFocus
                                        className="w-16 bg-[#1a1f2e] border border-blue-500/40 rounded-lg px-2 py-1 text-white font-bold text-right text-base tabular-nums outline-none focus:border-blue-500"
                                        min={1}
                                        max={999}
                                    />
                                    <span className="text-slate-400 text-sm font-medium">min</span>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-1.5 group"
                                >
                                    <span className="text-blue-400 font-bold text-base tabular-nums group-hover:text-blue-300 transition-colors">
                                        {durationMinutes} min
                                    </span>
                                    <Edit2 size={14} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 w-full">
                    <button
                        onClick={onDiscard}
                        disabled={isSaving}
                        className="flex-1 py-3.5 rounded-xl bg-slate-700/50 text-white font-bold text-base hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <Trash2 size={16} />
                        Descartar
                    </button>
                    <button
                        onClick={() => onConfirm(durationMinutes * 60)}
                        disabled={isSaving}
                        className="flex-1 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-blue-500/25"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <CheckCircle size={18} />
                                Confirmar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
