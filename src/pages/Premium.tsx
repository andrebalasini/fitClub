import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/auth';
import {
    Trophy, TrendingUp, Loader2, Search, Users, Dumbbell,
    ChevronDown, Award, BarChart2, Star, Target, Zap, MapPin, Building,
    Medal, Layers
} from 'lucide-react';
// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
    user_id: string;
    nome: string;
    cidade: string;
    academia: string | null;
    peso: number | null;
    total_pontos: number;
    total_treinos: number;
    avatar_url: string;
}

interface ExerciseOption {
    exercicio_id: string;
    nome: string;
    grupo: string;
}

interface HistoryPoint {
    date: string;
    dateLabel: string;
    bestSetCarga: number;
    bestSetReps: number;
}

interface TopEntry {
    user_id: string;
    nome: string;
    score: number;
}

interface CommunityStats {
    avg_carga: number;
    avg_reps: number;
    total_users: number;
    top_carga: TopEntry[];
    top_volume: TopEntry[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const WEIGHT_FILTERS = [
    { label: 'Todos os pesos', value: null },
    { label: 'Até 70kg', value: [0, 70] as [number, number] },
    { label: '70 – 90kg', value: [70, 90] as [number, number] },
    { label: '90kg+', value: [90, 999] as [number, number] },
];

// ─── Mini Chart ───────────────────────────────────────────────────────────────

function MiniLineChart({ data, isWeightBased }: { data: HistoryPoint[]; isWeightBased: boolean }) {
    const [hovered, setHovered] = useState<number | null>(null);

    const vals = data.map(d => isWeightBased ? d.bestSetCarga : d.bestSetReps);
    const maxVal = Math.max(...vals, 1) * 1.1;
    const getY = (v: number) => 100 - (v / maxVal) * 100;
    const getX = (i: number) => data.length > 1 ? (i / (data.length - 1)) * 100 : 50;

    let svgPath = '';
    if (data.length === 1) {
        svgPath = `M 0 ${getY(vals[0])} L 100 ${getY(vals[0])}`;
    } else {
        svgPath = `M ${getX(0)} ${getY(vals[0])}`;
        for (let i = 0; i < data.length - 1; i++) {
            const x0 = getX(i); const y0 = getY(vals[i]);
            const x1 = getX(i + 1); const y1 = getY(vals[i + 1]);
            svgPath += ` C ${x0 + (x1 - x0) / 2} ${y0}, ${x0 + (x1 - x0) / 2} ${y1}, ${x1} ${y1}`;
        }
    }

    return (
        <div className="relative w-full h-[180px] flex pb-8 pl-10 pr-4 select-none touch-none">
            {/* Y axis */}
            <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-slate-500 text-[11px] font-medium text-right pr-2">
                <span>{Math.round(maxVal)}</span>
                <span>{Math.round(maxVal / 2)}</span>
                <span>0</span>
            </div>
            <div className="relative w-full h-full border-l border-b border-slate-700/50">
                <svg className="absolute inset-0 overflow-visible pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100" width="100%" height="100%">
                    <linearGradient id="premGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                    <path d={`${svgPath} L 100 100 L 0 100 Z`} fill="url(#premGrad)" vectorEffect="non-scaling-stroke" />
                    <path d={svgPath} fill="none" stroke="#3b82f6" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {data.map((d, i) => {
                    const x = getX(i); const y = getY(vals[i]);
                    const isTop = vals[i] === Math.max(...vals);
                    const isHov = hovered === i;
                    return (
                        <div
                            key={i}
                            className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center cursor-pointer z-10"
                            style={{ left: `${x}%`, top: `${y}%` }}
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)}
                            onTouchStart={() => setHovered(i)}
                        >
                            <div className={`w-[9px] h-[9px] rounded-full bg-[#121825] border-[2.5px] transition-all ${isTop ? 'border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.8)] scale-125' : 'border-blue-500'}`} />
                            {isHov && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#0f141e] text-white text-xs font-bold py-2 px-3 rounded-lg border border-white/10 shadow-xl whitespace-nowrap flex gap-2 items-center pointer-events-none">
                                    <span className="text-slate-400">{d.dateLabel}</span>
                                    {isWeightBased && <><span className="w-px h-3.5 bg-white/10" /><span className="text-blue-400">{d.bestSetCarga}kg</span></>}
                                    <span className="w-px h-3.5 bg-white/10" />
                                    <span className="text-slate-200">{d.bestSetReps} reps</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {/* X axis labels */}
            <div className="absolute left-10 right-4 bottom-1 flex justify-between pointer-events-none">
                {data.length > 0 && <span className="text-slate-500 text-[11px]">{data[0].dateLabel}</span>}
                {data.length > 2 && <span className="text-slate-500 text-[11px] absolute left-1/2 -translate-x-1/2">{data[Math.floor(data.length / 2)].dateLabel}</span>}
                {data.length > 1 && <span className="text-slate-500 text-[11px]">{data[data.length - 1].dateLabel}</span>}
            </div>
        </div>
    );
}

// ─── Leaderboard Section ──────────────────────────────────────────────────────

function TemporadaSection() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCity, setFilterCity] = useState('');
    const [filterAcademia, setFilterAcademia] = useState('');
    const [filterWeightIdx, setFilterWeightIdx] = useState(0);
    const [cities, setCities] = useState<string[]>([]);
    const [academias, setAcademias] = useState<string[]>([]);
    const [myUserId, setMyUserId] = useState<string | null>(null);

    useEffect(() => {
        setMyUserId(getCurrentUserId());
    }, []);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const res = await supabase.rpc('leaderboard_temporada' as any);
                const data = res.data;
                const error = res.error;

                if (data && !error) {
                    setLeaderboard(data);
                    const uniqueCities = [...new Set(data.map((e: any) => e.cidade).filter(Boolean))];
                    const uniqueAcademias = [...new Set(data.map((e: any) => e.academia).filter(Boolean) as string[])];
                    setCities(uniqueCities as string[]);
                    setAcademias(uniqueAcademias as string[]);
                } else {
                    console.error("RPC Error:", error);
                    // Fallback: manual query if RPC not available
                    const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, nome, cidade, academia, peso, avatar_url');
                    const { data: points, error: ptErr } = await supabase.from('tbFitPoints').select('user_id, pontos');
                    const { data: treinos, error: trErr } = await supabase.from('tbTreinosCompletos').select('user_id');

                    if (profiles && points) {
                        const pointsMap: Record<string, number> = {};
                        const trainMap: Record<string, number> = {};
                        points.forEach((p: any) => { pointsMap[p.user_id] = (pointsMap[p.user_id] || 0) + p.pontos; });
                        treinos?.forEach((t: any) => { trainMap[t.user_id] = (trainMap[t.user_id] || 0) + 1; });

                        const entries: LeaderboardEntry[] = profiles.map((p: any) => ({
                            user_id: p.id,
                            nome: p.nome || 'Atleta',
                            cidade: p.cidade || '',
                            academia: p.academia || null,
                            peso: p.peso || null,
                            total_pontos: pointsMap[p.id] || 0,
                            total_treinos: trainMap[p.id] || 0,
                            avatar_url: p.avatar_url || '',
                        })).sort((a, b) => b.total_pontos - a.total_pontos);

                        setLeaderboard(entries);

                        const uniqueCities = [...new Set(entries.map(e => e.cidade).filter(Boolean))];
                        const uniqueAcademias = [...new Set(entries.map(e => e.academia).filter(Boolean) as string[])];
                        setCities(uniqueCities as string[]);
                        setAcademias(uniqueAcademias as string[]);
                    } else {
                        console.error("Fallback errors:", pErr, ptErr, trErr);
                    }
                }
            } catch (err) {
                console.error("Error in load():", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const filtered = useMemo(() => {
        const w = WEIGHT_FILTERS[filterWeightIdx].value;
        return leaderboard.filter(e => {
            if (filterCity && e.cidade !== filterCity) return false;
            if (filterAcademia && e.academia !== filterAcademia) return false;
            if (w && e.peso !== null) {
                const [min, max] = w;
                if (e.peso < min || e.peso > max) return false;
            }
            return true;
        });
    }, [leaderboard, filterCity, filterAcademia, filterWeightIdx]);

    const myEntry = leaderboard.find(e => e.user_id === myUserId);
    const myRank = leaderboard.findIndex(e => e.user_id === myUserId) + 1;

    const medalLabels = ['🥇', '🥈', '🥉'];

    return (
        <div className="flex flex-col gap-4">
            {/* My Rank Card */}
            {myEntry && (
                <div className="relative rounded-2xl overflow-hidden p-4 flex items-center gap-4"
                    style={{ background: 'linear-gradient(135deg, #1a2744 0%, #0f1a30 100%)', border: '1px solid rgba(77,159,255,0.2)' }}>
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 overflow-hidden flex items-center justify-center flex-shrink-0 z-10">
                        {myEntry.avatar_url ? (
                            <img src={myEntry.avatar_url} alt={myEntry.nome} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-blue-400 font-black text-xl">{myEntry.nome.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 z-10">
                        <p className="text-white font-bold text-base leading-tight truncate">{myEntry.nome}</p>
                        <p className="text-slate-400 text-xs font-medium mt-0.5">Sua posição na temporada</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 z-10 flex-shrink-0">
                        <span className="text-white font-black text-2xl leading-none tracking-tight">#{myRank}</span>
                        <span className="text-blue-400 text-xs font-bold">{myEntry.total_pontos.toLocaleString()} pts</span>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col gap-2">
                {/* City filter */}
                {cities.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                        <button
                            onClick={() => setFilterCity('')}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${!filterCity ? 'bg-blue-500 text-white' : 'bg-[#1a2235] text-slate-400 border border-slate-700/50'}`}
                        >
                            <MapPin size={12} /> Todas cidades
                        </button>
                        {cities.map(c => (
                            <button key={c}
                                onClick={() => setFilterCity(filterCity === c ? '' : c)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${filterCity === c ? 'bg-blue-500 text-white' : 'bg-[#1a2235] text-slate-400 border border-slate-700/50'}`}
                            >{c}</button>
                        ))}
                    </div>
                )}

                {/* Academia filter */}
                {academias.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                        <button
                            onClick={() => setFilterAcademia('')}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${!filterAcademia ? 'bg-purple-500 text-white' : 'bg-[#1a2235] text-slate-400 border border-slate-700/50'}`}
                        >
                            <Building size={12} /> Todas academias
                        </button>
                        {academias.map(a => (
                            <button key={a}
                                onClick={() => setFilterAcademia(filterAcademia === a ? '' : a)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${filterAcademia === a ? 'bg-purple-500 text-white' : 'bg-[#1a2235] text-slate-400 border border-slate-700/50'}`}
                            >{a}</button>
                        ))}
                    </div>
                )}

                {/* Weight filter */}
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                    {WEIGHT_FILTERS.map((f, i) => (
                        <button key={i}
                            onClick={() => setFilterWeightIdx(i)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${filterWeightIdx === i ? 'bg-emerald-500 text-white' : 'bg-[#1a2235] text-slate-400 border border-slate-700/50'}`}
                        >{f.label}</button>
                    ))}
                </div>
            </div>

            {/* Leaderboard List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={28} className="text-blue-500 animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                    <Users size={32} className="text-slate-600 mb-3" />
                    <p className="text-slate-400 text-sm font-medium">Nenhum atleta encontrado</p>
                    <p className="text-slate-600 text-xs mt-1">Tente mudar os filtros</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {filtered.slice(0, 10).map((entry, idx) => {
                        const isMe = entry.user_id === myUserId;
                        const isMedal = idx < 3;
                        return (
                            <div
                                key={entry.user_id}
                                className={`relative flex items-center gap-3 p-3.5 rounded-2xl transition-all ${isMe ? 'ring-1 ring-blue-500/50' : ''}`}
                                style={{
                                    background: isMedal
                                        ? `linear-gradient(135deg, rgba(${idx === 0 ? '245,197,24' : idx === 1 ? '148,163,184' : '205,127,50'},0.08) 0%, rgba(15,20,30,0.95) 100%)`
                                        : isMe ? 'rgba(29,99,255,0.08)' : 'rgba(26,34,53,0.6)',
                                    border: `1px solid ${isMedal ? `rgba(${idx === 0 ? '245,197,24' : idx === 1 ? '148,163,184' : '205,127,50'},0.2)` : isMe ? 'rgba(29,99,255,0.3)' : 'rgba(255,255,255,0.04)'}`,
                                }}
                            >
                                {/* Rank */}
                                <div className="w-8 flex items-center justify-center flex-shrink-0">
                                    {isMedal ? (
                                        <span className="text-xl">{medalLabels[idx]}</span>
                                    ) : (
                                        <span className="text-slate-500 font-black text-sm">#{idx + 1}</span>
                                    )}
                                </div>

                                {/* Avatar */}
                                <div
                                    className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 font-black text-base"
                                    style={{
                                        background: isMe ? 'rgba(29,99,255,0.2)' : 'rgba(255,255,255,0.05)',
                                        color: isMe ? '#60a5fa' : '#94a3b8',
                                        border: isMe ? '1.5px solid rgba(29,99,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
                                    }}
                                >
                                    {entry.avatar_url ? (
                                        <img src={entry.avatar_url} alt={entry.nome} className="w-full h-full object-cover" />
                                    ) : (
                                        entry.nome.charAt(0).toUpperCase()
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`font-bold text-[14px] truncate ${isMe ? 'text-blue-300' : 'text-white'}`}>
                                            {entry.nome}
                                        </span>
                                        {isMe && <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-1.5 py-0.5 rounded-full">Você</span>}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {entry.cidade && <span className="text-slate-500 text-[11px] font-medium">{entry.cidade}</span>}
                                        {entry.academia && <><span className="text-slate-700 text-[11px]">•</span><span className="text-slate-500 text-[11px] font-medium truncate">{entry.academia}</span></>}
                                    </div>
                                </div>

                                {/* Points */}
                                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                    <span className={`font-black text-[17px] leading-none ${isMedal && idx === 0 ? 'text-yellow-400' : isMedal && idx === 1 ? 'text-slate-300' : isMedal ? 'text-orange-400' : isMe ? 'text-blue-400' : 'text-white'}`}>
                                        {entry.total_pontos.toLocaleString()}
                                    </span>
                                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">fitPoints</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Progress Section ─────────────────────────────────────────────────────────

function ProgressoSection() {
    const [myExercises, setMyExercises] = useState<ExerciseOption[]>([]);
    const [selectedEx, setSelectedEx] = useState<ExerciseOption | null>(null);
    const [search, setSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [history, setHistory] = useState<HistoryPoint[]>([]);
    const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingExercises, setLoadingExercises] = useState(true);

    const myUserId = getCurrentUserId();

    // Load exercises the user has performed
    useEffect(() => {
        async function load() {
            setLoadingExercises(true);
            const { data } = await supabase
                .from('tbHistorico')
                .select('exercicio_id, tbExercicios:exercicio_id(nome, grupo)')
                .eq('user_id', myUserId);

            if (data) {
                const seen = new Set<string>();
                const exList: ExerciseOption[] = [];
                data.forEach((r: any) => {
                    if (!seen.has(r.exercicio_id) && r.tbExercicios) {
                        seen.add(r.exercicio_id);
                        exList.push({ exercicio_id: r.exercicio_id, nome: r.tbExercicios.nome, grupo: r.tbExercicios.grupo });
                    }
                });
                exList.sort((a, b) => a.nome.localeCompare(b.nome));
                setMyExercises(exList);
            }
            setLoadingExercises(false);
        }
        load();
    }, []);

    // Load exercise history + community stats when exercise selected
    const loadExerciseData = useCallback(async (ex: ExerciseOption) => {
        setLoading(true);
        setHistory([]);
        setCommunityStats(null);

        // My history
        const { data: myHist } = await supabase
            .from('tbHistorico')
            .select('created_at, repeticoes_feitas, carga_usada')
            .eq('user_id', myUserId)
            .eq('exercicio_id', ex.exercicio_id)
            .order('created_at', { ascending: true });

        if (myHist) {
            const grouped: Record<string, { bestSetCarga: number; bestSetReps: number }> = {};
            myHist.forEach((r: any) => {
                const dateKey = r.created_at.split('T')[0];
                if (!grouped[dateKey]) grouped[dateKey] = { bestSetCarga: 0, bestSetReps: 0 };
                const isBetter = r.carga_usada > grouped[dateKey].bestSetCarga
                    || (r.carga_usada === grouped[dateKey].bestSetCarga && r.repeticoes_feitas > grouped[dateKey].bestSetReps);
                if (isBetter) {
                    grouped[dateKey].bestSetCarga = parseFloat(r.carga_usada);
                    grouped[dateKey].bestSetReps = r.repeticoes_feitas;
                }
            });
            const points = Object.entries(grouped).map(([date, v]) => ({
                date,
                dateLabel: formatDate(date),
                bestSetCarga: v.bestSetCarga,
                bestSetReps: v.bestSetReps,
            }));
            setHistory(points);
        }

        // Community stats via RPC (bypasses RLS to get aggregated data safely)
        const { data: commData } = await supabase.rpc('community_exercise_stats' as any, {
            p_exercicio_id: ex.exercicio_id,
            p_user_id: myUserId,
        });

        if (commData && commData.total_users > 0) {
            setCommunityStats({
                avg_carga: commData.avg_carga,
                avg_reps: commData.avg_reps,
                total_users: commData.total_users,
                top_carga: commData.top_carga || [],
                top_volume: commData.top_volume || [],
            });
        }

        setLoading(false);
    }, [myUserId]);

    const filteredExercises = useMemo(() =>
        myExercises.filter(e => e.nome.toLowerCase().includes(search.toLowerCase())),
        [myExercises, search]
    );

    const isWeightBased = history.some(h => h.bestSetCarga > 0);
    const myBest = history.length > 0 ? Math.max(...history.map(h => isWeightBased ? h.bestSetCarga : h.bestSetReps)) : 0;
    const myLast = history.length > 0 ? (isWeightBased ? history[history.length - 1].bestSetCarga : history[history.length - 1].bestSetReps) : 0;

    const commVal = communityStats ? (isWeightBased ? communityStats.avg_carga : communityStats.avg_reps) : null;
    const compareMax = commVal ? Math.max(myBest, commVal) * 1.1 : myBest * 1.1;
    const myPct = compareMax > 0 ? (myBest / compareMax) * 100 : 0;
    const commPct = commVal && compareMax > 0 ? (commVal / compareMax) * 100 : 0;

    return (
        <div className="flex flex-col gap-4">
            {/* Exercise Selector */}
            <div className="relative">
                <div
                    className="flex items-center gap-3 bg-[#1a2235] border border-slate-700/50 rounded-xl px-4 py-3 cursor-pointer active:scale-[0.99] transition-all"
                    onClick={() => setShowDropdown(v => !v)}
                >
                    <Dumbbell size={18} className="text-slate-400 flex-shrink-0" />
                    <span className={`flex-1 text-[14px] font-medium truncate ${selectedEx ? 'text-white' : 'text-slate-500'}`}>
                        {selectedEx ? selectedEx.nome : 'Selecione um exercício'}
                    </span>
                    {selectedEx && <span className="text-[10px] text-blue-400 font-bold uppercase bg-blue-500/10 px-2 py-0.5 rounded-full flex-shrink-0">{selectedEx.grupo}</span>}
                    <ChevronDown size={16} className={`text-slate-400 transition-transform flex-shrink-0 ${showDropdown ? 'rotate-180' : ''}`} />
                </div>

                {showDropdown && (
                    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-[#131b2b] border border-slate-700/50 rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
                        <div className="p-2 border-b border-slate-700/30">
                            <div className="flex items-center gap-2 bg-[#0f141e] rounded-lg px-3 py-2">
                                <Search size={14} className="text-slate-500" />
                                <input
                                    autoFocus
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Buscar exercício..."
                                    className="bg-transparent text-white text-sm flex-1 outline-none placeholder:text-slate-600"
                                />
                            </div>
                        </div>
                        {loadingExercises ? (
                            <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-blue-500 animate-spin" /></div>
                        ) : filteredExercises.length === 0 ? (
                            <div className="py-8 text-center text-slate-500 text-sm">Nenhum encontrado</div>
                        ) : (
                            <div className="max-h-[240px] overflow-y-auto">
                                {filteredExercises.map(ex => (
                                    <button
                                        key={ex.exercicio_id}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left active:scale-[0.99]"
                                        onClick={() => {
                                            setSelectedEx(ex);
                                            setShowDropdown(false);
                                            setSearch('');
                                            loadExerciseData(ex);
                                        }}
                                    >
                                        <span className="text-white text-[13px] font-medium flex-1 truncate">{ex.nome}</span>
                                        <span className="text-slate-500 text-[11px] font-medium flex-shrink-0">{ex.grupo}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Results */}
            {!selectedEx && !loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <BarChart2 size={40} className="text-slate-700 mb-3" />
                    <p className="text-slate-400 text-sm font-medium">Selecione um exercício</p>
                    <p className="text-slate-600 text-xs mt-1 max-w-[240px]">Escolha um exercício para ver sua evolução e comparar com a comunidade</p>
                </div>
            )}

            {selectedEx && loading && (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={28} className="text-blue-500 animate-spin" />
                </div>
            )}

            {selectedEx && !loading && (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: 'Melhor', value: isWeightBased ? `${myBest}kg` : `${myBest} reps`, icon: <Trophy size={14} className="text-yellow-400" /> },
                            { label: 'Última', value: isWeightBased ? `${myLast}kg` : `${myLast} reps`, icon: <Zap size={14} className="text-blue-400" /> },
                            { label: 'Sessões', value: `${history.length}`, icon: <Target size={14} className="text-purple-400" /> },
                        ].map(stat => (
                            <div key={stat.label} className="bg-[#1a2235] border border-slate-700/30 rounded-xl p-3 flex flex-col items-center gap-1.5">
                                {stat.icon}
                                <span className="text-white font-black text-[15px] leading-none">{stat.value}</span>
                                <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">{stat.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Chart */}
                    {history.length > 0 ? (
                        <div className="bg-[#1a2235] border border-slate-700/30 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-slate-300 text-sm font-bold">Evolução — {isWeightBased ? 'Carga (kg)' : 'Repetições'}</span>
                                <span className="text-slate-500 text-[11px] font-medium">{history.length} sessão{history.length !== 1 ? 'ões' : ''}</span>
                            </div>
                            <MiniLineChart data={history} isWeightBased={isWeightBased} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 bg-[#1a2235] border border-slate-700/30 rounded-2xl">
                            <TrendingUp size={28} className="text-slate-600 mb-2" />
                            <p className="text-slate-500 text-sm">Sem histórico disponível</p>
                        </div>
                    )}

                    {/* Community Comparison */}
                    <div className="bg-[#1a2235] border border-slate-700/30 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Users size={16} className="text-slate-400" />
                                <span className="text-slate-300 text-sm font-bold">Você vs Comunidade</span>
                            </div>
                            {communityStats && (
                                <span className="text-slate-500 text-[11px] font-medium">{communityStats.total_users} atleta{communityStats.total_users !== 1 ? 's' : ''}</span>
                            )}
                        </div>

                        {communityStats ? (
                            <div className="flex flex-col gap-3">
                                {/* My bar */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-blue-400 text-xs font-bold">Você</span>
                                        <span className="text-white text-xs font-black">{isWeightBased ? `${myBest}kg` : `${myBest} reps`}</span>
                                    </div>
                                    <div className="h-2.5 bg-[#0f141e] rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700"
                                            style={{ width: `${myPct}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Community bar */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400 text-xs font-bold">Média da comunidade</span>
                                        <span className="text-slate-300 text-xs font-black">{isWeightBased ? `${communityStats.avg_carga.toFixed(1)}kg` : `${communityStats.avg_reps.toFixed(0)} reps`}</span>
                                    </div>
                                    <div className="h-2.5 bg-[#0f141e] rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-slate-600 to-slate-400 transition-all duration-700"
                                            style={{ width: `${commPct}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Comparison label */}
                                {myBest > 0 && commVal && commVal > 0 && (
                                    <div className={`mt-1 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg ${myBest >= commVal ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                        {myBest >= commVal ? (
                                            <><Star size={12} /> Você está {((myBest / commVal - 1) * 100).toFixed(0)}% acima da média!</>
                                        ) : (
                                            <><TrendingUp size={12} /> {((commVal / myBest - 1) * 100).toFixed(0)}% abaixo da média — continue evoluindo!</>
                                        )}
                                    </div>
                                )}

                                {/* Top 3 Leaders */}
                                {communityStats.top_carga && communityStats.top_carga.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-col gap-4">
                                        {/* Top Carga */}
                                        <div className="flex flex-col gap-2">
                                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><Medal size={14} className="text-yellow-500" /> Top Carga Máxima</span>
                                            <div className="flex flex-col gap-1.5">
                                                {communityStats.top_carga.map((user, idx) => (
                                                    <div key={user.user_id} className={`flex items-center justify-between p-2 rounded-lg ${user.user_id === myUserId ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-slate-800/30'}`}>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-xs font-black min-w-[20px] text-center ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-slate-300' : 'text-amber-600'}`}>{idx + 1}º</span>
                                                            <span className={`text-sm font-medium ${user.user_id === myUserId ? 'text-blue-400 font-bold' : 'text-slate-300'}`}>{user.user_id === myUserId ? 'Você' : user.nome}</span>
                                                        </div>
                                                        <span className="text-white text-sm font-black">{isWeightBased ? `${user.score}kg` : `${user.score} reps`}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Top Volume */}
                                        {isWeightBased && communityStats.top_volume && communityStats.top_volume.length > 0 && (
                                            <div className="flex flex-col gap-2">
                                                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><Layers size={14} className="text-purple-400" /> Top Volume Total</span>
                                                <div className="flex flex-col gap-1.5">
                                                    {communityStats.top_volume.map((user, idx) => (
                                                        <div key={user.user_id} className={`flex items-center justify-between p-2 rounded-lg ${user.user_id === myUserId ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-slate-800/30'}`}>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-xs font-black min-w-[20px] text-center ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-slate-300' : 'text-amber-600'}`}>{idx + 1}º</span>
                                                                <span className={`text-sm font-medium ${user.user_id === myUserId ? 'text-blue-400 font-bold' : 'text-slate-300'}`}>{user.user_id === myUserId ? 'Você' : user.nome}</span>
                                                            </div>
                                                            <span className="text-white text-sm font-black">{Intl.NumberFormat('pt-BR').format(user.score)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center py-6 text-center">
                                <Users size={24} className="text-slate-700 mb-2" />
                                <p className="text-slate-500 text-sm">Ainda sem dados da comunidade</p>
                                <p className="text-slate-600 text-xs mt-0.5">Este exercício ainda não foi registrado por outros atletas</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'temporada' | 'progresso';

export function Premium() {
    const [activeTab, setActiveTab] = useState<Tab>('temporada');

    return (
        <div className="w-full flex flex-col font-sans" style={{ background: '#0f141e' }}>
            {/* Hero header */}
            <div className="px-4 pt-6 pb-2 relative overflow-hidden">
                <div>
                    <h1 className="text-white font-black text-[22px] leading-tight tracking-[-0.3px]">Experiência Premium</h1>
                    <p className="text-slate-400 text-xs font-medium">Temporada 1 · Ranking & Progresso</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-4 mb-4">
                <div className="flex bg-[#131b2b] rounded-xl p-1 border border-slate-700/30">
                    {([
                        { key: 'temporada', label: 'Temporada', icon: <Award size={14} /> },
                        { key: 'progresso', label: 'Meu Progresso', icon: <BarChart2 size={14} /> },
                    ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all active:scale-[0.98] ${activeTab === tab.key ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-4">
                {activeTab === 'temporada' ? <TemporadaSection /> : <ProgressoSection />}
            </div>
        </div>
    );
}
