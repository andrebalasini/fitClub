import { useState, useEffect, useCallback } from 'react';
import { WeeklyCalendar } from '../components/WeeklyCalendar';
import { ClipboardList, Loader2, Edit2, Trash2, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CreateFichaModal } from '../components/CreateFichaModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { SelectWorkoutDayModal, type FichaDayWorkout } from '../components/SelectWorkoutDayModal';
import { WorkoutCreationDecisionModal } from '../components/WorkoutCreationDecisionModal';
import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/auth';

interface Ficha {
    id: string;
    nome: string;
    qtd_dias: number;
    qtd_exercicios: number;
    created_at: string;
    diasTreino: FichaDayWorkout[];
}

const NavbarDumbbellIcon = ({ className, size = 24 }: { className?: string; size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} className={className}>
    <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" />
  </svg>
);

export function WorkoutPlan() {
    const navigate = useNavigate();
    const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Ficha | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedTreinoDayFicha, setSelectedTreinoDayFicha] = useState<Ficha | null>(null);
    const [fichas, setFichas] = useState<Ficha[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [trainedDates, setTrainedDates] = useState<{ date: Date; letter: string }[]>([]);

    const fetchFichas = useCallback(async () => {
        setIsLoading(true);
        const { data } = await supabase
            .from('tbFichas')
            .select(`
                id, 
                nome,
                created_at,
                tbTreinos ( dia, ordem, tbExercicios ( grupo ) )
            `)
            .order('created_at', { ascending: false })
            .eq('user_id', getCurrentUserId());

        if (data) {
            const parsedFichas = data.map((ficha: any) => {
                const treinos = ficha.tbTreinos || [];
                
                // Sort treinos strictly by their designated order to preserve muscle group visual sequence
                treinos.sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
                
                const dayGroups = new Map<string, Set<string>>();
                treinos.forEach((t: any) => {
                    if (!t.dia) return;
                    if (!dayGroups.has(t.dia)) {
                        dayGroups.set(t.dia, new Set());
                    }
                    const ex = t.tbExercicios as { grupo: string } | undefined;
                    if (ex?.grupo) {
                        dayGroups.get(t.dia as string)!.add(ex.grupo);
                    }
                });
                
                const diasTreino: FichaDayWorkout[] = Array.from(dayGroups.entries()).map(([dia, gruposSet]) => ({
                    dia,
                    grupos: Array.from(gruposSet)
                }));

                const distinctDays = diasTreino.length;

                return {
                    id: ficha.id,
                    nome: ficha.nome,
                    created_at: ficha.created_at,
                    qtd_dias: distinctDays,
                    qtd_exercicios: treinos.length,
                    diasTreino
                };
            });
            setFichas(parsedFichas);
        }
        setIsLoading(false);
    }, []);

    const fetchTrainedDates = useCallback(async () => {
        const userId = getCurrentUserId();
        // Busca os treinos concluídos da semana atual e últimas 4 semanas
        const since = new Date();
        since.setDate(since.getDate() - 28);
        const { data, error } = await supabase
            .from('tbTreinosCompletos')
            .select('concluido_em, dia')
            .eq('user_id', userId)
            .gte('concluido_em', since.toISOString());

        if (!error && data) {
            const transformed = data.map((row: any) => ({
                date: new Date(row.concluido_em),
                letter: row.dia || '?'
            }));
            setTrainedDates(transformed);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchFichas();
        fetchTrainedDates();
    }, [fetchFichas, fetchTrainedDates]);

    const handleDeleteClick = (e: React.MouseEvent, ficha: Ficha) => {
        e.stopPropagation();
        setDeleteTarget(ficha);
    };

    const handleCardClick = (ficha: Ficha) => {
        if (!isModalOpen && !deleteTarget) {
            setSelectedTreinoDayFicha(ficha);
        }
    };

    const confirmDeleteFicha = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        
        await supabase.from('tbFichas').delete().eq('id', deleteTarget.id);
        
        setFichas(prev => prev.filter(f => f.id !== deleteTarget.id));
        setIsDeleting(false);
        setDeleteTarget(null);
    };

    const handleEdit = (e: React.MouseEvent, ficha: Ficha) => {
        e.stopPropagation();
        navigate('/treino/novo', { state: { fichaId: ficha.id, fichaNome: ficha.nome } });
    };

    const openCreateModal = () => {
        if (fichas.length > 0) {
            setIsDecisionModalOpen(true);
        } else {
            setIsModalOpen(true);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    return (
        <div className="w-full flex-col flex justify-start pb-20 pt-1 relative min-h-screen bg-[#0f141e] font-sans">
            <div className="w-full mt-2 mb-1">
                <WeeklyCalendar trainedDates={trainedDates} />
            </div>
            <div className="px-4 w-full mt-4 flex flex-col space-y-4">
                <h2 className="text-[#f8fafc] font-bold text-[24px] px-1 tracking-[-0.5px]">Planos de Treino</h2>
                
                {isLoading ? (
                    <div className="w-full p-8 flex justify-center text-blue-500">
                        <Loader2 size={32} className="animate-spin" />
                    </div>
                ) : fichas.length > 0 ? (
                    <div className="flex flex-col">
                        {/* ── PLANO ATIVO (DESTAQUE) ── */}
                        <div className="flex flex-col space-y-3">
                            <div 
                                onClick={() => handleCardClick(fichas[0])}
                                className="w-full bg-gradient-to-br from-[#131b2b] to-[#0f141e] rounded-[24px] p-6 flex items-center justify-between active:scale-[0.98] transition-all shadow-xl border border-transparent cursor-pointer relative overflow-hidden group"
                            >
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                                <div className="flex items-center gap-5 pl-1">
                                    <div className="w-14 h-14 bg-blue-500 rounded-[16px] flex items-center justify-center text-white flex-shrink-0 shadow-[0_4px_12px_rgba(59,130,246,0.3)] group-hover:scale-105 transition-transform">
                                        <Play size={24} fill="currentColor" className="ml-1" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-blue-400 text-[11px] font-black uppercase tracking-widest mb-0.5">Plano Ativo</span>
                                        <h3 className="text-white font-bold text-[20px] leading-tight mb-1">{fichas[0].nome}</h3>
                                        <span className="text-[#8e95a3] text-[13px] font-medium leading-none flex items-center gap-1.5">
                                            {fichas[0].qtd_dias} {fichas[0].qtd_dias === 1 ? 'dia' : 'dias'} • {fichas[0].qtd_exercicios} exerc.
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={(e) => handleEdit(e, fichas[0])}
                                        className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-90"
                                    >
                                        <Edit2 size={19} />
                                    </button>
                                    <button 
                                        onClick={(e) => handleDeleteClick(e, fichas[0])}
                                        className="w-11 h-11 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 transition-all active:scale-90"
                                    >
                                        <Trash2 size={19} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── MEU HISTÓRICO / ANTERIORES ── */}
                        {fichas.length > 1 && (
                            <div className="flex flex-col mt-8">
                                <h3 className="text-[#64748b] font-bold text-[13px] uppercase tracking-widest px-1 mb-3">
                                    Planos Anteriores
                                </h3>
                                <div className="flex flex-col gap-2.5">
                                    {fichas.slice(1).map((ficha) => (
                                        <div 
                                            key={ficha.id}
                                            onClick={() => handleCardClick(ficha)}
                                            className="w-full bg-[#131b2b]/40 rounded-[20px] p-4 flex items-center justify-between active:scale-[0.98] transition-all border border-transparent hover:border-slate-800 cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-10 h-10 bg-slate-800/50 rounded-[12px] flex items-center justify-center text-slate-500 flex-shrink-0">
                                                    <NavbarDumbbellIcon size={18} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <h3 className="text-slate-300 font-bold text-[15px] leading-tight">{ficha.nome}</h3>
                                                    <span className="text-slate-500 text-[11px] font-medium leading-none mt-1">
                                                        Criado em {formatDate(ficha.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={(e) => handleEdit(e, ficha)}
                                                    className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-white transition-all"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDeleteClick(e, ficha)}
                                                    className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-red-400 transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-4 rounded-[24px] bg-[#131b2b] shadow-lg text-center text-[#8e95a3] font-medium border border-transparent">
                        Nenhuma ficha criada.
                    </div>
                )}
            </div>

            {/* Fixed Bottom Button Wrapper */}
            <div className="fixed bottom-24 left-0 right-0 max-w-[1024px] mx-auto px-4 pointer-events-none z-50">
                <button 
                    onClick={openCreateModal}
                    className="w-full h-[58px] bg-[#1d70f5] rounded-[18px] flex items-center justify-center gap-2.5 text-white font-bold text-[17px] shadow-[0_8px_24px_rgba(29,112,245,0.35)] transition-all active:scale-[0.98] focus:outline-none pointer-events-auto"
                >
                    <ClipboardList size={20} strokeWidth={2.5} />
                    Novo Plano de Treino
                </button>
            </div>

            {isModalOpen && (
                <CreateFichaModal 
                    onClose={() => {
                        setIsModalOpen(false);
                    }}
                    onCreated={async (fichaId, fichaNome) => {
                        setIsModalOpen(false);
                        await fetchFichas();
                        navigate('/treino/novo', { state: { fichaId, fichaNome } });
                    }}
                />
            )}

            {selectedTreinoDayFicha && (
                <SelectWorkoutDayModal
                    fichaId={selectedTreinoDayFicha.id}
                    fichaNome={selectedTreinoDayFicha.nome}
                    diasTreino={selectedTreinoDayFicha.diasTreino}
                    onClose={() => setSelectedTreinoDayFicha(null)}
                />
            )}

            {deleteTarget && (
                <ConfirmDeleteModal
                    title="Excluir plano de treino?"
                    description={`Tem certeza que deseja apagar o plano "${deleteTarget.nome}"? Todos os exercícios incluídos nele serão perdidos. Essa ação não pode ser desfeita.`}
                    onConfirm={confirmDeleteFicha}
                    onCancel={() => setDeleteTarget(null)}
                    isDeleting={isDeleting}
                />
            )}

            {isDecisionModalOpen && fichas.length > 0 && (
                <WorkoutCreationDecisionModal
                    activePlanName={fichas[0].nome}
                    onClose={() => setIsDecisionModalOpen(false)}
                    onAddDayToCurrent={() => {
                        setIsDecisionModalOpen(false);
                        navigate('/treino/novo', { state: { fichaId: fichas[0].id, fichaNome: fichas[0].nome } });
                    }}
                    onCreateNew={() => {
                        setIsDecisionModalOpen(false);
                        setIsModalOpen(true);
                    }}
                />
            )}
        </div>
    );
}
