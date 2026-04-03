import { Zap, Flame, Dumbbell } from 'lucide-react';

interface UserStatsProps {
  name: string;
  avatarUrl?: string;
  fitPoints: number;
  streak: number;
  monthlyWorkouts: number;
}

export function UserStats({ name, avatarUrl, fitPoints, streak, monthlyWorkouts }: UserStatsProps) {
  return (
    <div className="w-full relative mt-2 mb-8 px-1">
      {/* Subtle Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-vibrant-blue/20 to-purple-600/20 blur-2xl rounded-full opacity-60 pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative w-full bg-gradient-to-br from-zinc-800/80 to-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-[28px] shadow-2xl overflow-hidden">
        
        {/* Subtle Inner Highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="flex flex-col">
          {/* Top Section: Avatar & Welcome */}
          <div className="flex items-center gap-4 p-5 pb-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-zinc-700/80 bg-zinc-800 flex-shrink-0 shadow-inner">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-700 text-slate-300 font-bold text-xl">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {/* Online Indicator */}
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-zinc-900 rounded-full" />
            </div>

            {/* Text Info */}
            <div className="flex flex-col flex-1">
              <span className="text-xs font-semibold text-vibrant-blue tracking-widest uppercase mb-0.5">
                Bem-vindo de volta
              </span>
              <span className="text-xl font-extrabold text-white leading-none">
                {name}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Bottom Section: Stats Grid */}
          <div className="grid grid-cols-3 divide-x divide-white/10 p-4 bg-black/20">
            {/* FitPoints */}
            <div className="flex items-center justify-center gap-2 group cursor-pointer transition-transform active:scale-95">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider"><span className="text-white">fit</span><span className="text-[#4d9fff]">Points</span></span>
                </div>
                <span className="text-lg font-bold text-white leading-none">{fitPoints.toLocaleString('pt-BR')}</span>
              </div>
            </div>

            {/* Streak */}
            <div className="flex items-center justify-center gap-2 group cursor-pointer transition-transform active:scale-95">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ofensiva</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-white leading-none">{streak}</span>
                  <span className="text-xs font-medium text-slate-500">Dias</span>
                </div>
              </div>
            </div>

            {/* Treinos no Mês */}
            <div className="flex items-center justify-center gap-2 group cursor-pointer transition-transform active:scale-95">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <Dumbbell className="w-3.5 h-3.5 text-vibrant-blue drop-shadow-[0_0_8px_rgba(0,98,255,0.5)]" />
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mês</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-white leading-none">{monthlyWorkouts}</span>
                  <span className="text-xs font-medium text-slate-500">Treinos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
