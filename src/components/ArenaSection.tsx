import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Flame, Trophy, Play, Heart, MessageCircle, X, Upload, AlertTriangle, Dumbbell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from './Toast';

const EXERCISES = [
    { id: 'supino-reto', name: 'Supino Reto', icon: Dumbbell },
    { id: 'agachamento-livre', name: 'Agachamento Livre', icon: Dumbbell },
    { id: 'levantamento-terra', name: 'Levantamento Terra', icon: Dumbbell },
    { id: 'leg-press-45', name: 'Leg Press 45°', icon: Dumbbell },
    { id: 'desenvolvimento-militar', name: 'Desenvolvimento Militar', icon: Dumbbell },
    { id: 'remada-curvada', name: 'Remada Curvada', icon: Dumbbell }
];

interface RecordData {
    id: string;
    exercise_name: string;
    user_id: string;
    carga: number;
    video_url: string;
    status: 'top_fit' | 'challenger';
    likes: number;
    created_at: string;
    user_name?: string;
    user_avatar?: string;
}

interface CommentData {
    id: string;
    content: string;
    created_at: string;
    user_name: string;
    user_avatar: string;
}

function ArenaDetailModal({ exerciseName, onClose }: { exerciseName: string, onClose: () => void }) {
    const { user } = useAuth();
    const [records, setRecords] = useState<RecordData[]>([]);
    const [comments, setComments] = useState<CommentData[]>([]);
    const [newComment, setNewComment] = useState('');
    const [, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [cargaInput, setCargaInput] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        // Load Records
        const { data: recs } = await supabase
            .from('tbArenaRecords')
            .select(`
                *,
                user:profiles!user_id ( id, nome, avatar_url )
            `)
            .eq('exercise_name', exerciseName)
            .order('likes', { ascending: false });

        if (recs) {
            // Map the joined profile data
            const mapped = recs.map(r => ({
                ...r,
                user_name: r.user?.nome || 'Atleta',
                user_avatar: r.user?.avatar_url
            }));
            
            // Re-sort: top_fit first, then challengers by likes
            mapped.sort((a, b) => {
                if (a.status === 'top_fit' && b.status !== 'top_fit') return -1;
                if (b.status === 'top_fit' && a.status !== 'top_fit') return 1;
                return b.likes - a.likes;
            });
            
            setRecords(mapped);
        }

        // Load Comments
        // Try getting comments for the Top Fit video, or general exercise comments.
        // For simplicity, we can load comments related to the exercise. But the table uses record_id.
        // We'll load comments for the top_fit record if exists.
        const topFit = recs?.find(r => r.status === 'top_fit');
        if (topFit) {
            const { data: comms } = await supabase
                .from('tbArenaComments')
                .select(`
                    *,
                    user:profiles!user_id ( nome, avatar_url )
                `)
                .eq('record_id', topFit.id)
                .order('created_at', { ascending: true });

            if (comms) {
                setComments(comms.map(c => ({
                    id: c.id,
                    content: c.content,
                    created_at: c.created_at,
                    user_name: c.user?.nome || 'Atleta',
                    user_avatar: c.user?.avatar_url
                })));
            }
        }
        
        setLoading(false);
    }, [exerciseName]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleVote = async (recordId: string) => {
        if (!user) return;
        try {
            const { error } = await supabase.rpc('vote_arena_record', {
                p_record_id: recordId,
                p_user_id: user.id
            });
            if (error) throw error;
            showToast('Voto computado! +10 fitPoints para o atleta.', 'success');
            loadData();
        } catch (error: unknown) {
            if (error instanceof Error && error.message.includes('already voted')) {
                showToast('Você já validou este vídeo.', 'error');
            } else {
                showToast('Erro ao computar voto.', 'error');
            }
        }
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newComment.trim()) return;
        const topFit = records.find(r => r.status === 'top_fit');
        if (!topFit) return;

        try {
            await supabase.from('tbArenaComments').insert({
                record_id: topFit.id,
                user_id: user.id,
                content: newComment.trim()
            });
            setNewComment('');
            loadData();
        } catch {
            showToast('Erro ao enviar comentário', 'error');
        }
    };

    const handleUploadChallenge = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        if (file.size > 50 * 1024 * 1024) { // 50MB
            showToast('O vídeo deve ter no máximo 50MB.', 'error');
            return;
        }
        if (!cargaInput) {
            showToast('Por favor, informe a carga levantada.', 'error');
            return;
        }

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('videos')
                .upload(`arena/${fileName}`, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('videos')
                .getPublicUrl(`arena/${fileName}`);

            await supabase.from('tbArenaRecords').insert({
                exercise_name: exerciseName,
                user_id: user.id,
                carga: Number(cargaInput),
                video_url: publicUrl,
                status: 'challenger'
            });

            showToast('Desafio enviado para votação!', 'success');
            setCargaInput('');
            loadData();
        } catch (error) {
            console.error(error);
            showToast('Erro ao fazer upload do vídeo.', 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const topFit = records.find(r => r.status === 'top_fit');
    const challengers = records.filter(r => r.status === 'challenger');

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-[#131b2b] border border-white/10 rounded-2xl shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                        <Flame size={20} />
                    </div>
                    <div>
                        <h2 className="text-white font-black text-lg leading-tight">{exerciseName}</h2>
                        <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Disputa de Trono</span>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-full bg-white/5 text-white hover:bg-white/10 active:scale-95 transition-all">
                    <X size={20} />
                </button>
            </div>

            <div className="flex flex-col gap-6">
                    {/* Top Fit Section */}
                    {topFit ? (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <span className="text-yellow-400 font-black text-sm uppercase tracking-widest flex items-center gap-1.5"><Trophy size={14} /> Atual Top Fit</span>
                                <span className="text-white font-black text-xl tabular-nums bg-white/10 px-3 py-1 rounded-lg">{topFit.carga}kg</span>
                            </div>
                            
                            <div className="relative w-full aspect-[9/16] bg-black rounded-2xl overflow-hidden border-2 border-yellow-500/30">
                                <video src={topFit.video_url} controls playsInline className="w-full h-full object-cover" />
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex flex-col gap-2 pointer-events-none">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border-2 border-yellow-500">
                                            {topFit.user_avatar ? <img src={topFit.user_avatar} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-yellow-500/20" />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-white font-bold text-sm leading-tight drop-shadow-md">{topFit.user_name}</span>
                                            <span className="text-yellow-400 text-[10px] font-black uppercase drop-shadow-md">👑 Rei da Carga</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                        <button onClick={(e) => { e.preventDefault(); handleVote(topFit.id); }} className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full pointer-events-auto active:scale-95 transition-transform">
                                            <Heart size={14} className="text-white" />
                                            <span className="text-white font-bold text-xs">{topFit.likes}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Comments */}
                            <div className="mt-4 flex flex-col gap-3">
                                <h3 className="text-slate-300 font-bold text-sm flex items-center gap-1.5"><MessageCircle size={16} /> Comentários da Comunidade</h3>
                                <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-2 rounded-xl border border-white/5 bg-white/5 p-3">
                                    {comments.length === 0 && <span className="text-slate-500 text-xs italic text-center py-2">Seja o primeiro a avaliar a técnica.</span>}
                                    {comments.map(c => (
                                        <div key={c.id} className="flex gap-2">
                                            <div className="w-6 h-6 rounded-full bg-zinc-800 shrink-0 overflow-hidden">
                                                {c.user_avatar ? <img src={c.user_avatar} className="w-full h-full object-cover" /> : null}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-slate-300 text-[11px] font-bold">{c.user_name}</span>
                                                <span className="text-slate-400 text-xs leading-snug">{c.content}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={handleComment} className="flex items-center gap-2">
                                    <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Comente sobre a execução..." className="flex-1 bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500" />
                                    <button type="submit" disabled={!newComment.trim()} className="p-2.5 rounded-xl bg-blue-500 text-white disabled:opacity-50 active:scale-95"><Play size={16} className="fill-current" /></button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 bg-white/5 border border-dashed border-white/10 rounded-2xl gap-3">
                            <Trophy size={48} className="text-slate-600" />
                            <div className="text-center">
                                <span className="text-slate-300 font-bold block">Trono Vazio</span>
                                <span className="text-slate-500 text-xs">Seja o primeiro a enviar seu recorde e reivindicar o posto de Top Fit!</span>
                            </div>
                        </div>
                    )}

                    {/* Challengers Section */}
                    <div className="flex flex-col gap-3 mt-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-1.5"><AlertTriangle size={14} className="text-red-500" /> Desafiantes ({challengers.length})</h3>
                        </div>

                        {challengers.slice(0,3).map(chal => (
                            <div key={chal.id} className="bg-white/5 border border-white/10 rounded-2xl p-3 flex gap-3">
                                <div className="w-16 h-24 rounded-lg bg-black overflow-hidden relative shrink-0">
                                    <video src={chal.video_url} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col justify-between py-1 flex-1">
                                    <div className="flex flex-col">
                                        <span className="text-white font-bold text-sm leading-none">{chal.user_name}</span>
                                        <span className="text-slate-400 text-xs mt-1">Carga: <span className="text-white font-black">{chal.carga}kg</span></span>
                                    </div>
                                    <button onClick={() => handleVote(chal.id)} className="flex items-center justify-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 py-1.5 rounded-lg w-full mt-2 active:scale-95 transition-all">
                                        <Heart size={14} />
                                        <span className="text-xs font-bold">Validar & Votar ({chal.likes})</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {challengers.length === 0 && <span className="text-slate-500 text-xs text-center py-4">Nenhum desafiante na fila.</span>}
                    </div>

                </div>

                {/* Bottom Action */}
                <div className="p-4 bg-[#131b2b] border border-white/10 rounded-2xl shadow-lg mt-2 mb-4">
                    <div className="flex gap-2">
                        <input type="number" placeholder="Carga (kg)" value={cargaInput} onChange={e => setCargaInput(e.target.value)} className="w-24 bg-white/10 border border-white/10 rounded-xl px-3 text-center text-white font-bold placeholder:text-slate-500 focus:outline-none" />
                        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-sm uppercase tracking-widest py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50">
                            {uploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Upload size={18} /> Enviar Desafio</>}
                        </button>
                    </div>
                    <input type="file" accept="video/mp4,video/quicktime,video/webm" ref={fileInputRef} className="hidden" onChange={handleUploadChallenge} />
                </div>
            </div>
    );
}

export function ArenaSection() {
    const [selectedExercise, setSelectedExercise] = useState<{ id: string, name: string } | null>(null);
    const [arenaStats, setArenaStats] = useState<Record<string, { top_fit_name?: string, record_carga?: number, is_disputed: boolean }>>({});

    useEffect(() => {
        async function fetchStats() {
            // Get all Top Fits
            const { data: topFits } = await supabase
                .from('tbArenaRecords')
                .select(`exercise_name, carga, likes, user:profiles!user_id (nome)`)
                .eq('status', 'top_fit');

            // Get challengers to see if they are close (em disputa)
            const { data: challengers } = await supabase
                .from('tbArenaRecords')
                .select('exercise_name, likes')
                .eq('status', 'challenger');

            if (topFits) {
                const statsMap: Record<string, { top_fit_name?: string, record_carga?: number, is_disputed: boolean }> = {};
                topFits.forEach(tf => {
                    const chals = challengers?.filter(c => c.exercise_name === tf.exercise_name) || [];
                    const maxChallengerLikes = Math.max(0, ...chals.map(c => c.likes));
                    const isDisputed = chals.length > 0 && maxChallengerLikes >= (tf.likes * 0.8); // 80% dos likes do rei = em disputa
                    const userProfile = tf.user as { nome?: string } | null;

                    statsMap[tf.exercise_name] = {
                        top_fit_name: userProfile?.nome || 'Anônimo',
                        record_carga: tf.carga,
                        is_disputed: isDisputed
                    };
                });
                setArenaStats(statsMap);
            }
        }
        fetchStats();
    }, []);

    if (selectedExercise) {
        return (
            <div className="pb-8">
                <ArenaDetailModal 
                    exerciseName={selectedExercise.name} 
                    onClose={() => setSelectedExercise(null)} 
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 select-none pb-24 animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <h2 className="text-white font-black text-2xl tracking-tight flex items-center gap-2">
                    <Flame className="text-red-500" size={24} /> ARENA GLOBAL
                </h2>
                <p className="text-slate-400 text-xs font-medium leading-relaxed max-w-[280px]">
                    Disputa por carga bruta. O trono pertence ao mais forte, validado pela comunidade.
                </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 gap-3">
                {EXERCISES.map(ex => {
                    const stats = arenaStats[ex.name];
                    
                    return (
                        <div 
                            key={ex.id}
                            onClick={() => setSelectedExercise(ex)}
                            className="bg-[#131b2b] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden active:scale-95 transition-all cursor-pointer group hover:bg-[#1a2333]"
                        >
                            {/* Em disputa badge */}
                            {stats?.is_disputed && (
                                <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-bl-lg shadow-md z-10 animate-pulse">
                                    Em Disputa
                                </div>
                            )}

                            <div className="flex items-start justify-between">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                                    <ex.icon size={20} className="text-slate-300" />
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-0.5 mt-2">
                                <span className="text-white font-bold text-sm leading-tight line-clamp-1">{ex.name}</span>
                                {stats ? (
                                    <>
                                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-1.5 flex items-center gap-1"><Trophy size={10} className="text-yellow-500" /> {stats.top_fit_name}</span>
                                        <span className="text-white font-black text-lg tabular-nums mt-0.5">{stats.record_carga}kg</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mt-1.5">Trono Vazio</span>
                                        <span className="text-slate-600 font-black text-lg tabular-nums mt-0.5">--</span>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

        </div>
    );
}
