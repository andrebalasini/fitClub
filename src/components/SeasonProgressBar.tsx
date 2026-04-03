interface SeasonProgressBarProps {
  currentXP?: number;
  targetXP?: number;
  season?: number;
  level?: number;
  reward?: string;
}

export function SeasonProgressBar({
  currentXP = 740,
  targetXP = 1000,
  season = 1,
  level = 7,
  reward = 'Camiseta fitClub',
}: SeasonProgressBarProps) {
  const progress = Math.min((currentXP / targetXP) * 100, 100);

  return (
    <div
      className="w-full rounded-[18px] p-4 select-none"
      style={{
        background: '#131b2b',
        border: '1px solid rgba(29,112,245,0.15)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-black text-white"
            style={{ background: 'linear-gradient(135deg, #1d70f5, #0d2d7a)' }}
          >
            {level}
          </div>
          <div>
            <p className="text-white font-bold text-[13px] leading-none">Nível de Temporada</p>
            <p className="text-[#4d9fff] text-[11px] font-medium mt-0.5">Temporada {season}</p>
          </div>
        </div>

        {/* Reward badge */}
        <div className="flex items-center gap-2 bg-[#0d1a30] rounded-[10px] px-3 py-1.5 border border-[#1d70f5]/20">
          <span className="text-[16px]">🎽</span>
          <div className="text-right">
            <p className="text-[10px] text-[#8e95a3] font-medium leading-none">Próximo prêmio</p>
            <p className="text-white text-[11px] font-bold leading-tight mt-0.5">{reward}</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-3 rounded-full overflow-hidden bg-[#0d1a30]">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #1a4fba, #1d70f5, #4d9fff)',
            boxShadow: '0 0 8px rgba(29,112,245,0.6)',
          }}
        >
          {/* Shimmer inside bar */}
          <div className="absolute inset-0 animate-pulse opacity-40"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }}
          />
        </div>
      </div>

      {/* XP labels */}
      <div className="flex justify-between items-center mt-2">
        <span className="text-[#4d9fff] text-[11px] font-bold">
          {currentXP.toLocaleString('pt-BR')} XP
        </span>
        <span className="text-[#8e95a3] text-[10px]">
          {Math.round(progress)}% completo
        </span>
        <span className="text-[#8e95a3] text-[11px]">
          {targetXP.toLocaleString('pt-BR')} XP
        </span>
      </div>
    </div>
  );
}
