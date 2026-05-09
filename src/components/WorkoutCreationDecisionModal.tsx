import { Info, Plus, CalendarPlus } from 'lucide-react';

interface WorkoutCreationDecisionModalProps {
    onClose: () => void;
    onAddDayToCurrent: () => void;
    onCreateNew: () => void;
}

export function WorkoutCreationDecisionModal({
    onClose,
    onAddDayToCurrent,
    onCreateNew,
}: WorkoutCreationDecisionModalProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-sm bg-[#1a1f2e] rounded-3xl p-6 animate-[slideUp_300ms_ease-out] shadow-2xl shadow-black/50 z-10 flex flex-col items-center text-center">
                
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-blue-500/10 text-blue-500">
                    <Info size={28} />
                </div>

                <h2 className="text-white font-bold text-xl leading-tight mb-2">
                    Novo Plano de Treino
                </h2>
                
                <p className="text-[#8e95a3] text-[15px] font-medium leading-relaxed mb-6">
                    Deseja começar um novo plano do zero ou apenas adicionar um novo dia (Treino D, E...) ao seu plano atual?<br/><br/>
                    <span className="text-amber-400/90 text-[13px] font-semibold">Nota: Ao criar um novo Plano, o plano atual será movido para o histórico.</span>
                </p>

                <div className="flex flex-col gap-3 w-full">
                    <button
                        onClick={onAddDayToCurrent}
                        className="w-full py-4 rounded-xl bg-[#1d70f5] text-white font-bold text-base flex items-center justify-center gap-2.5 hover:bg-blue-600 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/25"
                    >
                        <CalendarPlus size={20} />
                        Adicionar dia ao atual
                    </button>
                    <button
                        onClick={onCreateNew}
                        className="w-full py-4 rounded-xl bg-slate-700/50 text-white font-bold text-base flex items-center justify-center gap-2.5 hover:bg-slate-700 transition-all active:scale-[0.98]"
                    >
                        <Plus size={20} />
                        Criar novo Plano
                    </button>
                </div>
                
                <button 
                    onClick={onClose}
                    className="mt-4 text-[#8e95a3] hover:text-white text-sm font-medium transition-colors px-4 py-2"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
}
