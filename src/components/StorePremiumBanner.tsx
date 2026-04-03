import { ShoppingBag, Star, Zap } from 'lucide-react';

interface StorePremiumBannerProps {
  fitPoints?: number;
  onRedeem?: () => void;
}

export function StorePremiumBanner({ fitPoints = 1240, onRedeem }: StorePremiumBannerProps) {
  return (
    <div className="relative w-full rounded-[20px] overflow-hidden cursor-pointer active:scale-[0.98] transition-all select-none"
      onClick={onRedeem}
      style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 40%, #102a50 70%, #0e266b 100%)',
        boxShadow: '0 8px 32px rgba(29, 112, 245, 0.25), 0 2px 8px rgba(0,0,0,0.4)',
      }}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 shimmer-overlay pointer-events-none" />

      {/* Top gold accent badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-gradient-to-r from-[#d4a017] to-[#f0c040] rounded-full px-2.5 py-0.5">
        <Star className="w-3 h-3 text-[#5a3a00] fill-[#5a3a00]" />
        <span className="text-[#5a3a00] text-[11px] font-black tracking-wide">PREMIUM</span>
      </div>

      <div className="relative z-10 flex items-center gap-4 p-4">
        {/* Icon cluster */}
        <div className="relative flex-shrink-0">
          <div className="w-[62px] h-[62px] rounded-[14px] flex items-center justify-center"
            style={{
              background: 'linear-gradient(145deg, #1a4fba, #0d2d7a)',
              boxShadow: '0 4px 16px rgba(29, 112, 245, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <ShoppingBag className="w-7 h-7 text-white" strokeWidth={1.8} />
          </div>
          {/* Glow behind icon */}
          <div className="absolute inset-0 rounded-[14px] blur-md opacity-50"
            style={{ background: '#1d70f5' }}
          />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <ShoppingBag className="w-3.5 h-3.5 text-[#4d9fff]" strokeWidth={2} />
            <span className="text-[#4d9fff] text-[11px] font-semibold uppercase tracking-widest">Marketplace</span>
          </div>
          <h3 className="text-white font-black text-[17px] leading-tight tracking-tight mb-1">
            Pack Premium<br />
            <span className="text-[#b0cffd] font-semibold text-[13px]">Suplementos exclusivos</span>
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="flex items-center gap-1.5 bg-[#1d70f5] hover:bg-[#2680ff] text-white text-[12px] font-bold px-3.5 py-1.5 rounded-full transition-all active:scale-95"
              style={{ boxShadow: '0 2px 12px rgba(29,112,245,0.5)' }}
              onClick={(e) => { e.stopPropagation(); onRedeem?.(); }}
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              Resgatar com <span className="text-white">fit</span><span className="text-[#4d9fff]">Points</span>
            </button>
            <div className="flex items-center gap-1">
              <span className="text-[#8e95a3] text-[11px]">Saldo:</span>
              <span className="text-white font-bold text-[11px]">{fitPoints.toLocaleString('pt-BR')}</span>
              <span className="text-[#185cf2] font-bold text-[11px]">fp</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom decorative line */}
      <div className="h-[2px] w-full"
        style={{ background: 'linear-gradient(90deg, transparent, #1d70f5 30%, #4d9fff 60%, transparent)' }}
      />
    </div>
  );
}
