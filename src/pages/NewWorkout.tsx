import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layers, RefreshCw, Clock, Plus, Loader2, Trash2, ChevronUp, ChevronDown, Save, Edit2 } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { BottomNav } from '../components/layout/BottomNav';
import { ExerciseDetailModal } from '../components/ExerciseDetailModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/auth';
import { useDragScroll } from '../hooks/useDragScroll';
import { motion, AnimatePresence } from 'framer-motion';

interface CatalogExercise {
    id: string;
    nome: string;
    grupo: string;
    subgrupo: string | null;
    imagem_url: string | null;
}

interface DayExercise {
    id: string;
    exercicio_id: string;
    nome: string;
    imagem_url: string | null;
    series: number;
    repeticoes: number;
    carga: number;
    descanso: number;
    grupo?: string;
    ordem?: number;
    dia: DayKey;
}

type DayKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

const DEFAULT_EXERCISE_IMAGE = 'https://fafisurbnecapdpguudb.supabase.co/storage/v1/object/public/assets/geral/exercise_default_min.png';

export function NewWorkout() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get fichaId and fichaNome from location state
    const fichaId = location.state?.fichaId;
    const initialFichaNome = location.state?.fichaNome || 'Ficha teste';
    
    const [fichaNome, setFichaNome] = useState(initialFichaNome);
    const [isEditingName, setIsEditingName] = useState(false);

    const [selectedDay, setSelectedDay] = useState<DayKey>('A');
    const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
    const [activeGroup, setActiveGroup] = useState<string | null>(null);
    const [catalogExercises, setCatalogExercises] = useState<CatalogExercise[]>([]);
    const [isLoadingGroups, setIsLoadingGroups] = useState(true);
    const [isLoadingExercises, setIsLoadingExercises] = useState(false);
    const [allExercises, setAllExercises] = useState<DayExercise[]>([]);
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSavingPage, setIsSavingPage] = useState(false);
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [pendingNavPath, setPendingNavPath] = useState<string | null>(null);

    const [isLoadingDay, setIsLoadingDay] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<CatalogExercise | null>(null);
    const [combiningExercises, setCombiningExercises] = useState<CatalogExercise[]>([]);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const chipsScrollRef = useDragScroll();
    const catalogScrollRef = useDragScroll();

    const dayExercises = allExercises
        .filter(ex => ex.dia === selectedDay && !deletedIds.has(ex.id))
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    // Fetch distinct muscle groups on mount
    useEffect(() => {
        async function fetchMuscleGroups() {
            setIsLoadingGroups(true);
            const { data, error } = await supabase
                .from('tbExercicios')
                .select('grupo')
                .not('grupo', 'is', null);

            if (!error && data) {
                const uniqueGroups = [...new Set(data.map((row) => row.grupo as string))].sort();
                setMuscleGroups(uniqueGroups);
                if (uniqueGroups.length > 0) {
                    setActiveGroup(uniqueGroups[0]);
                }
            }
            setIsLoadingGroups(false);
        }

        fetchMuscleGroups();
    }, []);

    // Fetch exercises when active group changes
    useEffect(() => {
        if (!activeGroup) return;

        async function fetchExercisesByGroup() {
            setIsLoadingExercises(true);
            const { data, error } = await supabase
                .from('tbExercicios')
                .select('id, nome, grupo, subgrupo, imagem_url')
                .eq('grupo', activeGroup)
                .order('grupo', { ascending: true })
                .order('subgrupo', { ascending: true })
                .order('nome', { ascending: true });

            if (!error && data) {
                setCatalogExercises(data as CatalogExercise[]);
            }
            setIsLoadingExercises(false);
        }

        fetchExercisesByGroup();
    }, [activeGroup]);

    // Fetch ALL exercises for the ficha
    const fetchAllExercises = useCallback(async () => {
        setIsLoadingDay(true);
        
        let query = supabase
            .from('tbTreinos')
            .select(`
                id,
                exercicio_id,
                dia,
                series,
                repeticoes,
                carga,
                descanso,
                ordem,
                tbExercicios (
                    nome,
                    imagem_url,
                    grupo
                )
            `);
            
        if (fichaId) {
            query = query.eq('ficha_id', fichaId);
        }

        const { data, error } = await query.order('ordem');

        if (!error && data) {
            const mapped: DayExercise[] = data.map((row: Record<string, unknown>) => {
                const exercicio = row.tbExercicios as { nome: string; imagem_url: string | null; grupo?: string } | null;
                return {
                    id: row.id as string,
                    exercicio_id: row.exercicio_id as string,
                    dia: row.dia as DayKey,
                    nome: exercicio?.nome || 'Exercício',
                    imagem_url: exercicio?.imagem_url || null,
                    series: row.series as number,
                    repeticoes: row.repeticoes as number,
                    carga: row.carga as number,
                    descanso: row.descanso as number,
                    grupo: exercicio?.grupo,
                    ordem: row.ordem as number,
                };
            });
            setAllExercises(mapped);
        } else {
            setAllExercises([]);
        }
        setDeletedIds(new Set());
        setHasUnsavedChanges(false);
        setIsLoadingDay(false);
    }, [fichaId]);

    useEffect(() => {
        fetchAllExercises();
    }, [fetchAllExercises]);

    const handleDeleteClick = (id: string) => {
        setDeleteTargetId(id);
    };

    const confirmDeleteExercise = () => {
        if (!deleteTargetId) return;
        
        if (!deleteTargetId.startsWith('temp_')) {
            setDeletedIds(prev => new Set(prev).add(deleteTargetId));
        }

        setAllExercises(prev => prev.filter(e => e.id !== deleteTargetId));
        setHasUnsavedChanges(true);
        setDeleteTargetId(null);
    };

    const handleMoveExercise = (currentIdx: number, direction: -1 | 1) => {
        const newIdx = currentIdx + direction;
        if (newIdx < 0 || newIdx >= dayExercises.length) return;

        const clone = [...allExercises];
        const item1Id = dayExercises[currentIdx].id;
        const item2Id = dayExercises[newIdx].id;
        
        const idx1 = clone.findIndex(e => e.id === item1Id);
        const idx2 = clone.findIndex(e => e.id === item2Id);

        const tempOrdem = clone[idx1].ordem;
        clone[idx1].ordem = clone[idx2].ordem;
        clone[idx2].ordem = tempOrdem;

        setAllExercises(clone);
        setHasUnsavedChanges(true);
    };

    const handleExerciseClick = (exercise: CatalogExercise) => {
        if (combiningExercises.length > 0) {
            // User is picking another exercise to combine
            setCombiningExercises(prev => [...prev, exercise]);
            setSelectedExercise(exercise);
        } else {
            setSelectedExercise(exercise);
        }
    };

    const handleExerciseAdded = (newEx: any) => {
        setAllExercises(prev => [...prev, newEx]);
        setHasUnsavedChanges(true);
        setSelectedExercise(null);
        setCombiningExercises([]);
    };

    const handleRequestCombine = (currentExercises: CatalogExercise[]) => {
        setCombiningExercises(currentExercises);
        setSelectedExercise(null);
    };

    const handleSave = async () => {
        if (!hasUnsavedChanges) return;
        setIsSavingPage(true);
        
        if (fichaNome.trim() && fichaNome !== initialFichaNome && fichaId) {
            await supabase.from('tbFichas').update({ nome: fichaNome.trim() }).eq('id', fichaId);
        }
        
        if (deletedIds.size > 0) {
            await supabase.from('tbTreinos').delete().in('id', Array.from(deletedIds));
        }
        
        const newItems = allExercises.filter(e => e.id.startsWith('temp_') && !deletedIds.has(e.id));
        if (newItems.length > 0) {
            const insertPayload = newItems.map(e => ({
                ficha_id: fichaId,
                exercicio_id: e.exercicio_id,
                dia: e.dia,
                series: e.series,
                repeticoes: e.repeticoes,
                carga: e.carga,
                descanso: e.descanso,
                ordem: e.ordem,
                user_id: getCurrentUserId()
            }));
            await supabase.from('tbTreinos').insert(insertPayload);
        }
        
        const updatedItems = allExercises.filter(e => !e.id.startsWith('temp_') && !deletedIds.has(e.id));
        if (updatedItems.length > 0) {
            const updatePayload = updatedItems.map(e => ({
                id: e.id,
                ficha_id: fichaId,
                exercicio_id: e.exercicio_id,
                dia: e.dia,
                series: e.series,
                repeticoes: e.repeticoes,
                carga: e.carga,
                descanso: e.descanso,
                ordem: e.ordem,
                user_id: getCurrentUserId()
            }));
            await supabase.from('tbTreinos').upsert(updatePayload);
        }
        
        setIsSavingPage(false);
        setHasUnsavedChanges(false);
        setDeletedIds(new Set());
        navigate(-1);
    };

    const handleBackClick = () => {
        if (hasUnsavedChanges) {
            setPendingNavPath(null);
            setShowDiscardModal(true);
        } else {
            navigate(-1);
        }
    };

    const handleNavClick = (path: string, e: React.MouseEvent<HTMLAnchorElement>) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            setPendingNavPath(path);
            setShowDiscardModal(true);
        }
    };

    const days: DayKey[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

    return (
        <div className="min-h-screen bg-[#080b12]">
        <div className="w-full flex-col flex min-h-screen bg-[#0f141e] font-sans pb-48 max-w-[1024px] mx-auto relative shadow-2xl shadow-black/50">
            <TopBar showBackButton onBackClick={handleBackClick} />
            
            <div className="px-4 w-full pt-1 mt-2 flex flex-col">
                <div className="w-full flex items-start justify-between px-1 gap-4">
                    <div className="flex-1">
                        <h1 className="text-[#f8fafc] font-bold text-[22px] sm:text-[24px] tracking-[-0.5px] leading-tight">
                            Adicione exercícios à sua ficha
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            {isEditingName ? (
                                <input
                                    autoFocus
                                    className="bg-[#1a2333] border border-blue-500/50 rounded-lg text-white font-medium text-[15px] outline-none w-full max-w-[250px] px-3 py-1.5 focus:border-blue-500 transition-colors"
                                    value={fichaNome}
                                    placeholder="Nome da ficha"
                                    onChange={(e) => {
                                        setFichaNome(e.target.value);
                                        setHasUnsavedChanges(true);
                                    }}
                                    onBlur={() => setIsEditingName(false)}
                                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                                />
                            ) : (
                                <div 
                                    className="flex items-center gap-2 cursor-pointer group active:scale-[0.98] transition-all"
                                    onClick={() => setIsEditingName(true)}
                                >
                                    <p className="text-[#8e95a3] font-medium text-[15px] group-hover:text-white transition-colors">
                                        {fichaNome}
                                    </p>
                                    <div className="w-6 h-6 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all">
                                        <Edit2 size={12} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Muscle Group Chips */}
                <div ref={chipsScrollRef} className="flex overflow-x-auto gap-2 mt-4 pb-2 scrollbar-none">
                    {isLoadingGroups ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm py-1.5 px-2">
                            <Loader2 size={16} className="animate-spin" />
                            <span>Carregando grupos...</span>
                        </div>
                    ) : (
                        muscleGroups.map((group) => (
                            <button
                                key={group}
                                onClick={() => setActiveGroup(group)}
                                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[14px] transition-all active:scale-95 ${
                                    activeGroup === group 
                                        ? 'bg-[#185cf2] text-white font-bold' 
                                        : 'bg-[#212b3b] text-[#8e95a3] font-normal'
                                }`}
                            >
                                {group}
                            </button>
                        ))
                    )}
                </div>

                {/* Combine Mode Banner */}
                {combiningExercises.length > 0 && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3 mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                            <span className="text-blue-400 text-sm font-bold truncate">
                                Selecione o próximo exercício para combinar
                            </span>
                        </div>
                        <button
                            onClick={() => setCombiningExercises([])}
                            className="text-slate-400 text-xs font-bold bg-slate-700/60 px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-all active:scale-95 flex-shrink-0 ml-2"
                        >
                            Cancelar
                        </button>
                    </div>
                )}

                {/* Exercises Catalog Row */}
                <div ref={catalogScrollRef} className="flex overflow-x-auto gap-4 mt-3 pb-2 scrollbar-none min-h-[160px]">
                    {isLoadingExercises ? (
                        <div className="flex items-center justify-center w-full gap-2 text-slate-400 text-sm">
                            <Loader2 size={18} className="animate-spin" />
                            <span>Carregando exercícios...</span>
                        </div>
                    ) : catalogExercises.length > 0 ? (
                        catalogExercises.map((exercise) => (
                            <div
                                key={exercise.id}
                                onClick={() => handleExerciseClick(exercise)}
                                className={`flex flex-col items-center min-w-[120px] active:scale-95 transition-all cursor-pointer ${combiningExercises.length > 0 ? 'ring-2 ring-blue-500/0 hover:ring-blue-500/50 rounded-2xl p-1' : ''}`}
                            >
                                <div className={`w-28 h-28 rounded-2xl p-2 flex items-center justify-center overflow-hidden mb-2 ${combiningExercises.some(c => c.id === exercise.id) ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-white'}`}>
                                    <img 
                                        src={exercise.imagem_url || DEFAULT_EXERCISE_IMAGE} 
                                        alt={exercise.nome} 
                                        className="w-full h-full object-cover rounded-xl" 
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = DEFAULT_EXERCISE_IMAGE;
                                        }}
                                    />
                                </div>
                                <span className="text-white text-sm text-center leading-tight">{exercise.nome}</span>
                                {exercise.subgrupo && (
                                    <span className="text-slate-500 text-xs text-center mt-0.5">{exercise.subgrupo}</span>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="flex items-center justify-center w-full text-slate-500 text-sm">
                            Nenhum exercício encontrado para este grupo
                        </div>
                    )}
                </div>

                {/* Days Tabs */}
                <div className="flex mt-3 w-full gap-1">
                    {days.map((day) => {
                        const hasExercises = allExercises.some(ex => ex.dia === day && !deletedIds.has(ex.id));
                        return (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                className={`relative flex-1 py-1.5 text-sm font-bold rounded-t-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                                    selectedDay === day 
                                        ? 'bg-slate-700/50 text-blue-500' 
                                        : 'bg-slate-700/20 text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                                }`}
                            >
                                {day}
                                {hasExercises && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.6)] flex-shrink-0" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Selected Day Content */}
                <div className="bg-slate-700/50 rounded-b-xl p-4 min-h-[200px]">
                    {isLoadingDay ? (
                        <div className="flex items-center justify-center h-[200px] gap-2 text-slate-400 text-sm">
                            <Loader2 size={18} className="animate-spin" />
                            <span>Carregando treino...</span>
                        </div>
                    ) : dayExercises.length > 0 ? (
                        <div className="flex flex-col gap-3">
                            {(() => {
                                const uniqueGroups = [...new Set(dayExercises.map(ex => ex.grupo).filter(Boolean))];

                                return (
                                    <>
                                        {uniqueGroups.length > 0 && (
                                            <div className="px-1 mb-2 mt-1">
                                                <h3 className="text-white text-sm font-bold uppercase tracking-wide truncate">
                                                    {uniqueGroups.map((group, index) => (
                                                        <span key={group as string}>
                                                            {group}
                                                            {index < uniqueGroups.length - 1 && (
                                                                <span className="text-blue-500 mx-1.5">+</span>
                                                            )}
                                                        </span>
                                                    ))}
                                                </h3>
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-3">
                                            <AnimatePresence>
                                        {dayExercises.map((exercise, index) => (
                                <motion.div 
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                    key={exercise.id} 
                                    className="bg-[#0f141e] rounded-xl flex overflow-hidden shadow-md shadow-black/30 relative"
                                >
                                    {/* Actions vertical container */}
                                    <div className="absolute right-0 top-0 bottom-0 py-2 w-16 flex flex-col justify-between items-center z-10 border-l border-white/5 bg-[#0f141e]/50 backdrop-blur-sm">
                                        <button 
                                            onClick={() => handleMoveExercise(index, -1)} 
                                            disabled={index === 0}
                                            className="text-slate-400 p-1 hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-slate-400 active:scale-95"
                                        >
                                            <ChevronUp size={22} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(exercise.id)}
                                            className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-all active:scale-90"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleMoveExercise(index, 1)} 
                                            disabled={index === dayExercises.length - 1}
                                            className="text-slate-400 p-1 hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-slate-400 active:scale-95"
                                        >
                                            <ChevronDown size={22} />
                                        </button>
                                    </div>

                                    {/* Image section */}
                                    <div className="w-[100px] h-[100px] bg-white m-3 rounded-lg flex items-center justify-center p-1 flex-shrink-0">
                                        <img 
                                            src={exercise.imagem_url || DEFAULT_EXERCISE_IMAGE} 
                                            alt={exercise.nome} 
                                            className="w-full h-full object-cover rounded-md"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = DEFAULT_EXERCISE_IMAGE;
                                            }}
                                        />
                                    </div>
                                    
                                    {/* Details section */}
                                    <div className="pt-4 pr-[72px] pb-4 flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
                                        <h3 className="text-white font-bold text-base mb-2 truncate">{exercise.nome}</h3>
                                        
                                        <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 max-w-[210px]">
                                            {exercise.grupo !== 'Cardio' && (
                                            <div className="flex items-center text-blue-400 gap-1.5">
                                                <Layers size={14} className="flex-shrink-0" />
                                                <span className="text-xs font-bold text-white whitespace-nowrap">{exercise.series} séries</span>
                                            </div>
                                            )}
                                            <div className="flex items-center text-blue-400 gap-1.5">
                                                {exercise.grupo === 'Cardio' ? <Clock size={14} className="flex-shrink-0" /> : <RefreshCw size={14} className="flex-shrink-0" />}
                                                <span className="text-xs font-bold text-white whitespace-nowrap">{exercise.repeticoes} {exercise.grupo === 'Cardio' ? "min" : "reps"}</span>
                                            </div>
                                            {exercise.grupo !== 'Cardio' && (
                                            <div className="flex items-center text-blue-400 gap-1.5">
                                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0 text-blue-400"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" /></svg>
                                                <span className="text-xs font-bold text-white whitespace-nowrap">{exercise.carga} kg</span>
                                            </div>
                                            )}
                                            {exercise.grupo !== 'Cardio' && (
                                            <div className="flex items-center text-blue-400 gap-1.5">
                                                <Clock size={14} className="flex-shrink-0" />
                                                <span className="text-xs font-bold text-white whitespace-nowrap">{exercise.descanso} seg</span>
                                            </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                                            </AnimatePresence>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[200px] gap-3">
                            <div className="w-14 h-14 rounded-full bg-slate-600/50 flex items-center justify-center">
                                <Plus size={24} className="text-slate-400" />
                            </div>
                            <p className="text-slate-400 text-sm font-medium text-center">
                                Nenhum exercício adicionado para <span className="text-blue-400 font-bold">{selectedDay}</span>
                            </p>
                            <p className="text-slate-500 text-xs text-center">
                                Selecione um exercício acima para adicionar
                            </p>
                        </div>
                    )}
                </div>

            </div>
            
            <AnimatePresence>
                {hasUnsavedChanges && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="fixed bottom-24 left-0 right-0 max-w-[1024px] mx-auto px-4 z-50 pointer-events-none"
                    >
                        <button 
                            onClick={handleSave}
                            disabled={isSavingPage}
                            className="w-full h-[58px] bg-[#1d70f5] rounded-[18px] flex items-center justify-center gap-2.5 text-white font-bold text-[17px] shadow-[0_8px_24px_rgba(29,112,245,0.35)] transition-all active:scale-[0.98] disabled:opacity-70 focus:outline-none pointer-events-auto"
                        >
                            {isSavingPage ? <Loader2 size={20} className="animate-spin"/> : <Save size={20} strokeWidth={2.5} />}
                            Salvar
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <BottomNav onNavClick={handleNavClick} />

            {/* Exercise Detail Modal */}
            {selectedExercise && (
                <ExerciseDetailModal
                    exercise={combiningExercises.length > 0 ? combiningExercises[0] : selectedExercise}
                    combinedExercises={combiningExercises.length > 0 ? combiningExercises : undefined}
                    selectedDay={selectedDay}
                    currentLength={dayExercises.length}
                    onClose={() => { setSelectedExercise(null); setCombiningExercises([]); }}
                    onAdded={handleExerciseAdded}
                    onRequestCombine={handleRequestCombine}
                />
            )}
            {deleteTargetId && (
                <ConfirmDeleteModal
                    title="Excluir exercício?"
                    description="Tem certeza que deseja remover este exercício da sua ficha nesta visualização? Ao salvar, ele será permanentemente excluído."
                    onConfirm={confirmDeleteExercise}
                    onCancel={() => setDeleteTargetId(null)}
                />
            )}
            {showDiscardModal && (
                <ConfirmDeleteModal
                    title="Descartar edições?"
                    description="Tem certeza que deseja sair? Todas as adições e edições feitas não salvas nesta ficha serão permanentemente perdidas."
                    onConfirm={() => {
                        setShowDiscardModal(false);
                        if (pendingNavPath) {
                            navigate(pendingNavPath);
                        } else {
                            navigate(-1);
                        }
                    }}
                    onCancel={() => {
                        setShowDiscardModal(false);
                        setPendingNavPath(null);
                    }}
                    confirmText="Descartar"
                />
            )}
        </div>
        </div>
    );
}
