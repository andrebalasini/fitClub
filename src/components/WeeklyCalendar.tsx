import { useEffect, useState } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface TrainedWorkout {
  date: Date;
  letter: string;
}

interface WeeklyCalendarProps {
  trainedDates?: TrainedWorkout[];
  fitPointsDates?: Date[];
}

export function WeeklyCalendar({ trainedDates = [], fitPointsDates = [] }: WeeklyCalendarProps) {
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const today = new Date();

  useEffect(() => {
    // Start of the week is Sunday (0)
    const start = startOfWeek(today, { weekStartsOn: 0 });
    const days = Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    setWeekDays(days);
  }, []);

  return (
    <div className="w-full pt-1 pb-1">
      <div className="flex justify-between items-center w-full px-2">
        {weekDays.map((day, index) => {
          const isToday = isSameDay(day, today);
          const trainedDay = trainedDates.find(tw => isSameDay(tw.date, day));
          const isTrained = !!trainedDay;
          const hasFitPoints = fitPointsDates.some(fpDay => isSameDay(fpDay, day));
          
          return (
            <div
              key={index}
              className="flex flex-col items-center justify-center gap-2 flex-1"
            >
              <span className="text-[13px] text-[#94a3b8] font-medium lowercase">
                {format(day, 'EEEE', { locale: ptBR }).substring(0, 3)}
              </span>
              <div
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center text-[17px] font-bold transition-all relative",
                  isToday 
                    ? "bg-[#1d70f5] text-white shadow-[0_4px_12px_rgba(29,112,245,0.4)]" 
                    : (isTrained || hasFitPoints)
                      ? "bg-[#1d70f5] text-white shadow-[0_4px_12px_rgba(29,112,245,0.4)]"
                      : "bg-transparent text-white"
                )}
              >
                {hasFitPoints ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[20px] h-[20px] text-[#e2c172]">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.993 5.99 0 0 0 11 14.9V19H7v2h10v-2h-4v-4.1a5.993 5.99 0 0 0 3.61-3.96C19.08 10.63 21 8.55 21 6V5c0-1.1-.9-2-2-2zm-12 6c-1.1 0-2-.9-2-2V5h2v4zm10 0V5h2v2c0 1.1-.9 2-2 2z" />
                  </svg>
                ) : isTrained ? (
                  <span className="uppercase">{trainedDay.letter}</span>
                ) : (
                  <span>{format(day, 'd')}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
