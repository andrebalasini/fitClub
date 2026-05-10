import { CalendarPlus, Plus, Layers } from 'lucide-react';

interface WorkoutCreationDecisionModalProps {
    onClose: () => void;
    onAddDayToCurrent: () => void;
    onCreateNew: () => void;
    activePlanName?: string;
}

export function WorkoutCreationDecisionModal({
    onClose,
    onAddDayToCurrent,
    onCreateNew,
    activePlanName = 'Plano Atual'
}: WorkoutCreationDecisionModalProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-sm bg-[#1a1f2e] rounded-3xl p-6 animate-[slideUp_300ms_ease-out] shadow-2xl shadow-black/50 z-10 flex flex-col items-center text-center">
                
                <h2 className="text-white font-bold text-xl leading-tight mb-6 mt-1">
                    Novo Plano de Treino
                </h2>
                
                <div className="flex flex-col gap-3 w-full mb-3">
                    {/* ── CARD PRINCIPAL: EXPANDIR ── */}
                    <button
                        onClick={onAddDayToCurrent}
                        className="w-full group flex items-start gap-3.5 p-3.5 rounded-[20px] bg-[#1d70f5]/10 border border-[#1d70f5]/40 hover:border-[#1d70f5] text-left transition-all active:scale-[0.97] shadow-[0_4px_20px_rgba(29,112,245,0.15)]"
                    >
                        <div className="w-11 h-11 rounded-2xl bg-[#1d70f5] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(29,112,245,0.3)] flex-shrink-0 group-hover:scale-105 transition-transform">
                            <CalendarPlus size={22} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col pt-0.5">
                            <h3 className="text-white font-bold text-[15px] leading-tight flex items-center gap-1.5">
                                Expandir Plano Atual
                                <Plus size={12} className="text-[#1d70f5] bg-white rounded-full p-0.5" />
                            </h3>
                            <p className="text-slate-300/90 text-[12px] font-medium leading-snug mt-1">
                                Adicione novo dia ao <span className="text-[#1d70f5] font-bold">"{activePlanName}"</span>.
                            </p>
                        </div>
                    </button>

                    {/* ── CARD SECUNDÁRIO: NOVO CICLO ── */}
                    <button
                        onClick={onCreateNew}
                        className="w-full group flex items-start gap-3.5 p-3.5 rounded-[20px] bg-[#131b2b]/40 border border-white/5 hover:border-white/10 text-left transition-all active:scale-[0.97]"
                    >
                        <div className="w-11 h-11 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0 group-hover:text-slate-300 transition-colors">
                            <Layers size={22} />
                        </div>
                        <div className="flex flex-col pt-0.5">
                            <h3 className="text-slate-200 font-bold text-[15px] leading-tight flex items-center gap-1.5">
                                Iniciar Novo Ciclo
                            </h3>
                            <p className="text-slate-500 text-[12px] font-medium leading-snug mt-1">
                                Comece do zero e mova o atual para <br />
                                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Planos Anteriores</span>.
                            </p>
                        </div>
                    </button>
                </div>
                
                <button 
                    onClick={onClose}
                    className="text-slate-500 hover:text-white text-[13px] font-bold uppercase tracking-widest transition-colors px-6 py-2 mt-2"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
}
