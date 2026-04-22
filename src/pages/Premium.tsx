import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/auth';
import {
    Trophy, TrendingUp, Loader2, Search, Users, Dumbbell,
    ChevronDown, BarChart2, Star, Target, Zap, MapPin,
    Medal, Layers, Crown, Flame, ShoppingBag, Shield
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

function getLeagueInfo(points: number) {
    if (points >= 6000) return { name: 'Elite', color: 'from-purple-500 to-fuchsia-600', min: 6000, max: 6000, next: null };
    if (points >= 3000) return { name: 'Ouro', color: 'from-yellow-400 to-amber-600', min: 3000, max: 6000, next: 6000 };
    if (points >= 1000) return { name: 'Prata', color: 'from-slate-300 to-slate-500', min: 1000, max: 3000, next: 3000 };
    return { name: 'Bronze', color: 'from-orange-600 to-orange-800', min: 0, max: 1000, next: 1000 };
}

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
    const [filterCity] = useState('');
    const [filterAcademia] = useState('');
    const [filterWeightIdx] = useState(0);
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

    const myLeague = myEntry ? getLeagueInfo(myEntry.total_pontos) : null;
    let rival = null;
    if (myEntry) {
        const myIndex = leaderboard.findIndex(e => e.user_id === myUserId);
        if (myIndex > 0) rival = leaderboard[myIndex - 1];
        else if (leaderboard.length > 1) rival = leaderboard[1];
    }

    const podiumTop3 = filtered.slice(0, 3);
    const listTop = filtered.slice(3, 20); // show limited leaders after podium

    return (
        <div className="flex flex-col gap-6">
            {/* Division & Progress */}
            {myEntry && myLeague && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] opacity-70" />
                    <div className="absolute -left-10 bottom-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] opacity-50" />
                    
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${myLeague.color} flex items-center justify-center shadow-lg`}>
                                <Shield className="text-white/90" size={24} />
                            </div>
                            <div>
                                <h3 className="text-white font-black text-lg tracking-tight leading-none drop-shadow-sm">Liga {myLeague.name}</h3>
                                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mt-1">Divisão Atual</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-white font-black text-2xl drop-shadow-md">{myEntry.total_pontos}</span>
                            <span className="text-blue-400 text-xs ml-1 font-bold">FP</span>
                        </div>
                    </div>

                    <div className="relative z-10">
                        <div className="flex justify-between text-[11px] font-bold mb-2">
                            <span className="text-slate-400">{myLeague.min} FP</span>
                            <span className={`text-[#00ff88] drop-shadow-[0_0_5px_rgba(0,255,136,0.5)] ${myLeague.next ? '' : 'hidden'}`}>Subir Divisão: {myLeague.max} FP</span>
                        </div>
                        <div className="h-[14px] bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner p-0.5">
                            <div 
                                className="h-full bg-gradient-to-r from-[#00ff88] to-[#00b8ff] rounded-full relative"
                                style={{ width: `${myLeague.next ? Math.max(5, ((myEntry.total_pontos - myLeague.min) / (myLeague.max - myLeague.min)) * 100) : 100}%` }}
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:12px_12px] opacity-50" />
                            </div>
                        </div>
                        {myLeague.next && (
                            <p className="text-center text-slate-400 text-[10px] font-bold mt-2.5">
                                Hora de amassar! Faltam apenas <span className="text-blue-400">{myLeague.max - myEntry.total_pontos} pontos</span> para o próximo nível.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Direct Rival Card */}
            {rival && myEntry && rival.total_pontos > myEntry.total_pontos && (
                <div className="bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/20 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden">
                    <div className="absolute -left-6 opacity-5"><Target size={80} /></div>
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-red-500/50 shadow-lg">
                            {rival.avatar_url ? <img src={rival.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-red-900 flex items-center justify-center text-red-200 font-bold">{rival.nome[0].toUpperCase()}</div>}
                        </div>
                        <div>
                            <span className="text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><Target size={10} /> Seu Rival Direto</span>
                            <span className="text-white font-bold text-sm truncate max-w-[120px] block mt-0.5">{rival.nome}</span>
                        </div>
                    </div>
                    <div className="text-right relative z-10">
                        <span className="text-red-400 font-black text-xl leading-none block drop-shadow-md">-{rival.total_pontos - myEntry.total_pontos}</span>
                        <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1">Para ultrapassar</span>
                    </div>
                </div>
            )}

            {/* Podium */}
            {!loading && podiumTop3.length >= 3 && (
                <div className="flex items-end justify-center gap-2 sm:gap-4 h-56 mt-4">
                    {/* 2nd Place */}
                    <div className="flex flex-col items-center gap-0 w-24">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-slate-300 p-0.5 relative z-20 shadow-[0_5px_15px_rgba(0,0,0,0.5)] mb-2 translate-y-3">
                            {podiumTop3[1].avatar_url ? <img src={podiumTop3[1].avatar_url} className="w-full h-full rounded-full object-cover" /> : <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xl">{podiumTop3[1].nome[0].toUpperCase()}</div>}
                            <div className="absolute -bottom-2 -translate-x-1/2 left-1/2 bg-gradient-to-b from-slate-200 to-slate-400 text-slate-900 font-black text-[12px] w-6 h-6 flex items-center justify-center rounded-full border-2 border-[#0a0f18] shadow-lg">2</div>
                        </div>
                        <div className="w-full h-[100px] bg-gradient-to-t from-slate-400/20 to-slate-400/5 rounded-t-xl border-t border-slate-400/50 flex flex-col items-center justify-start pt-6 shadow-[inset_0_5px_20px_rgba(148,163,184,0.1)] relative z-10 backdrop-blur-sm">
                            <span className="text-white text-[11px] font-bold truncate max-w-[80px] drop-shadow-md">{podiumTop3[1].nome.split(' ')[0]}</span>
                            <span className="text-slate-300 text-[10px] font-black tracking-wider">{podiumTop3[1].total_pontos}</span>
                        </div>
                    </div>
                    {/* 1st Place */}
                    <div className="flex flex-col items-center gap-0 w-28 relative z-30">
                        <Crown className="text-yellow-400 absolute -top-8 animate-bounce drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" size={32} />
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-yellow-400 p-0.5 relative z-20 shadow-[0_0_30px_rgba(250,204,21,0.5)] mb-2 translate-y-3">
                            {podiumTop3[0].avatar_url ? <img src={podiumTop3[0].avatar_url} className="w-full h-full rounded-full object-cover" /> : <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-yellow-400 font-bold text-xl">{podiumTop3[0].nome[0].toUpperCase()}</div>}
                            <div className="absolute -bottom-2 -translate-x-1/2 left-1/2 bg-gradient-to-b from-yellow-300 to-yellow-600 text-yellow-900 font-black text-[14px] w-7 h-7 flex items-center justify-center rounded-full border-2 border-[#0a0f18] shadow-lg">1</div>
                        </div>
                        <div className="w-full h-[140px] bg-gradient-to-t from-yellow-500/20 to-yellow-500/5 rounded-t-xl border-t-2 border-yellow-400/60 flex flex-col items-center justify-start pt-6 shadow-[inset_0_5px_30px_rgba(250,204,21,0.15)] backdrop-blur-md">
                            <span className="text-white text-[13px] font-black truncate max-w-[90px] drop-shadow-md">{podiumTop3[0].nome.split(' ')[0]}</span>
                            <span className="text-yellow-400 text-[11px] font-black tracking-wider">{podiumTop3[0].total_pontos}</span>
                        </div>
                    </div>
                    {/* 3rd Place */}
                    <div className="flex flex-col items-center gap-0 w-24">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-orange-700/80 p-0.5 relative z-20 shadow-[0_5px_15px_rgba(0,0,0,0.5)] mb-2 translate-y-3">
                            {podiumTop3[2].avatar_url ? <img src={podiumTop3[2].avatar_url} className="w-full h-full rounded-full object-cover" /> : <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-orange-500 font-bold text-xl">{podiumTop3[2].nome[0].toUpperCase()}</div>}
                            <div className="absolute -bottom-2 -translate-x-1/2 left-1/2 bg-gradient-to-b from-orange-500 to-orange-700 text-orange-100 font-black text-[12px] w-6 h-6 flex items-center justify-center rounded-full border-2 border-[#0a0f18] shadow-lg">3</div>
                        </div>
                        <div className="w-full h-[80px] bg-gradient-to-t from-orange-800/30 to-orange-800/5 rounded-t-xl border-t border-orange-700/50 flex flex-col items-center justify-start pt-6 shadow-[inset_0_5px_20px_rgba(194,65,12,0.1)] relative z-10 backdrop-blur-sm">
                            <span className="text-white text-[11px] font-bold truncate max-w-[80px] drop-shadow-md">{podiumTop3[2].nome.split(' ')[0]}</span>
                            <span className="text-orange-400 text-[10px] font-black tracking-wider">{podiumTop3[2].total_pontos}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Marketplace Reward Integration */}
            {myEntry && (
                <div className="bg-gradient-to-br from-emerald-900/40 via-teal-900/20 to-black/60 border border-emerald-500/30 backdrop-blur-md rounded-2xl p-4 relative overflow-hidden mt-2">
                    <div className="absolute -right-4 -bottom-4 opacity-[0.06] text-emerald-400">
                        <ShoppingBag size={120} />
                    </div>
                    <div className="relative z-10 flex items-start justify-between mb-3">
                        <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <ShoppingBag size={14} className="text-emerald-400" />
                                <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-widest drop-shadow">Recompensa da Loja</span>
                            </div>
                            <h4 className="text-white font-black text-sm drop-shadow-sm">Libere 15% OFF na Marca Patrocinadora</h4>
                        </div>
                        <div className="bg-emerald-500/20 px-2 py-1 rounded-md border border-emerald-500/40 shadow-lg">
                            <span className="text-emerald-400 font-black text[12px]">-15%</span>
                        </div>
                    </div>
                    <div className="relative z-10 bg-black/40 p-3 rounded-xl border border-white/5">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-2">
                            <span className="uppercase tracking-wider">Progresso da Meta</span>
                            <span className="text-emerald-400">{myEntry.total_pontos} / {(Math.floor(myEntry.total_pontos / 500) + 1) * 500} FP</span>
                        </div>
                        <div className="h-2.5 bg-[#0a0f18] rounded-full overflow-hidden border border-white/5 shadow-inner">
                            <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)] relative" style={{ width: `${(myEntry.total_pontos % 500) / 500 * 100}%` }}>
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:10px_10px] opacity-40" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard List Selection */}
            {listTop.length > 0 && (
                <div className="flex flex-col gap-3 mt-4 relative z-10">
                    <div className="flex items-center justify-between pl-1 pr-2">
                        <h3 className="text-white font-black text-base tracking-tight pt-2">Ranking Global</h3>
                    </div>
                    {listTop.map((entry, idx) => {
                        const isMe = entry.user_id === myUserId;
                        // Determine random favorite product badge for top 10 (simulate marketplace connection)
                        const hasProduct = idx % 3 === 0; 
                        return (
                            <div
                                key={entry.user_id}
                                className={`relative flex items-center gap-3 p-3.5 rounded-2xl transition-all shadow-md backdrop-blur-sm ${isMe ? 'bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/50' : 'bg-white/5 border-white/5'} border`}
                            >
                                {/* Rank */}
                                <div className="w-6 flex items-center justify-center flex-shrink-0">
                                    <span className="text-slate-400 font-black text-sm">#{idx + 4}</span>
                                </div>

                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 font-black text-base border border-white/10 bg-black/40">
                                    {entry.avatar_url ? (
                                        <img src={entry.avatar_url} alt={entry.nome} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className={isMe ? 'text-blue-400' : 'text-slate-400'}>{entry.nome.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0 pr-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold text-[15px] truncate ${isMe ? 'text-blue-300' : 'text-white'}`}>
                                            {entry.nome}
                                        </span>
                                        {isMe && <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/20 px-1.5 py-0.5 rounded-md border border-blue-500/30">Você</span>}
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center gap-1.5">
                                            {entry.cidade && <span className="text-slate-400 text-[11px] font-medium"><MapPin size={10} className="inline mr-0.5 text-slate-500"/>{entry.cidade}</span>}
                                        </div>
                                    </div>

                                    {/* Marketplace favorite product mini badge */}
                                    {hasProduct && !isMe && (
                                        <div className="flex items-center gap-1 mt-1.5 opacity-80">
                                            <ShoppingBag size={10} className="text-emerald-400" />
                                            <span className="text-[9px] text-emerald-400 font-bold uppercase">Usa Whey MaxCore</span>
                                        </div>
                                    )}
                                </div>

                                {/* Points */}
                                <div className="flex flex-col items-end gap-0.5 flex-shrink-0 bg-black/30 px-3 py-2 rounded-xl border border-white/5">
                                    <span className={`font-black text-[16px] leading-none ${isMe ? 'text-blue-400' : 'text-white'}`}>
                                        {entry.total_pontos.toLocaleString()}
                                    </span>
                                    <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">FP</span>
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
                                    <div className={`mt-1 flex items-center gap-1.5 text-[11px] font-bold px-3 py-2.5 rounded-xl border backdrop-blur-sm ${myBest >= commVal ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]'}`}>
                                        {myBest >= commVal ? (
                                            <><Star size={14} className="text-emerald-400 drop-shadow-md" /> Desempenho de Elite! {((myBest / commVal - 1) * 100).toFixed(0)}% acima da média!</>
                                        ) : (
                                            <><TrendingUp size={14} className="text-blue-400 drop-shadow-md" /> Falta pouco para dominar! Suba apenas {((commVal / myBest - 1) * 100).toFixed(0)}% para superar a média!</>
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
        <div className="w-full flex-1 flex flex-col font-sans bg-[#0a0f18] min-h-[100dvh] pb-24">
            {/* Arena Hero Header */}
            <div className="relative pt-12 pb-8 px-4 overflow-hidden rounded-b-[2.5rem] shadow-2xl mb-6 flex-shrink-0 bg-[#0c121e]">
                {/* Background effects */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 to-[#0a0f18] z-0" />
                <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] z-0" />
                <div className="absolute top-10 -left-12 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px] z-0" />
                
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="flex items-center gap-1.5 mb-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-lg">
                        <Flame size={12} className="text-orange-500 animate-pulse" />
                        <span className="text-white text-[9px] font-black uppercase tracking-[0.2em]">Temporada 1 • Arena</span>
                    </div>
                    <h1 className="text-white font-black text-3xl tracking-tight mb-5 drop-shadow-xl">
                        Ultimate <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">FitClub</span>
                    </h1>
                    
                    {/* Co-Branding Sponsor */}
                    <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-900/30 to-teal-900/30 backdrop-blur-xl border border-emerald-500/20 px-5 py-2.5 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                        <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Patrocínio Oficial</span>
                        <div className="w-px h-6 bg-white/10" />
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded border border-emerald-500/50 bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md">
                                <span className="text-white font-black text-[10px] italic pr-0.5">MC</span>
                            </div>
                            <span className="text-white font-black text-xs tracking-wider">MAXCORE<span className="text-emerald-400">NUTRITION</span></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs (Cockpit Style) */}
            <div className="px-4 mb-6 relative z-20">
                <div className="flex bg-[#0a0f18] rounded-2xl p-1.5 border border-white/5 shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)] relative">
                    {([
                        { key: 'temporada', label: 'Arena', icon: <Crown size={16} /> },
                        { key: 'progresso', label: 'Estatísticas', icon: <BarChart2 size={16} /> },
                    ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${activeTab === tab.key ? 'bg-gradient-to-b from-blue-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-blue-400/40 relative z-10' : 'text-slate-500 hover:text-slate-300 bg-transparent'}`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 relative z-10">
                {activeTab === 'temporada' ? <TemporadaSection /> : <ProgressoSection />}
            </div>
        </div>
    );
}
