
import type { FitAttribute } from './FitClubCard';
import { Utensils, Footprints, CalendarDays } from 'lucide-react';

interface PerformanceCardsProps {
  attributes: FitAttribute[];
}

export function PerformanceCards({ attributes }: PerformanceCardsProps) {
  const radius = 24;
  const strokeWidth = 6;
  const arcLength = 2 * Math.PI * radius * (270 / 360);

  return (
    <div className="flex overflow-x-auto gap-3 pb-2 pt-2 scrollbar-none w-full px-1 items-center">
      {attributes.map((attr) => {
        let innerContent = null;
        if (attr.key === 'NUT') {
          innerContent = <Utensils size={20} color={attr.color} />;
        } else if (attr.key === 'CAR') {
          innerContent = <Footprints size={20} color={attr.color} />;
        } else if (attr.key === 'FRQ') {
          innerContent = <CalendarDays size={20} color={attr.color} />;
        } else {
          innerContent = (
            <span className="text-white font-bold text-[14px]">
              {attr.displayValue || attr.value}
            </span>
          );
        }

        return (
          <div 
            key={attr.key} 
            className="flex-shrink-0 flex flex-col items-center justify-between w-[100px] h-[135px] bg-[#1e293b] rounded-2xl p-3 border border-slate-700/50 shadow-lg"
          >
            <span className="text-white font-bold text-[14px]">{attr.name}</span>
            
            <div className="relative w-[60px] h-[60px] flex items-center justify-center my-1">
              <svg width="60" height="60" viewBox="0 0 64 64" className="absolute inset-0 rotate-[135deg]">
                <circle
                  cx="32" cy="32" r={radius}
                  fill="none" stroke="#334155" strokeWidth={strokeWidth}
                  strokeDasharray={`${arcLength} 999`}
                  strokeLinecap="round"
                />
                <circle
                  cx="32" cy="32" r={radius}
                  fill="none" stroke={attr.color} strokeWidth={strokeWidth}
                  strokeDasharray={`${arcLength} 999`}
                  strokeDashoffset={arcLength - (attr.value / 100) * arcLength}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pt-1">
                {innerContent}
              </div>
            </div>

            <span 
              className="text-[12px] font-bold text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis w-full"
              style={{ color: attr.color }}
            >
              {attr.subtitle}
            </span>
          </div>
        );
      })}
    </div>
  );
}
