import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface TimelineEvent {
  id: string;
  type: 'workout' | 'fitpoint' | 'pr';
  title: string;
  subtitle: string;
  date: Date;
  details?: any;
}

export function useProfileTimeline(targetUserId?: string) {
  const { user } = useAuth();
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const effectiveUserId = targetUserId || user?.id;
    if (!effectiveUserId) return;

    async function fetchTimeline() {
      try {
        setLoading(true);

        const events: TimelineEvent[] = [];

        // 1. Fetch completed workouts
        const { data: workoutsData } = await supabase
          .from('tbTreinosCompletos')
          .select('id, concluido_em, dia, duracao_segundos')
          .eq('user_id', effectiveUserId)
          .order('concluido_em', { ascending: false })
          .limit(20);

        if (workoutsData) {
          workoutsData.forEach((workout) => {
            events.push({
              id: `workout-${workout.id}`,
              type: 'workout',
              title: 'Treino Concluído',
              subtitle: `Treino ${workout.dia}`,
              date: new Date(workout.concluido_em),
              details: {
                duracao_segundos: workout.duracao_segundos,
              },
            });
          });
        }

        // 2. Fetch fitpoints
        const { data: fitPointsData } = await supabase
          .from('tbFitPoints')
          .select('id, ganho_em, pontos, motivo')
          .eq('user_id', effectiveUserId)
          .order('ganho_em', { ascending: false })
          .limit(20);

        if (fitPointsData) {
          fitPointsData.forEach((fp) => {
            if (fp.motivo === 'pr' || fp.motivo === 'novo_pr') {
              events.push({
                id: `pr-${fp.id}`,
                type: 'pr',
                title: 'Novo Recorde Pessoal!',
                subtitle: 'Superação de Limites',
                date: new Date(fp.ganho_em),
                details: {
                  pontos: fp.pontos,
                },
              });
            } else {
              events.push({
                id: `fp-${fp.id}`,
                type: 'fitpoint',
                title: 'FitPoints Ganhos!',
                subtitle: fp.motivo.replace(/_/g, ' '),
                date: new Date(fp.ganho_em),
                details: {
                  pontos: fp.pontos,
                },
              });
            }
          });
        }

        // Sort events by date descending
        events.sort((a, b) => b.date.getTime() - a.date.getTime());

        setTimeline(events);
      } catch (error) {
        console.error('Error fetching timeline:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTimeline();
  }, [user?.id, targetUserId]);

  return { timeline, loading };
}
