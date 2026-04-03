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

export function useDashboardData() {
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
    if (!user) return;

    async function fetchData() {
      setLoading(true);

      // 1. Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('nome, cidade, avatar_url')
        .eq('id', user!.id)
        .single();

      if (profileData) {
        setProfile({
          nome: profileData.nome || user!.email?.split('@')[0] || 'Atleta',
          cidade: profileData.cidade || '',
          avatarUrl: profileData.avatar_url || '',
        });
      } else {
        setProfile({
          nome: user!.user_metadata?.nome || user!.email?.split('@')[0] || 'Atleta',
          cidade: '',
          avatarUrl: '',
        });
      }

      // 2. Fetch workout history for stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfWeek = getStartOfWeek(now).toISOString();

      // Get all workout history for this user
      const { data: historyData } = await supabase
        .from('tbHistorico')
        .select('id, created_at, carga_usada, repeticoes_feitas, serie_atual')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      // Get workout history this month  
      const { data: monthData } = await supabase
        .from('tbHistorico')
        .select('created_at')
        .eq('user_id', user!.id)
        .gte('created_at', startOfMonth);

      // Get workout history this week
      const { data: weekData } = await supabase
        .from('tbHistorico')
        .select('created_at, carga_usada, repeticoes_feitas')
        .eq('user_id', user!.id)
        .gte('created_at', startOfWeek);

      // Get completed workouts for the calendar
      const { data: completedData } = await supabase
        .from('tbTreinosCompletos')
        .select('concluido_em, dia')
        .eq('user_id', user!.id)
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

      // Total unique workout days all time
      const totalWorkoutsAllTime = new Set(
        (historyData || []).map(h => new Date(h.created_at).toDateString())
      ).size;

      // Compute fitPoints based on activity
      const fitPoints = computeFitPoints({
        totalWorkoutsAllTime,
        totalVolume: (historyData || []).reduce(
          (sum, h) => sum + (Number(h.carga_usada) || 0) * (h.repeticoes_feitas || 0),
          0
        ),
        streak,
        totalSeries: (historyData || []).length,
      });

      // Get fitPoints this week
      const { data: fitPointsWeekData } = await supabase
        .from('tbFitPoints')
        .select('ganho_em')
        .eq('user_id', user!.id)
        .gte('ganho_em', startOfWeek);

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

      setLoading(false);
    }

    fetchData();
  }, [user]);

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

function computeFitPoints(data: {
  totalWorkoutsAllTime: number;
  totalVolume: number;
  streak: number;
  totalSeries: number;
}): number {
  // Points formula:
  // 50 pts per unique workout day
  // 1pt per 100kg volume
  // 10pts per streak day
  // 5pts per series completed
  return Math.round(
    data.totalWorkoutsAllTime * 50 +
    data.totalVolume / 100 +
    data.streak * 10 +
    data.totalSeries * 5
  );
}
