import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface DashboardProfile {
  nome: string;
  cidade: string;
  avatarUrl: string;
}

export interface DashboardStats {
  totalWorkoutsThisMonth: number;
  totalWorkoutsAllTime: number;
  streak: number;
  trainedDatesThisWeek: { date: Date; letter: string }[];
  fitPointsDatesThisWeek: Date[];
  totalVolumeThisWeek: number;
  totalSeriesThisWeek: number;
  totalExercisesCompleted: number;
  fitPoints: number;
}

export function useDashboardData(targetUserId?: string, preloadedProfile?: any) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkoutsThisMonth: 0,
    totalWorkoutsAllTime: 0,
    streak: 0,
    trainedDatesThisWeek: [],
    fitPointsDatesThisWeek: [],
    totalVolumeThisWeek: 0,
    totalSeriesThisWeek: 0,
    totalExercisesCompleted: 0,
    fitPoints: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const effectiveUserId = targetUserId || user?.id;
    if (!effectiveUserId) return;

    async function fetchData() {
      try {
        setLoading(true);

        // 1. Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nome, cidade, avatar_url')
          .eq('id', effectiveUserId)
          .maybeSingle();

        if (profileData) {
          const isOwnProfile = effectiveUserId === user?.id;
          setProfile({
            nome: profileData.nome || (isOwnProfile ? user?.email?.split('@')[0] : undefined) || 'Atleta',
            cidade: profileData.cidade || '',
            avatarUrl: profileData.avatar_url || '',
          });
        } else {
          const isOwnProfile = effectiveUserId === user?.id;
          setProfile({
            nome: preloadedProfile?.nome || (isOwnProfile ? (user?.user_metadata?.name || user?.email?.split('@')[0]) : undefined) || 'Atleta',
            cidade: preloadedProfile?.cidade || '',
            avatarUrl: preloadedProfile?.avatar_url || '',
          });
        }

        // 2. Fetch workout history for stats
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfWeek = getStartOfWeek(now).toISOString();

        const { data: historyData } = await supabase
          .from('tbHistorico')
          .select('id, created_at, carga_usada, repeticoes_feitas, serie_atual')
          .eq('user_id', effectiveUserId)
          .order('created_at', { ascending: false });

        // Get workout history this month  
        const { data: monthData } = await supabase
          .from('tbHistorico')
          .select('created_at')
          .eq('user_id', effectiveUserId)
          .gte('created_at', startOfMonth);

        // Get workout history this week
        const { data: weekData } = await supabase
          .from('tbHistorico')
          .select('created_at, carga_usada, repeticoes_feitas')
          .eq('user_id', effectiveUserId)
          .gte('created_at', startOfWeek);

        // Get completed workouts for the calendar
        const { data: completedData } = await supabase
          .from('tbTreinosCompletos')
          .select('concluido_em, dia')
          .eq('user_id', effectiveUserId)
          .gte('concluido_em', startOfWeek);

        // Count unique workout days this month
        const uniqueDaysThisMonth = new Set(
          (monthData || []).map(h => new Date(h.created_at).toDateString())
        ).size;

        // Unique trained dates this week (as objects with date and letter)
        const trainedDatesThisWeek = (completedData || []).map(row => ({
          date: new Date(row.concluido_em),
          letter: row.dia || '?'
        }));

        // Total volume this week (carga * reps)
        const totalVolumeThisWeek = (weekData || []).reduce(
          (sum, h) => sum + (Number(h.carga_usada) || 0) * (h.repeticoes_feitas || 0),
          0
        );

        // Total series this week
        const totalSeriesThisWeek = (weekData || []).length;

        // Calculate streak (consecutive days trained)
        const streak = calculateStreak(historyData || []);

        // Total exercises completed all time
        const totalExercisesCompleted = (historyData || []).length;

        const totalWorkoutsAllTime = (historyData && historyData.length > 0)
          ? new Set(historyData.map(h => new Date(h.created_at).toDateString())).size
          : (preloadedProfile?.total_treinos || 0);

        // Get all fitPoints for this user
        const { data: allFitPointsData } = await supabase
          .from('tbFitPoints')
          .select('ganho_em, pontos')
          .eq('user_id', effectiveUserId);
        
        const fitPoints = (allFitPointsData && allFitPointsData.length > 0)
          ? allFitPointsData.reduce((acc, curr) => acc + (curr.pontos || 0), 0)
          : (preloadedProfile?.total_pontos || 0);
        
        const fitPointsWeekData = (allFitPointsData || []).filter(item => 
          item.ganho_em && item.ganho_em >= startOfWeek
        );

        const fitPointsDatesThisWeek = Array.from(
          new Set((fitPointsWeekData || []).map(h => new Date(h.ganho_em).toDateString()))
        ).map(dateStr => new Date(dateStr));

        setStats({
          totalWorkoutsThisMonth: uniqueDaysThisMonth,
          totalWorkoutsAllTime,
          streak,
          trainedDatesThisWeek,
          fitPointsDatesThisWeek,
          totalVolumeThisWeek,
          totalSeriesThisWeek,
          totalExercisesCompleted,
          fitPoints,
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user?.id, targetUserId]);

  return { profile, stats, loading };
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function calculateStreak(history: { created_at: string }[]): number {
  if (!history.length) return 0;

  // Get unique dates sorted descending
  const uniqueDates = Array.from(
    new Set(history.map(h => new Date(h.created_at).toDateString()))
  )
    .map(d => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  if (!uniqueDates.length) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if the most recent workout was today or yesterday
  const mostRecent = uniqueDates[0];
  mostRecent.setHours(0, 0, 0, 0);

  if (mostRecent.getTime() !== today.getTime() && mostRecent.getTime() !== yesterday.getTime()) {
    return 0; // Streak broken
  }

  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = uniqueDates[i - 1];
    const curr = uniqueDates[i];
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

