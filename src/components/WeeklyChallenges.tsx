import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2 } from 'lucide-react';

interface Desafio {
  id: string;
  titulo: string;
  pontos_recompensa: number;
  meta_quantidade: number;
  meta_unidade: string;
  tipo: string;
}

interface UserProgresso {
  desafio_id: string;
  progresso_atual: number;
  concluido: boolean;
}

const PremiumTrophyIcon = ({ className, size = 24 }: { className?: string; size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} className={className}>
    <path d="M19 3H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.993 5.99 0 0 0 11 14.9V19H7v2h10v-2h-4v-4.1a5.993 5.99 0 0 0 3.61-3.96C19.08 10.63 21 8.55 21 6V5c0-1.1-.9-2-2-2zm-12 6c-1.1 0-2-.9-2-2V5h2v4zm10 0V5h2v2c0 1.1-.9 2-2 2z" />
  </svg>
);

export function WeeklyChallenges() {
  const { user } = useAuth();
  const [desafios, setDesafios] = useState<Desafio[]>([]);
  const [progresso, setProgresso] = useState<Record<string, UserProgresso>>({});

  useEffect(() => {
    async function fetchDesafios() {
      // Usando os novos schemas criados via DDL no banco
      const { data } = await supabase.from('tbDesafios').select('*').eq('ativo', true);
      
      if (data && data.length > 0) {
        setDesafios(data as Desafio[]);
        
        const { data: progData } = await supabase
          .from('tbProgressoDesafios')
          .select('*')
          .eq('user_id', user?.id ?? '');
          
        if (progData) {
          const map: Record<string, UserProgresso> = {};
          progData.forEach((p: Record<string, unknown>) => map[p.desafio_id as string] = p as unknown as UserProgresso);
          setProgresso(map);
        }
      } else {
        // Fallback mock para quando o admin ainda não cadastrou nada na tabela nova
        setDesafios([
          { id: '1', titulo: 'Treine 4 vezes na semana', pontos_recompensa: 150, meta_quantidade: 4, meta_unidade: 'treinos', tipo: 'semanal' },
          { id: '2', titulo: 'Levante 5.000kg no total', pontos_recompensa: 300, meta_quantidade: 5000, meta_unidade: 'kg', tipo: 'semanal' }
        ]);
        setProgresso({
          '1': { desafio_id: '1', progresso_atual: 3, concluido: false },
          '2': { desafio_id: '2', progresso_atual: 5000, concluido: true }
        });
      }
    }
    fetchDesafios();
  }, [user?.id]);

  return (
    <div
      className="w-full rounded-[20px] p-5 select-none transition-all duration-200"
      style={{
        background: '#131b2b',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-[18px] leading-none">Desafios da Semana</h2>
        <span className="text-[#4d9fff] text-[12px] font-bold bg-[#1a4fba]/20 px-2.5 py-1 rounded-md">
          Ganhe <span className="text-white notranslate">fit</span><span className="text-[#4d9fff] notranslate">Points</span>
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {desafios.filter(d => d.tipo === 'semanal').map(desafio => {
          const p = progresso[desafio.id] || { progresso_atual: 0, concluido: false };
          const percent = Math.min((p.progresso_atual / desafio.meta_quantidade) * 100, 100);
          const isDone = p.concluido || percent >= 100;

          return (
            <div key={desafio.id} className="bg-[#0f141e] border border-white/5 rounded-[14px] p-3.5 flex flex-col gap-2.5 relative overflow-hidden transition-all active:scale-[0.98] cursor-pointer">
               <div className="flex justify-between items-start z-10">
                 <div className="flex items-center gap-2">
                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDone ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                     {isDone ? <CheckCircle2 size={16} /> : <PremiumTrophyIcon size={16} />}
                   </div>
                   <div className="flex flex-col">
                     <span className="font-bold text-[14px] leading-tight text-slate-200">
                        {desafio.titulo}
                     </span>
                     <span className="text-slate-500 text-[11px] font-medium leading-none mt-1">
                        Recompensa: <span className="text-[#e2c172] font-bold">+{desafio.pontos_recompensa} <span className="text-white notranslate">fit</span><span className="text-[#4d9fff] notranslate">Points</span></span>
                     </span>
                   </div>
                 </div>
               </div>

               <div className="w-full z-10 flex items-center gap-3">
                 <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                   <div 
                     className={`h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_currentColor] ${isDone ? 'bg-green-500 text-green-500/50' : 'bg-[#1d70f5] text-[#1d70f5]/50'}`} 
                     style={{ width: `${percent}%` }}
                   />
                 </div>
                 <span className="text-slate-400 text-[11px] font-bold tabular-nums min-w-[45px] text-right">
                    {p.progresso_atual}/{desafio.meta_quantidade}
                 </span>
               </div>
            </div>
          );
        })}
        {desafios.filter(d => d.tipo === 'semanal').length === 0 && (
          <div className="text-center text-slate-500 text-sm py-4 bg-[#0f141e] rounded-xl border border-dashed border-white/10">
            Nenhum desafio ativo no momento.
          </div>
        )}
      </div>
    </div>
  );
}
