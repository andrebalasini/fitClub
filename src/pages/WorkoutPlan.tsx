import { useState, useEffect, useCallback } from 'react';
import { WeeklyCalendar } from '../components/WeeklyCalendar';
import { ClipboardList, Loader2, Edit2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CreateFichaModal } from '../components/CreateFichaModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { SelectWorkoutDayModal, type FichaDayWorkout } from '../components/SelectWorkoutDayModal';
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Ficha | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedTreinoDayFicha, setSelectedTreinoDayFicha] = useState<Ficha | null>(null);
    const [fichas, setFichas] = useState<Ficha[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [trainedDates, setTrainedDates] = useState<{ date: Date; letter: string }[]>([]);

    const fetchFichas = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('tbFichas')
            .select(`
                id, 
                nome,
                created_at,
                tbTreinos ( dia, ordem, tbExercicios ( grupo ) )
            `)
            .order('created_at', { ascending: false })
            .eq('user_id', getCurrentUserId());

        if (!error && data) {
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
                    if (t.tbExercicios?.grupo) {
                        dayGroups.get(t.dia)!.add(t.tbExercicios.grupo);
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
        setIsModalOpen(true);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    return (
        <div className="w-full flex-col flex justify-start pb-20 pt-1 relative min-h-screen bg-[#0f141e] font-sans">
            <div className="w-full -mt-2 mb-1">
                <WeeklyCalendar trainedDates={trainedDates} />
            </div>
            <div className="px-4 w-full mt-4 flex flex-col space-y-4">
                <h2 className="text-[#f8fafc] font-bold text-[24px] px-1 tracking-[-0.5px]">Suas fichas de treino</h2>
                
                {isLoading ? (
                    <div className="w-full p-8 flex justify-center text-blue-500">
                        <Loader2 size={32} className="animate-spin" />
                    </div>
                ) : fichas.length > 0 ? (
                    <div className="flex flex-col gap-3">
                        {fichas.map((ficha) => (
                            <div 
                                key={ficha.id}
                                onClick={() => handleCardClick(ficha)}
                                className="w-full bg-[#131b2b] rounded-[24px] p-5 flex items-center justify-between active:scale-[0.98] transition-all shadow-lg border border-transparent hover:border-blue-500/20 cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-500/10 rounded-[14px] flex items-center justify-center text-blue-500 flex-shrink-0">
                                        <NavbarDumbbellIcon size={24} />
                                    </div>
                                    <div className="flex flex-col mr-2">
                                        <h3 className="text-white font-bold text-[18px] leading-tight mb-0.5">{ficha.nome}</h3>
                                        <span className="text-[#8e95a3] text-[12px] font-medium leading-[1.3] mt-0.5 max-w-[160px]">
                                            {ficha.qtd_dias} {ficha.qtd_dias === 1 ? 'dia' : 'dias'} • {ficha.qtd_exercicios} {ficha.qtd_exercicios === 1 ? 'exerc.' : 'exerc.'}
                                            <br/>
                                            Criado em {formatDate(ficha.created_at)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={(e) => handleEdit(e, ficha)}
                                        className="w-11 h-11 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-all active:scale-90"
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                    <button 
                                        onClick={(e) => handleDeleteClick(e, ficha)}
                                        className="w-11 h-11 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-all active:scale-90"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
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
                    Nova ficha
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
                    title="Excluir ficha de treino?"
                    description={`Tem certeza que deseja apagar a ficha "${deleteTarget.nome}"? Todos os exercícios incluídos nela serão perdidos. Essa ação não pode ser desfeita.`}
                    onConfirm={confirmDeleteFicha}
                    onCancel={() => setDeleteTarget(null)}
                    isDeleting={isDeleting}
                />
            )}
        </div>
    );
}
