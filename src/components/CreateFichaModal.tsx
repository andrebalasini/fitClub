import { useState, useRef, useEffect } from 'react';
import { X, Loader2, Plus, PenLine, ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/auth';
import { processWorkoutImage } from '../lib/gemini';
import { showToast } from '../components/Toast';

interface CreateFichaModalProps {
    onClose: () => void;
    onCreated: (fichaId: string, fichaNome: string) => void;
}

export function CreateFichaModal({ onClose, onCreated }: CreateFichaModalProps) {
    const [nome, setNome] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const [isImportingImage, setIsImportingImage] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importStatus, setImportStatus] = useState('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const progressIntervalRef = useRef<number | null>(null);

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, []);

    const handleCreateBlank = async () => {
        if (!nome.trim()) return;
        setIsSaving(true);
        const { error, data } = await supabase
            .from('tbFichas')
            .insert({ nome: nome.trim(), user_id: getCurrentUserId() })
            .select()
            .single();

        setIsSaving(false);
        if (!error && data) {
            onCreated(data.id, data.nome);
        } else {
            showToast('Erro ao criar a ficha.', 'error');
        }
    };

    const handleImageUploadAsync = async (file: File) => {
        if (!nome.trim()) {
            showToast('Informe um nome para a ficha primeiro!', 'error');
            return;
        }

        setIsImportingImage(true);
        setImportProgress(5);
        setImportStatus('Lendo formato da imagem...');

        // Start progressive fake loading up to 85%
        progressIntervalRef.current = window.setInterval(() => {
            setImportProgress(prev => {
                if (prev >= 85) {
                    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                    return 85;
                }
                // slowly increment
                return prev + (Math.random() * 3 + 1);
            });
        }, 300);

        try {
            // 1. Fetch available exercises to match IDs
            const { data: exData, error: exError } = await supabase
                .from('tbExercicios')
                .select('id, nome');
            
            if (exError || !exData || exData.length === 0) {
                throw new Error("Não foi possível carregar a base de exercícios.");
            }

            // 2. Base64 conversion
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onload = () => {
                    const dataUrl = reader.result as string;
                    // Extract just the base64 part
                    const base64 = dataUrl.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = error => reject(error);
            });
            reader.readAsDataURL(file);
            const base64Data = await base64Promise;
            
            setImportStatus('Analisando exercícios com Inteligência Artificial...');

            // 3. Process with Gemini
            const parsedExercises = await processWorkoutImage(base64Data, file.type, exData);

            // Jump to 90% once AI answers
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            setImportProgress(90);
            setImportStatus('Criando a ficha no banco de dados...');

            // 4. Create Ficha
            const { data: fichaData, error: fichaError } = await supabase
                .from('tbFichas')
                .insert({ nome: nome.trim(), user_id: getCurrentUserId() })
                .select()
                .single();

            if (fichaError || !fichaData) throw new Error("Erro ao criar ficha no banco de dados.");

            // 5. Insert Exercises
            if (parsedExercises.length > 0) {
                const insertPayload = parsedExercises.map((e, index) => ({
                    ficha_id: fichaData.id,
                    user_id: getCurrentUserId(),
                    exercicio_id: e.exercicio_id,
                    dia: e.dia,
                    series: e.series,
                    repeticoes: e.repeticoes,
                    carga: e.carga,
                    descanso: e.descanso,
                    ordem: index
                }));

                const { error: insertError } = await supabase.from('tbTreinos').insert(insertPayload);
                if (insertError) {
                    console.error("Erro insert treinos", insertError);
                    showToast("Ficha criada com alertas. Alguns exercícios não puderam ser adicionados.", 'error');
                } else {
                    showToast("Treino importado com sucesso via foto!", 'success');
                }
            } else {
                showToast("Nenhum exercício compreendido pela IA. Ficha criada em branco.", 'error');
            }

            setImportProgress(100);
            setImportStatus('Ficha importada com sucesso!');

            // Tiny delay to let user see 100% completion bar
            await new Promise(r => setTimeout(r, 600));

            // Finalize
            onCreated(fichaData.id, fichaData.nome);

        } catch (error: any) {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            console.error('API/Image Error:', error);
            const msg = error.message || "Falha ao importar treino. Verifique console para detalhes.";
            // If API key is missing, alert nicely
            if (msg.includes("VITE_GEMINI_API_KEY")) {
                showToast("Chave da API Gemini não configurada em .env.local.", 'error');
            } else {
                showToast(msg, 'error');
            }
            setIsImportingImage(false);
            setImportProgress(0);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleImageUploadAsync(file);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
                onClick={!isImportingImage ? onClose : undefined}
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
                    disabled={isImportingImage}
                    className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
                >
                    <X size={18} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex flex-shrink-0 items-center justify-center text-blue-400">
                        <PenLine size={20} />
                    </div>
                    <h2 className="text-white font-bold text-xl leading-tight">
                        Nova Ficha de Treino
                    </h2>
                </div>

                {/* Content */}
                {isImportingImage ? (
                    <div className="flex flex-col items-center justify-center py-6 animate-[fadeIn_300ms_ease-out]">
                        <div className="relative w-28 h-28 mb-6">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle 
                                    cx="56" cy="56" r="52" 
                                    stroke="currentColor" strokeWidth="6" fill="none" 
                                    className="text-[#0f141e]" 
                                />
                                <circle 
                                    cx="56" cy="56" r="52" 
                                    stroke="currentColor" strokeWidth="6" fill="none" 
                                    className="text-blue-500 transition-all duration-300 ease-out" 
                                    strokeDasharray="326.72" 
                                    strokeDashoffset={326.72 - (326.72 * importProgress) / 100} 
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-white font-bold text-2xl">{Math.round(importProgress)}%</span>
                            </div>
                        </div>
                        <h3 className="text-white font-bold text-[17px] mb-2 text-center px-4">{importStatus}</h3>
                        <p className="text-slate-400 text-sm text-center px-6 leading-relaxed">
                            Por favor, não feche o aplicativo enquanto estamos configurando a sua ficha completa.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Input Field */}
                        <div className="flex flex-col gap-2.5 mt-2 mb-6">
                            <label htmlFor="ficha-name" className="text-slate-300 text-[15px] font-medium ml-1">
                                Nome da ficha <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="ficha-name"
                                type="text"
                                autoFocus
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                placeholder="Ex: Treino de Hipertrofia 1"
                                className="w-full bg-[#0f141e] text-white rounded-xl px-4 py-3.5 outline-none border border-transparent focus:border-blue-500/50 transition-all placeholder:text-slate-500 text-[16px]"
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest pl-1 mb-1">Como deseja criar?</span>
                            
                            {/* Create Blank */}
                            <button
                                onClick={handleCreateBlank}
                                disabled={isSaving || !nome.trim()}
                                className="w-full py-4 rounded-xl bg-[#1d70f5] text-white font-bold text-[15px] flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-[0_0_20px_rgba(29,112,245,0.15)] group relative overflow-hidden flex-shrink-0"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Criando ficha...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                        Criar ficha em branco
                                    </>
                                )}
                            </button>

                            {/* Import from Image */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isSaving || !nome.trim()}
                                className="w-full py-4 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 group relative flex-shrink-0"
                            >
                                <ImageIcon size={18} className="text-blue-400" />
                                Importar Ficha de uma Imagem
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={onFileSelected} 
                                accept="image/*" 
                                className="hidden" 
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
