import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { HexRadarChart } from '../components/HexRadarChart';
import type { FitAttribute } from '../components/FitClubCard';
import { DEFAULT_ATTRIBUTES } from '../components/FitClubCard';
import { Activity, Camera, TrendingUp, CalendarDays, Award } from 'lucide-react';

import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Profile() {
  const { user } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  
  const [activeTab, setActiveTab] = useState<'timeline' | 'fotos' | 'performance'>('timeline');
  const [profileData, setProfileData] = useState<{ nome?: string; avatar_url?: string } | null>(null);

  // Fetch basic info if we have a userId
  useEffect(() => {
    if (userId) {
      supabase.from('profiles').select('nome, avatar_url').eq('id', userId).single().then(({ data }) => {
        if (data) setProfileData(data);
      });
    }
  }, [userId]);

  // Placeholder data for attributes until we fetch from DB
  const attributes = DEFAULT_ATTRIBUTES;
  const communityAttributes = DEFAULT_ATTRIBUTES.map(a => ({ ...a, value: Math.max(0, a.value - 10) }));
  
  const computeOVR = (attrs: FitAttribute[]) => {
    const weights: Record<string, number> = {
      FOR: 0.25, VOL: 0.20, CAR: 0.20, DIE: 0.15, FRQ: 0.20,
    };
    const total = attrs.reduce((sum, a) => sum + a.value * (weights[a.key] ?? 0.2), 0);
    return Math.round(total);
  };

  const ovr = computeOVR(attributes);
  const fitPoints = ovr * 10;
  
  const userName = profileData?.nome || user?.user_metadata?.name || 'André Balasini';
  const avatarUrl = profileData?.avatar_url || user?.user_metadata?.avatar_url || 'https://i.pravatar.cc/150?img=11';
  const isPremium = true; // Placeholder

  const leftCol = attributes.slice(0, 3);
  const rightCol = attributes.slice(3, 6);
  const accentColor = '#4d9fff';

  return (
    <div className="flex-1 w-full max-w-md mx-auto flex flex-col pt-6 pb-24 px-5">
      {/* --- Perfil Info (Fora do Card) --- */}
      <div className="relative w-full flex flex-col mb-8 select-none transition-all duration-200">
        
        {/* Header: Avatar, Name, OVR */}
        <div className="flex items-center gap-4 z-10 w-full mb-6">
          <div className="relative flex-shrink-0">
            <div className="w-[80px] h-[80px] rounded-[22px] overflow-hidden border-2 flex items-center justify-center shadow-lg"
              style={{ 
                borderColor: isPremium ? '#e2c172' : 'rgba(255,255,255,0.1)',
                background: !avatarUrl ? '#1a2744' : undefined,
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[#4d9fff] font-bold text-[32px]">
                  {userName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {isPremium && (
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center bg-[#121212]"
                style={{ border: `1px solid #e2c172` }}
              >
                <Award className="w-3.5 h-3.5 text-[#e2c172]" style={{ filter: 'drop-shadow(0 0 4px rgba(226,193,114,0.4))' }} />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h1 className="text-white font-bold text-[28px] leading-tight truncate">{userName}</h1>
            <div className="flex items-center gap-1.5 mt-1 text-[15px] font-medium tracking-tight text-[#8e95a3]" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }}>
              {isPremium && (
                <>
                  <span style={{ color: '#e2c172' }} className="font-bold">Premium</span>
                  <span className="mx-0.5">•</span>
                </>
              )}
              <span>Temporada 1</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center flex-shrink-0 px-2">
            <span className="text-white font-black leading-none" style={{ fontSize: '42px', letterSpacing: '-0.02em' }}>
              {fitPoints.toLocaleString('pt-BR')}
            </span>
            <div className="text-[14px] font-bold tracking-[-0.03em] mt-0.5 uppercase" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }}>
              <span className="text-white">fit</span>
              <span style={{ color: accentColor }}>Points</span>
            </div>
          </div>
        </div>

        {/* Horizontal Divider */}
        <div className="w-full h-[1px] opacity-20 mb-6 z-10" style={{ background: accentColor }} />

        {/* Content Row: Radar + Stats perfectly aligned */}
        <div className="w-full flex items-center justify-between z-10 relative py-2">
          
          {/* 1. Radar Chart */}
          <div className="flex-shrink-0 flex items-center justify-center pl-2">
            <HexRadarChart
              attributes={attributes.map(attr => ({ key: attr.key, value: attr.value }))}
              communityAttributes={communityAttributes.map(attr => ({ key: attr.key, value: attr.value }))}
              size={130}
            />
          </div>

          {/* 2. Stats Block */}
          <div className="flex-shrink-0 pr-4">
            <div className="flex items-stretch gap-6 relative">
              
              {/* Sub-col Left */}
              <div className="flex flex-col gap-3.5 justify-center">
                {leftCol.map(attr => (
                  <div key={attr.key} className="flex items-center justify-start gap-3 h-6">
                    <span className="font-black text-[20px] sm:text-[22px] leading-none text-white tracking-tight min-w-[28px] text-right">
                      {attr.value}
                    </span>
                    <span className="font-bold text-[15px] uppercase tracking-wider" style={{ color: accentColor }}>
                      {attr.key}
                    </span>
                  </div>
                ))}
              </div>

              {/* Central Vertical Divider */}
              <div className="w-[1px] self-stretch opacity-20 mx-1" style={{ background: accentColor }} />

              {/* Sub-col Right */}
              <div className="flex flex-col gap-3.5 justify-center">
                 {rightCol.map(attr => (
                  <div key={attr.key} className="flex items-center justify-start gap-3 h-6">
                    <span className="font-black text-[20px] sm:text-[22px] leading-none text-white tracking-tight min-w-[28px] text-right">
                      {attr.value}
                    </span>
                    <span className="font-bold text-[15px] uppercase tracking-wider" style={{ color: accentColor }}>
                      {attr.key}
                    </span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>

        {/* Info Message - Bottom Right */}
        <div className="flex items-center gap-1.5 opacity-40 mt-4 justify-end">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-[#4d9fff]">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span className="text-[11px] font-bold text-white uppercase tracking-widest italic">
            Toque nos atributos para ver detalhes
          </span>
        </div>
      </div>

      {/* --- Timeline Section --- */}
      <div className="flex-1 flex flex-col w-full animate-fadeInUp" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#4d9fff]" />
          Linha do Tempo
        </h2>

        {/* Tabs for Timeline Filtering */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-[13px] transition-all whitespace-nowrap ${
              activeTab === 'timeline' 
                ? 'bg-[#4d9fff] text-white shadow-[0_0_15px_rgba(77,159,255,0.4)]' 
                : 'bg-[#1a2438] text-[#8e95a3] hover:text-white'
            }`}
          >
            <CalendarDays className="w-4 h-4" /> Todos
          </button>
          <button 
            onClick={() => setActiveTab('fotos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-[13px] transition-all whitespace-nowrap ${
              activeTab === 'fotos' 
                ? 'bg-[#4d9fff] text-white shadow-[0_0_15px_rgba(77,159,255,0.4)]' 
                : 'bg-[#1a2438] text-[#8e95a3] hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" /> FitChecks
          </button>
          <button 
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-[13px] transition-all whitespace-nowrap ${
              activeTab === 'performance' 
                ? 'bg-[#4d9fff] text-white shadow-[0_0_15px_rgba(77,159,255,0.4)]' 
                : 'bg-[#1a2438] text-[#8e95a3] hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Performance
          </button>
        </div>

        {/* Timeline Content Placeholder */}
        <div className="flex-1 flex flex-col gap-6 relative">
          {/* Vertical Line */}
          <div className="absolute left-6 top-2 bottom-0 w-[2px] bg-[#1a2438] z-0" />

          {/* Example Item 1: FitCheck */}
          <div className="relative z-10 flex gap-4 w-full">
            <div className="w-12 h-12 rounded-full bg-[#131b2b] border-[2px] border-[#4d9fff] flex items-center justify-center flex-shrink-0 mt-1 shadow-[0_0_10px_rgba(77,159,255,0.2)]">
              <Camera className="w-5 h-5 text-[#4d9fff]" />
            </div>
            <div className="flex-1 bg-[#131b2b] rounded-2xl p-4 border border-[#1a2438] active:scale-[0.98] transition-transform cursor-pointer shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-white font-bold text-[15px]">FitCheck Pós-Treino</h3>
                  <p className="text-[#8e95a3] text-[12px] font-medium mt-0.5">Treino de Peito & Tríceps</p>
                </div>
                <span className="text-[#4d9fff] text-[11px] font-bold uppercase tracking-wider">Hoje, 08:30</span>
              </div>
              <div className="w-full h-40 bg-[#1a2438] rounded-xl mt-3 flex items-center justify-center border border-[rgba(255,255,255,0.05)] overflow-hidden">
                {/* Imagem Placeholder */}
                <div className="flex flex-col items-center gap-2 opacity-50">
                  <Camera className="w-8 h-8 text-[#8e95a3]" />
                  <span className="text-[#8e95a3] text-[12px] font-medium">Foto em breve...</span>
                </div>
              </div>
            </div>
          </div>

          {/* Example Item 2: Performance Record */}
          <div className="relative z-10 flex gap-4 w-full">
            <div className="w-12 h-12 rounded-full bg-[#131b2b] border-[2px] border-[#22c55e] flex items-center justify-center flex-shrink-0 mt-1 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
              <TrendingUp className="w-5 h-5 text-[#22c55e]" />
            </div>
            <div className="flex-1 bg-[#131b2b] rounded-2xl p-4 border border-[#1a2438] active:scale-[0.98] transition-transform cursor-pointer shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-white font-bold text-[15px]">Novo Recorde Pessoal!</h3>
                  <p className="text-[#8e95a3] text-[12px] font-medium mt-0.5">Supino Reto</p>
                </div>
                <span className="text-[#8e95a3] text-[11px] font-bold uppercase tracking-wider">Ontem</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="px-3 py-1.5 bg-[rgba(34,197,94,0.1)] rounded-lg border border-[rgba(34,197,94,0.2)]">
                  <span className="text-[#22c55e] font-black text-[18px]">100<span className="text-[12px] ml-1">KG</span></span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-medium text-[13px]">+5kg comparado ao anterior</span>
                  <span className="text-[#8e95a3] text-[12px]">3 séries de 8 repetições</span>
                </div>
              </div>
            </div>
          </div>

           {/* Example Item 3: Workout Completed */}
           <div className="relative z-10 flex gap-4 w-full">
            <div className="w-12 h-12 rounded-full bg-[#131b2b] border-[2px] border-[#a855f7] flex items-center justify-center flex-shrink-0 mt-1 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
              <Activity className="w-5 h-5 text-[#a855f7]" />
            </div>
            <div className="flex-1 bg-[#131b2b] rounded-2xl p-4 border border-[#1a2438] active:scale-[0.98] transition-transform cursor-pointer shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-white font-bold text-[15px]">Treino Concluído</h3>
                  <p className="text-[#8e95a3] text-[12px] font-medium mt-0.5">Costas & Bíceps</p>
                </div>
                <span className="text-[#8e95a3] text-[11px] font-bold uppercase tracking-wider">25 Abr</span>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[#8e95a3] text-[11px] font-bold uppercase">Volume</span>
                  <span className="text-white font-black text-[15px]">4.2<span className="text-[#8e95a3] text-[12px] font-medium"> TON</span></span>
                </div>
                <div className="w-[1px] h-8 bg-[#1a2438]" />
                <div className="flex flex-col">
                  <span className="text-[#8e95a3] text-[11px] font-bold uppercase">Duração</span>
                  <span className="text-white font-black text-[15px]">58<span className="text-[#8e95a3] text-[12px] font-medium"> MIN</span></span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* End of Timeline indicator */}
        <div className="mt-8 mb-6 flex justify-center">
          <div className="w-2 h-2 rounded-full bg-[#1a2438] ring-4 ring-[#121212]" />
        </div>

      </div>
    </div>
  );
}
