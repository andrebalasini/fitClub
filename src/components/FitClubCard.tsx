import { PerformanceCards } from './PerformanceCards';

export interface FitAttribute {
  key: string;     // e.g. "FOR"
  name: string;    // e.g. "Força"
  value: number;   // 0–99
  tooltip: string; // full description
  color: string;   // accent color
  displayValue?: string; // value to display inside the donut chart
  subtitle?: string; // value to display at the bottom
}

interface FitClubCardProps {
  userName?: string;
  avatarUrl?: string;
  isPremium?: boolean;
  ovr?: number;
  fitPoints?: number;
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
    key: 'VOL',
    name: 'Volume',
    value: 85,
    tooltip: 'Volume total de peso levantado na última semana (Séries × Repetições × Carga em KG).',
    color: '#1d70f5',
  },
  {
    key: 'CAR',
    name: 'Cardio',
    value: 74,
    tooltip: 'Baseado no tempo total e intensidade de atividades aeróbicas registradas (corrida, bike, HIIT).',
    color: '#2de8f5',
  },
  {
    key: 'DIE',
    name: 'Dieta',
    value: 68,
    tooltip: 'Consistência alimentar registrada: adesão ao plano nutricional e qualidade das refeições.',
    color: '#22c55e',
  },
  {
    key: 'FRQ',
    name: 'Frequência',
    value: 88,
    tooltip: 'Frequência semanal de treinos: dias ativos dividido pela sua meta de dias por semana.',
    color: '#a855f7',
  },
];



function computeOVR(attributes: FitAttribute[]): number {
  const weights: Record<string, number> = {
    FOR: 0.25, VOL: 0.20, CAR: 0.20, DIE: 0.15, FRQ: 0.20,
  };
  const total = attributes.reduce((sum, a) => sum + a.value * (weights[a.key] ?? 0.2), 0);
  return Math.round(total);
}



export function FitClubCard({
  userName = 'André Balasini',
  avatarUrl = 'https://i.pravatar.cc/150?img=11',
  isPremium = true,
  fitPoints,
  attributes = DEFAULT_ATTRIBUTES,
}: FitClubCardProps) {
  const ovr = computeOVR(attributes);
  const displayPoints = fitPoints !== undefined ? fitPoints : ovr * 10;

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
            {displayPoints.toLocaleString('pt-BR')}
          </span>
          <div className="text-[13.5px] font-bold tracking-[-0.03em] mt-0.5" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }}>
            <span className="text-white">fit</span>
            <span style={{ color: accentColor }}>Points</span>
          </div>
        </div>
      </div>



      {/* Horizontal Divider */}
      <div className="w-full h-[1px] opacity-20 mb-3 z-10" style={{ background: accentColor }} />

      {/* Content Row: Scrollable Performance Cards */}
      <div className="w-full z-10 relative mb-1">
        <PerformanceCards attributes={attributes} />
      </div>
    </div>
  );
}

export { DEFAULT_ATTRIBUTES };
