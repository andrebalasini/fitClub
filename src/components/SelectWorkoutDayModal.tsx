import { X, Play, Share2, Copy, Check } from 'lucide-react';


export interface FichaDayWorkout {
    dia: string;
    grupos: string[];
}

interface SelectWorkoutDayModalProps {
    fichaId: string;
    fichaNome: string;
    diasTreino: FichaDayWorkout[];
    onClose: () => void;
}

const dayOrder: Record<string, number> = {
    'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6,
    'DOM': 0, 'SEG': 1, 'TER': 2, 'QUA': 3, 'QUI': 4, 'SEX': 5, 'SAB': 6
};

import { useNavigate } from 'react-router-dom';
import { useActiveWorkout } from '../contexts/WorkoutContext';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { showToast } from './Toast';

export function SelectWorkoutDayModal({ fichaId, fichaNome, diasTreino, onClose }: SelectWorkoutDayModalProps) {
    const { startWorkout } = useActiveWorkout();
    const navigate = useNavigate();
    
    const [isExporting, setIsExporting] = useState(false);
    const [exportedText, setExportedText] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    // Sort days correctly based on logical week order
    const sortedDias = [...diasTreino].sort((a, b) => dayOrder[a.dia] - dayOrder[b.dia]);

    const handleSelectDay = (dia: string, grupos: string[]) => {
        startWorkout({ fichaId, dia, grupos });
        onClose();
        navigate('/treino/executar');
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const { data, error } = await supabase
                .from('tbTreinos')
                .select('dia, series, repeticoes, carga, descanso, ordem, tbExercicios (nome)')
                .eq('ficha_id', fichaId)
                .order('dia', { ascending: true })
                .order('ordem', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) {
                showToast('Nenhum exercício encontrado nesta ficha.', 'error');
                setIsExporting(false);
                return;
            }

            // Group by day
            const grouped: Record<string, any[]> = {};
            data.forEach(item => {
                if (!grouped[item.dia]) grouped[item.dia] = [];
                grouped[item.dia].push(item);
            });

            // Format to text
            let text = `Ficha: ${fichaNome}\n\n`;
            
            // Sort keys using the dayOrder
            const sortedKeys = Object.keys(grouped).sort((a, b) => dayOrder[a] - dayOrder[b]);

            for (const day of sortedKeys) {
                text += `Treino ${day}:\n`;
                grouped[day].forEach((ex) => {
                    const nome = ex.tbExercicios?.nome || 'Exercício Desconhecido';
                    text += `- ${nome}: ${ex.series}x${ex.repeticoes}`;
                    if (ex.carga) text += ` (${ex.carga}kg)`;
                    if (ex.descanso) text += ` - Descanso: ${ex.descanso}s`;
                    text += `\n`;
                });
                text += `\n`;
            }

            setExportedText(text.trim());
        } catch (error: any) {
            console.error('Error exporting workout:', error);
            if (error.code === 'PGRST303' || error.message === 'JWT expired') {
                showToast('Sua sessão expirou. Por favor, atualize a página.', 'error');
            } else {
                showToast('Erro ao exportar o treino.', 'error');
            }
        } finally {
            setIsExporting(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(exportedText);
            setIsCopied(true);
            showToast('Treino copiado com sucesso!', 'success');
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            showToast('Falha ao copiar. Tente selecionar o texto e copiar manualmente.', 'error');
        }
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
                    className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90"
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <div className="flex items-center justify-between mb-6 gap-2">
                    <div className="flex flex-col min-w-0 pr-2">
                        <h2 className="text-white font-bold text-lg sm:text-xl leading-tight whitespace-nowrap">Iniciar Treino</h2>
                        <span className="text-slate-400 text-[13px] font-medium mt-0.5 leading-tight truncate">{fichaNome}</span>
                    </div>
                    
                    {!exportedText && (
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
                        >
                            <Share2 size={15} />
                            <span className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Compartilhar treino</span>
                        </button>
                    )}
                </div>

                {/* Days List or Export View */}
                <div className="mt-2 text-left">
                    {exportedText ? (
                        <div className="flex flex-col gap-4 animate-[fadeIn_200ms_ease-out]">
                            <div className="flex flex-col gap-2">
                                <label className="text-slate-300 text-[15px] font-medium ml-1">
                                    Texto do Treino:
                                </label>
                                <textarea
                                    readOnly
                                    value={exportedText}
                                    className="w-full h-48 bg-[#0f141e] text-white rounded-xl px-4 py-3.5 outline-none border border-slate-700/50 text-[14px] resize-none font-mono"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setExportedText('')}
                                    className="flex-1 py-3.5 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-all active:scale-95"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={handleCopy}
                                    className="flex-1 py-3.5 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isCopied ? <Check size={18} /> : <Copy size={18} />}
                                    {isCopied ? 'Copiado!' : 'Copiar Texto'}
                                </button>
                            </div>
                        </div>
                    ) : sortedDias.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-slate-400 text-sm">Esta ficha ainda não possui dias configurados para treinar.</p>
                            <p className="text-slate-500 text-xs mt-2">Clique no botão editar para incluir exercícios.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto scrollbar-none pb-2">
                            <label className="text-slate-300 text-[15px] font-medium ml-1 mb-1">
                                Qual treino você deseja fazer agora?
                            </label>
                            {sortedDias.map(dia => (
                                <button
                                    key={dia.dia}
                                    onClick={() => handleSelectDay(dia.dia, dia.grupos)}
                                    className="w-full bg-[#0f141e] hover:bg-[#131a26] border border-transparent focus:border-blue-500/50 rounded-xl p-4 flex items-center justify-between transition-all active:scale-[0.98] group"
                                >
                                    <div className="flex items-center gap-4 text-left flex-1 min-w-0 pr-2">
                                        <div className="w-12 h-12 flex-shrink-0 rounded-full bg-[#1a1f2e] flex items-center justify-center text-blue-500 font-bold shadow-inner border border-slate-700/30">
                                            {dia.dia}
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="text-white font-bold text-sm sm:text-[15px] mb-0.5 uppercase tracking-wide truncate block">
                                                {dia.grupos.map((group, index) => (
                                                    <span key={group}>
                                                        {group}
                                                        {index < dia.grupos.length - 1 && (
                                                            <span className="text-blue-500 mx-1.5 font-black">+</span>
                                                        )}
                                                    </span>
                                                ))}
                                            </span>
                                            <span className="text-slate-400 text-xs font-medium">Toque para começar esse treino</span>
                                        </div>
                                    </div>
                                    
                                    <div className="w-10 h-10 flex-shrink-0 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        <Play fill="currentColor" size={16} className="ml-0.5" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
