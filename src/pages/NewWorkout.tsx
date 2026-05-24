import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layers, RefreshCw, Clock, Loader2, Trash2, ChevronUp, ChevronDown, Save, Edit2, ImageIcon, Search } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { BottomNav } from '../components/layout/BottomNav';
import { ExerciseDetailModal } from '../components/ExerciseDetailModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/auth';
import { useDragScroll } from '../hooks/useDragScroll';
import { motion, AnimatePresence } from 'framer-motion';
import { processWorkoutImage } from '../lib/gemini';
import { showToast } from '../components/Toast';

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
    is_pyramid?: boolean;
    pyramid_series?: { reps: number; kg: number }[] | null;
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
    const [searchQuery, setSearchQuery] = useState('');

    const [isLoadingDay, setIsLoadingDay] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<CatalogExercise | null>(null);
    const [editingExercise, setEditingExercise] = useState<DayExercise | null>(null);
    const [combiningExercises, setCombiningExercises] = useState<CatalogExercise[]>([]);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [showDeleteDayModal, setShowDeleteDayModal] = useState(false);
    const [isImportingImage, setIsImportingImage] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importStatus, setImportStatus] = useState('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const progressIntervalRef = React.useRef<number | null>(null);

    // Cleanup interval
    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, []);
    const chipsScrollRef = useDragScroll();
    const catalogScrollRef = useDragScroll();

    const dayExercises = allExercises
        .filter(ex => ex.dia === selectedDay && !deletedIds.has(ex.id))
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    const searchTrimmed = searchQuery.trim().toLowerCase();
    const isSearching = searchTrimmed.length > 0;

    const searchMatchedExercises = isSearching 
        ? catalogExercises.filter(ex => 
            ex.nome.toLowerCase().includes(searchTrimmed)
        )
        : catalogExercises;

    const matchedGroups = new Set(searchMatchedExercises.map(ex => ex.grupo));

    const displayedCatalogExercises = activeGroup 
        ? searchMatchedExercises.filter(ex => ex.grupo === activeGroup)
        : searchMatchedExercises;

    // Fetch distinct muscle groups and catalog exercises on mount
    useEffect(() => {
        async function fetchInitialData() {
            setIsLoadingGroups(true);
            setIsLoadingExercises(true);
            
            const { data: exercisesData, error } = await supabase
                .from('tbExercicios')
                .select('id, nome, grupo, subgrupo, imagem_url')
                .order('grupo', { ascending: true })
                .order('subgrupo', { ascending: true })
                .order('nome', { ascending: true });

            if (!error && exercisesData) {
                setCatalogExercises(exercisesData as CatalogExercise[]);
                
                const uniqueGroups = [...new Set((exercisesData as CatalogExercise[]).map((row) => row.grupo).filter(Boolean))].sort();
                setMuscleGroups(uniqueGroups as string[]);
                if (uniqueGroups.length > 0) {
                    setActiveGroup(uniqueGroups[0] as string);
                }
            }
            setIsLoadingGroups(false);
            setIsLoadingExercises(false);
        }

        fetchInitialData();
    }, []);

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
                is_pyramid,
                pyramid_series,
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
                    is_pyramid: row.is_pyramid as boolean,
                    pyramid_series: row.pyramid_series as { reps: number; kg: number }[] | null
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

    const handleEditClick = (exercise: DayExercise) => {
        setEditingExercise(exercise);
    };

    const handleExerciseEdited = (editedData: Record<string, unknown>) => {
        if (!editingExercise) return;
        setAllExercises(prev => prev.map(ex => {
            if (ex.id === editingExercise.id) {
                return {
                    ...ex,
                    series: editedData.series as number,
                    repeticoes: editedData.repeticoes as number,
                    carga: editedData.carga as number,
                    descanso: editedData.descanso as number,
                    is_pyramid: editedData.is_pyramid as boolean,
                    pyramid_series: editedData.pyramid_series as { reps: number; kg: number }[] | null
                };
            }
            return ex;
        }));
        setHasUnsavedChanges(true);
        setEditingExercise(null);
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

    const handleExerciseAdded = (newEx: Record<string, unknown>) => {
        setAllExercises(prev => [...prev, newEx as unknown as DayExercise]);
        setHasUnsavedChanges(true);
        setSelectedExercise(null);
        setCombiningExercises([]);
    };

    const handleRequestCombine = (currentExercises: CatalogExercise[]) => {
        setCombiningExercises(currentExercises);
        setSelectedExercise(null);
    };

    const handleImageUploadAsync = async (file: File, targetDay: DayKey) => {
        setIsImportingImage(true);
        setImportProgress(5);
        setImportStatus('Lendo formato da imagem...');

        progressIntervalRef.current = window.setInterval(() => {
            setImportProgress(prev => {
                if (prev >= 85) {
                    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                    return 85;
                }
                return prev + (Math.random() * 3 + 1);
            });
        }, 300);

        try {
            // Fetch available exercises
            const { data: exData, error: exError } = await supabase
                .from('tbExercicios')
                .select('id, nome, grupo, imagem_url');
            
            if (exError || !exData || exData.length === 0) {
                throw new Error("Não foi possível carregar a base de exercícios.");
            }

            // Base64 conversion
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onload = () => {
                    const dataUrl = reader.result as string;
                    const base64 = dataUrl.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = error => reject(error);
            });
            reader.readAsDataURL(file);
            const base64Data = await base64Promise;
            
            setImportStatus('Analisando exercícios com Inteligência Artificial...');

            // Process with Gemini for specific day
            const parsedExercises = await processWorkoutImage(base64Data, file.type, exData, targetDay);

            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            setImportProgress(90);
            setImportStatus('Adicionando à ficha...');

            if (parsedExercises.length > 0) {
                const currentDayExs = allExercises.filter(e => e.dia === targetDay && !deletedIds.has(e.id));
                const startingOrder = currentDayExs.length > 0 ? Math.max(...currentDayExs.map(e => e.ordem || 0)) + 1 : 0;
                
                const newExercises: DayExercise[] = parsedExercises.map((e, index) => {
                    const exInfo = exData.find(dbEx => dbEx.id === e.exercicio_id);
                    return {
                        id: `temp_${Date.now()}_${index}`,
                        exercicio_id: e.exercicio_id,
                        nome: exInfo?.nome || 'Exercício',
                        imagem_url: exInfo?.imagem_url || null,
                        grupo: exInfo?.grupo,
                        series: e.series,
                        repeticoes: e.repeticoes,
                        carga: e.carga,
                        descanso: e.descanso,
                        dia: targetDay,
                        ordem: startingOrder + index
                    };
                });

                setAllExercises(prev => [...prev, ...newExercises]);
                setHasUnsavedChanges(true);
                showToast(`Treino ${targetDay} importado com sucesso via foto!`, 'success');
            } else {
                showToast("Nenhum exercício compreendido pela IA.", 'error');
            }

            setImportProgress(100);
            setImportStatus('Pronto!');

            await new Promise(r => setTimeout(r, 600));

        } catch (error: unknown) {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            console.error('API/Image Error:', error);
            const msg = error instanceof Error ? error.message : "Falha ao importar treino. Verifique console para detalhes.";
            showToast(msg, 'error');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
            setIsImportingImage(false);
            setImportProgress(0);
        }
    };

    const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleImageUploadAsync(file, selectedDay);
        }
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
                user_id: getCurrentUserId(),
                is_pyramid: e.is_pyramid,
                pyramid_series: e.pyramid_series
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
                user_id: getCurrentUserId(),
                is_pyramid: e.is_pyramid,
                pyramid_series: e.pyramid_series
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

    const confirmDeleteDay = () => {
        const dayExs = allExercises.filter(ex => ex.dia === selectedDay && !deletedIds.has(ex.id));
        const persistedIds = dayExs.filter(ex => !ex.id.startsWith('temp_')).map(ex => ex.id);
        
        // Marca exercícios persistidos para exclusão no banco
        if (persistedIds.length > 0) {
            setDeletedIds(prev => {
                const next = new Set(prev);
                persistedIds.forEach(id => next.add(id));
                return next;
            });
        }
        
        // Remove exercícios temporários do estado
        setAllExercises(prev => prev.filter(ex => ex.dia !== selectedDay || deletedIds.has(ex.id)));
        setHasUnsavedChanges(true);
        setShowDeleteDayModal(false);
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
                        muscleGroups.map((group) => {
                            const isActive = activeGroup === group || (isSearching && !activeGroup && matchedGroups.has(group));
                            return (
                                <button
                                    key={group}
                                    onClick={() => setActiveGroup(group)}
                                    className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[14px] transition-all active:scale-95 ${
                                        isActive 
                                            ? 'bg-[#185cf2] text-white font-bold' 
                                            : 'bg-[#212b3b] text-[#8e95a3] font-normal'
                                    }`}
                                >
                                    {group}
                                </button>
                            );
                        })
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

                {/* Search Bar */}
                <div className="mt-3 px-1">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar exercício..."
                            value={searchQuery}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSearchQuery(val);
                                if (val.trim().length > 0) {
                                    setActiveGroup(null);
                                } else {
                                    if (!activeGroup && muscleGroups.length > 0) {
                                        setActiveGroup(muscleGroups[0]);
                                    }
                                }
                            }}
                            className="w-full bg-[#1a2333] border-none rounded-xl text-white text-[15px] px-4 py-2.5 pl-10 focus:outline-none transition-colors placeholder:text-slate-500"
                        />
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    </div>
                </div>

                {/* Exercises Catalog Row */}
                <div ref={catalogScrollRef} className="flex overflow-x-auto gap-4 mt-3 pb-2 scrollbar-none min-h-[160px]">
                    {isLoadingExercises ? (
                        <div className="flex items-center justify-center w-full gap-2 text-slate-400 text-sm">
                            <Loader2 size={18} className="animate-spin" />
                            <span>Carregando exercícios...</span>
                        </div>
                    ) : displayedCatalogExercises.length > 0 ? (
                        displayedCatalogExercises.map((exercise) => (
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
                                <span className="text-white text-sm text-center leading-tight line-clamp-2 px-1 w-full">{exercise.nome}</span>
                            </div>
                        ))
                    ) : (
                        <div className="flex items-center justify-center w-full text-slate-500 text-sm px-4 text-center">
                            {isSearching 
                                ? `Não foram encontrados exercícios com "${searchQuery}"${activeGroup ? ` no grupo ${activeGroup}` : ''}`
                                : "Nenhum exercício encontrado"}
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
                    ) : isImportingImage ? (
                        <div className="flex flex-col items-center justify-center py-6 h-[200px]">
                            <div className="relative w-20 h-20 mb-4">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle 
                                        cx="40" cy="40" r="36" 
                                        stroke="currentColor" strokeWidth="6" fill="none" 
                                        className="text-[#0f141e]" 
                                    />
                                    <circle 
                                        cx="40" cy="40" r="36" 
                                        stroke="currentColor" strokeWidth="6" fill="none" 
                                        className="text-blue-500 transition-all duration-300 ease-out" 
                                        strokeDasharray="226.2" 
                                        strokeDashoffset={226.2 - (226.2 * importProgress) / 100} 
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">{Math.round(importProgress)}%</span>
                                </div>
                            </div>
                            <h3 className="text-white font-bold text-[15px] text-center">{importStatus}</h3>
                        </div>
                    ) : dayExercises.length > 0 ? (
                        <div className="flex flex-col gap-3">
                            {(() => {
                                const uniqueGroups = [...new Set(dayExercises.map(ex => ex.grupo).filter(Boolean))];

                                return (
                                    <>
                                        <div className="px-1 mb-2 mt-1 flex justify-between items-center">
                                            <h3 className="text-white text-sm font-bold uppercase tracking-wide truncate">
                                                {uniqueGroups.length > 0 ? (
                                                    uniqueGroups.map((group, index) => (
                                                        <span key={group as string}>
                                                            {group}
                                                            {index < uniqueGroups.length - 1 && (
                                                                <span className="text-blue-500 mx-1.5">+</span>
                                                            )}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span>Treino {selectedDay}</span>
                                                )}
                                            </h3>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-all active:scale-95"
                                                    aria-label="Importar treino por foto"
                                                >
                                                    <ImageIcon size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setShowDeleteDayModal(true)}
                                                    className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all active:scale-95"
                                                    aria-label="Apagar todos exercícios do dia"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <AnimatePresence>
                                                {dayExercises.map((exercise, index) => (
                                                    <motion.div 
                                                        key={exercise.id}
                                                        layout
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                                        className="bg-[#0f141e] rounded-xl flex overflow-hidden shadow-md shadow-black/30 relative items-center"
                                                    >
                                                        {/* Actions right container */}
                                                        <div className="absolute right-0 top-0 bottom-0 py-2 w-16 flex flex-col justify-center gap-4 items-center z-10 border-l border-white/5 bg-[#0f141e]/50 backdrop-blur-sm">
                                                            <button
                                                                onClick={() => handleEditClick(exercise)}
                                                                className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-all active:scale-90"
                                                            >
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteClick(exercise.id)}
                                                                className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-all active:scale-90"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>

                                                        {/* Image section */}
                                                        <div className="w-[100px] h-[100px] bg-white m-3 rounded-lg flex items-center justify-center p-1 flex-shrink-0 self-center">
                                                            <img 
                                                                src={exercise.imagem_url || DEFAULT_EXERCISE_IMAGE} 
                                                                alt={exercise.nome} 
                                                                className="w-full h-full object-cover rounded-md"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = DEFAULT_EXERCISE_IMAGE;
                                                                }}
                                                            />
                                                        </div>
                                                        
                                                        {/* Details section with arrows */}
                                                        <div className="py-2 pr-[72px] flex-1 min-w-0 flex flex-col justify-center items-start">
                                                            <button 
                                                                onClick={() => handleMoveExercise(index, -1)} 
                                                                disabled={index === 0}
                                                                className="text-slate-500 hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-slate-400 active:scale-95 pb-1 w-full flex justify-center"
                                                            >
                                                                <ChevronUp size={22} />
                                                            </button>

                                                            <div className="w-full">
                                                                <h3 className="text-white font-bold text-base mb-1.5 truncate">{exercise.nome}</h3>
                                                                
                                                                <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 w-full max-w-[210px] place-items-start">
                                                                    {exercise.grupo !== 'Cardio' && (
                                                                    <div className="flex items-center gap-1.5 text-blue-400">
                                                                        <Layers size={14} className="flex-shrink-0" />
                                                                        <span className={`text-xs font-bold whitespace-nowrap ${exercise.is_pyramid ? 'text-orange-500' : 'text-white'}`}>{exercise.series} séries</span>
                                                                    </div>
                                                                    )}
                                                                    <div className="flex items-center gap-1.5 text-blue-400">
                                                                        {exercise.grupo === 'Cardio' ? <Clock size={14} className="flex-shrink-0" /> : <RefreshCw size={14} className="flex-shrink-0" />}
                                                                        <span className={`text-xs font-bold whitespace-nowrap ${exercise.is_pyramid ? 'text-orange-500' : 'text-white'}`}>{exercise.repeticoes} {exercise.grupo === 'Cardio' ? "min" : "reps"}</span>
                                                                    </div>
                                                                    {exercise.grupo !== 'Cardio' && (
                                                                    <div className="flex items-center gap-1.5 text-blue-400">
                                                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" /></svg>
                                                                        <span className={`text-xs font-bold whitespace-nowrap ${exercise.is_pyramid ? 'text-orange-500' : 'text-white'}`}>{exercise.carga} kg</span>
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

                                                            <button 
                                                                onClick={() => handleMoveExercise(index, 1)} 
                                                                disabled={index === dayExercises.length - 1}
                                                                className="text-slate-500 hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-slate-400 active:scale-95 pt-1 w-full flex justify-center"
                                                            >
                                                                <ChevronDown size={22} />
                                                            </button>
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
                        <div className="flex flex-col items-center justify-center min-h-[250px] gap-8 py-10">
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-slate-300 text-[18px] font-bold text-center">
                                    Nenhum exercício no treino <span className="text-blue-400">{selectedDay}</span>
                                </p>
                                <p className="text-slate-500 text-sm text-center max-w-[300px] leading-relaxed">
                                    Selecione exercícios no catálogo acima ou importe uma foto para começar sua rotina.
                                </p>
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-4 w-full max-w-[380px] h-[58px] bg-[#1d70f5] rounded-[18px] flex items-center justify-center gap-2.5 text-white font-bold text-[17px] shadow-[0_8px_24px_rgba(29,112,245,0.35)] transition-all active:scale-[0.98] focus:outline-none"
                            >
                                <ImageIcon size={20} strokeWidth={2.5} />
                                Importar Treino por Foto
                            </button>
                        </div>
                    )}
                </div>

                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={onFileSelected} 
                                    accept="image/*" 
                                    className="hidden" 
                                />

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

            {/* Edit Exercise Detail Modal */}
            {editingExercise && (
                <ExerciseDetailModal
                    exercise={{
                        id: editingExercise.exercicio_id,
                        nome: editingExercise.nome,
                        grupo: editingExercise.grupo || '',
                        subgrupo: null,
                        imagem_url: editingExercise.imagem_url
                    }}
                    selectedDay={selectedDay}
                    currentLength={dayExercises.length}
                    initialValues={{
                        series: editingExercise.series,
                        repeticoes: editingExercise.repeticoes,
                        carga: editingExercise.carga,
                        descanso: editingExercise.descanso,
                        is_pyramid: editingExercise.is_pyramid,
                        pyramid_series: editingExercise.pyramid_series ?? undefined
                    }}
                    isEditing={true}
                    onClose={() => setEditingExercise(null)}
                    onEdited={handleExerciseEdited}
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
            {showDeleteDayModal && (
                <ConfirmDeleteModal
                    title={`Apagar treino ${selectedDay}?`}
                    description={`Todos os ${dayExercises.length} exercícios do dia ${selectedDay} serão removidos. Ao salvar, a exclusão será permanente. Você poderá reimportar por foto ou adicionar manualmente.`}
                    onConfirm={confirmDeleteDay}
                    onCancel={() => setShowDeleteDayModal(false)}
                    confirmText="Apagar tudo"
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
