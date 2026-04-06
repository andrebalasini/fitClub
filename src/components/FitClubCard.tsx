import { useState } from 'react';
import { HexRadarChart } from './HexRadarChart';

export interface FitAttribute {
  key: string;     // e.g. "FOR"
  name: string;    // e.g. "Força"
  value: number;   // 0–99
  tooltip: string; // full description
  color: string;   // accent color
}

interface FitClubCardProps {
  userName?: string;
  avatarUrl?: string;
  isPremium?: boolean;
  ovr?: number;
  attributes?: FitAttribute[];
  communityAttributes?: FitAttribute[];
}

const DEFAULT_ATTRIBUTES: FitAttribute[] = [
  {
    key: 'FOR',
    name: 'Força',
    value: 82,
    tooltip: 'Baseado na carga máxima (KG) registrada em todos os exercícios.',
    color: '#f55c2d',
  },
  {
    key: 'CAR',
    name: 'Cardio',
    value: 74,
    tooltip: 'Baseado no tempo total e intensidade de atividades aeróbicas registradas (corrida, bike, HIIT).',
    color: '#2de8f5',
  },
  {
    key: 'CONS',
    name: 'Constância',
    value: 88,
    tooltip: 'Frequência semanal de treinos: dias ativos dividido pela sua meta de dias por semana.',
    color: '#a855f7',
  },
  {
    key: 'TEC',
    name: 'Técnica',
    value: 79,
    tooltip: 'Pontuação gerada pelo Bio-feedback e precisão na execução dos treinos (séries completas vs. metas).',
    color: '#f5c518',
  },
  {
    key: 'REC',
    name: 'Recuperação',
    value: 71,
    tooltip: 'Baseado no tempo de descanso inter-sessões e na qualidade do repouso reportada nos treinos.',
    color: '#22c55e',
  },
  {
    key: 'VOL',
    name: 'Volume',
    value: 85,
    tooltip: 'Volume total de peso levantado na última semana (Séries × Repetições × Carga em KG).',
    color: '#1d70f5',
  },
];

const DEFAULT_COMMUNITY_ATTRIBUTES: FitAttribute[] = [
  { ...DEFAULT_ATTRIBUTES[0], value: 65 },
  { ...DEFAULT_ATTRIBUTES[1], value: 60 },
  { ...DEFAULT_ATTRIBUTES[2], value: 75 },
  { ...DEFAULT_ATTRIBUTES[3], value: 68 },
  { ...DEFAULT_ATTRIBUTES[4], value: 72 },
  { ...DEFAULT_ATTRIBUTES[5], value: 70 },
];

function computeOVR(attributes: FitAttribute[]): number {
  const weights: Record<string, number> = {
    FOR: 0.2, CAR: 0.15, CONS: 0.25, TEC: 0.15, REC: 0.1, VOL: 0.15,
  };
  const total = attributes.reduce((sum, a) => sum + a.value * (weights[a.key] ?? 0.166), 0);
  return Math.round(total);
}

interface TooltipProps {
  text: string;
  attrName: string;
  color: string;
  align?: 'left' | 'right' | 'center';
}

function AttributeTooltip({ text, attrName, align = 'center' }: TooltipProps) {
  // Positioning it below the element (top-[100%+8px])
  const alignStyle = align === 'left' ? { left: '0' } : align === 'right' ? { right: '0' } : { left: '50%', transform: 'translateX(-50%)' };
  const arrowStyle = align === 'left' ? { left: '16px' } : align === 'right' ? { right: '16px' } : { left: '50%', transform: 'translateX(-50%)' };
  const accentColor = '#4d9fff';

  return (
    <div
      className="absolute z-50 top-[calc(100%+8px)] w-[280px] rounded-xl p-4 text-left pointer-events-none animate-tooltipIn"
      style={{
        ...alignStyle,
        background: '#0d1628',
        border: `1px solid ${accentColor}80`,
        boxShadow: `0 10px 30px rgba(0,0,0,0.8), 0 0 0 1px rgba(77,159,255,0.1)`,
      }}
    >
      <p className="font-black text-[18px] mb-1" style={{ color: accentColor }}>{attrName}</p>
      <p className="text-[15px] text-[#9db4d4] leading-relaxed italic">{text}</p>
      {/* Arrow on TOP */}
      <div
        className="absolute -top-[6px] w-3 h-3 rotate-45"
        style={{ 
          ...arrowStyle,
          background: '#0d1628', 
          borderTop: `1px solid ${accentColor}80`, 
          borderLeft: `1px solid ${accentColor}80` 
        }}
      />
    </div>
  );
}

export function FitClubCard({
  userName = 'André Balasini',
  avatarUrl = 'https://i.pravatar.cc/150?img=11',
  isPremium = true,
  attributes = DEFAULT_ATTRIBUTES,
  communityAttributes = DEFAULT_COMMUNITY_ATTRIBUTES,
}: FitClubCardProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const ovr = computeOVR(attributes);

  // Split attributes into 2 columns
  const leftCol = attributes.slice(0, 3);
  const rightCol = attributes.slice(3, 6);

  const accentColor = '#4d9fff';

  return (
    <div
      className="relative w-full flex flex-col rounded-[20px] p-5 select-none transition-all duration-200"
      style={{
        background: '#131b2b',
        boxShadow: isPremium 
          ? '0 8px 32px rgba(0,0,0,0.4), inset 0 0 30px rgba(77,159,255,0.05)' 
          : '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Background pattern similar to the screenshot (very subtle diagonal lines) */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-[20px] mix-blend-overlay"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #fff 2px, #fff 4px)',
          backgroundSize: '8px 8px'
        }}
      />

      {/* Header: Avatar, Name, OVR */}
      <div className="flex items-center gap-4 z-10 w-full mb-5">
        <div className="relative flex-shrink-0">
          <div className="w-[60px] h-[60px] rounded-[16px] overflow-hidden border-2 flex items-center justify-center"
            style={{ 
              borderColor: isPremium ? '#e2c172' : 'rgba(255,255,255,0.1)',
              background: !avatarUrl ? '#1a2744' : undefined,
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[#4d9fff] font-bold text-[24px]">
                {userName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {isPremium && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-[#131b2b]"
              style={{ border: `1px solid #e2c172` }}
            >
              <svg 
                viewBox="0 0 24 24" 
                fill="currentColor"
                style={{ color: '#e2c172', width: '12px', height: '12px', filter: 'drop-shadow(0 0 4px rgba(226,193,114,0.4))' }}
              >
                 <path d="M19 3H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.993 5.99 0 0 0 11 14.9V19H7v2h10v-2h-4v-4.1a5.993 5.99 0 0 0 3.61-3.96C19.08 10.63 21 8.55 21 6V5c0-1.1-.9-2-2-2zm-12 6c-1.1 0-2-.9-2-2V5h2v4zm10 0V5h2v2c0 1.1-.9 2-2 2z" />
              </svg>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-white font-bold text-[22px] leading-tight truncate">{userName}</p>
          <div className="flex items-center gap-1 mt-1 text-[14px] font-bold tracking-tight text-[#8e95a3]" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }}>
            {isPremium && (
              <>
                <span style={{ color: '#e2c172' }}>Premium</span>
                <span className="mx-0.5">•</span>
              </>
            )}
            <span>Temporada 1</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center flex-shrink-0 px-2 group cursor-pointer active:scale-95 transition-all">
          <span className="text-white font-black leading-none" style={{ fontSize: '36px', letterSpacing: '-0.02em' }}>
            {ovr * 10}
          </span>
          <div className="text-[13.5px] font-bold tracking-[-0.03em] mt-0.5" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }}>
            <span className="text-white">fit</span>
            <span style={{ color: accentColor }}>Points</span>
          </div>
        </div>
      </div>

      {/* Tooltip Overlay to close when clicking outside */}
      {activeTooltip && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setActiveTooltip(null)}
          onTouchStart={() => setActiveTooltip(null)}
        />
      )}

      {/* Horizontal Divider */}
      <div className="w-full h-[1px] opacity-20 mb-3 z-10" style={{ background: accentColor }} />

      {/* Content Row: Radar + Stats perfectly aligned */}
      <div className="w-full flex items-center justify-between z-10 relative py-2 mb-1">
        
        {/* 1. Radar Chart */}
        <div className="flex-shrink-0 flex items-center justify-center pl-2 mt-1">
          <HexRadarChart
            attributes={attributes.map(attr => ({ key: attr.key, value: attr.value }))}
            communityAttributes={communityAttributes.map(attr => ({ key: attr.key, value: attr.value }))}
            size={130}
          />
        </div>

        {/* 2. Stats Block */}
        <div className="flex-shrink-0 pr-2">
          <div className="flex items-stretch gap-5 relative">
            
            {/* Tooltip Overlay (Centralized inside the stat block) */}
            {activeTooltip && (
              <div 
                className="absolute z-50 left-1/2 -translate-x-1/2 pointer-events-none animate-tooltipIn"
                style={{ 
                  top: leftCol.findIndex(a => a.key === activeTooltip) !== -1 
                    ? (leftCol.findIndex(a => a.key === activeTooltip) * 32 + 20) + 'px'
                    : (rightCol.findIndex(a => a.key === activeTooltip) * 32 + 20) + 'px'
                }}
              >
                {(() => {
                  const attr = attributes.find(a => a.key === activeTooltip);
                  if (!attr) return null;
                  return <AttributeTooltip text={attr.tooltip} attrName={attr.name} color={attr.color} />;
                })()}
              </div>
            )}

            {/* Sub-col Left */}
            <div className="flex flex-col gap-2.5 justify-center">
              {leftCol.map(attr => (
                <div 
                  key={attr.key}
                  className="flex items-center justify-start gap-2.5 h-6"
                >
                  <span className="font-black text-[18px] sm:text-[20px] leading-none text-white tracking-tight min-w-[24px] text-right">
                    {attr.value}
                  </span>
                  <div 
                    className="flex items-center cursor-pointer active:scale-95 transition-transform"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTooltip(activeTooltip === attr.key ? null : attr.key);
                    }}
                  >
                    <span className="font-medium text-[14px] sm:text-[15px] uppercase tracking-wider" style={{ color: accentColor }}>
                      {attr.key}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Central Vertical Divider */}
            <div className="w-[1px] self-stretch opacity-20 mx-2 sm:mx-3" style={{ background: accentColor }} />

            {/* Sub-col Right */}
            <div className="flex flex-col gap-2.5 justify-center">
               {rightCol.map(attr => (
                <div 
                  key={attr.key}
                  className="flex items-center justify-start gap-2.5 h-6"
                >
                  <span className="font-black text-[18px] sm:text-[20px] leading-none text-white tracking-tight min-w-[24px] text-right">
                    {attr.value}
                  </span>
                  <div 
                    className="flex items-center cursor-pointer active:scale-95 transition-transform"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTooltip(activeTooltip === attr.key ? null : attr.key);
                    }}
                  >
                    <span className="font-medium text-[14px] sm:text-[15px] uppercase tracking-wider" style={{ color: accentColor }}>
                      {attr.key}
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

      {/* Info Message - Bottom Right */}
      <div className="absolute bottom-2 right-4 flex items-center gap-1.5 opacity-40 pointer-events-none">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-[#4d9fff]">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span className="text-[10px] font-bold text-white uppercase tracking-widest italic">
          Toque nos atributos para ver detalhes
        </span>
      </div>
    </div>
  );
}

export { DEFAULT_ATTRIBUTES };
