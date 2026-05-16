import { useEffect, useState } from 'react';
import { useActiveWorkout } from '../contexts/WorkoutContext';
import { ForgottenWorkoutModal, type ForgottenWorkoutData } from './ForgottenWorkoutModal';
import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';

export function ForgottenWorkoutManager() {
    const { user, loading: authLoading } = useAuth();
    const { checkForForgottenWorkout, clearForgottenWorkout } = useActiveWorkout();
    const [forgottenData, setForgottenData] = useState<ForgottenWorkoutData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Check when auth resolves and user is present
    useEffect(() => {
        if (!authLoading && user) {
            // Slight delay to allow app context hydration
            const timer = setTimeout(() => {
                const data = checkForForgottenWorkout();
                if (data) {
                    setForgottenData(data);
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [authLoading, user, checkForForgottenWorkout]);

    if (!forgottenData || !user) return null;

    const handleDiscard = async () => {
        setIsProcessing(true);
        try {
            if (forgottenData.startTime) {
                const startDate = new Date(forgottenData.startTime).toISOString();
                await supabase
                    .from('tbHistorico')
                    .delete()
                    .eq('user_id', getCurrentUserId())
                    .eq('ficha_id', forgottenData.fichaId)
                    .eq('dia', forgottenData.dia)
                    .gte('created_at', startDate);
            } else if (forgottenData.sessionHistoryIds.length > 0) {
                const validIds = forgottenData.sessionHistoryIds.filter(id => id.includes('-'));
                if (validIds.length > 0) {
                    await supabase
                        .from('tbHistorico')
                        .delete()
                        .in('id', validIds);
                }
            }
        } catch (err) {
            console.error('Failed to discard forgotten history:', err);
        } finally {
            clearForgottenWorkout();
            setForgottenData(null);
            setIsProcessing(false);
        }
    };

    const handleConfirm = async (adjustedDurationSeconds: number) => {
        setIsProcessing(true);
        let points = 100; // Treat as completion or 50? The user mentioned confirming saves it to history. Let's mirror the full completion points structure but cap or adjust if needed. Let's use 75 as it was "forgotten" but confirmed, or just use 100 as per usual. Actually let's follow standard flow from ActiveWorkout: 100 points.
        
        try {
            const uid = getCurrentUserId();
            
            // Standard double-dip prevention
            const { data: lastWorkout } = await supabase
                .from('tbTreinosCompletos')
                .select('concluido_em')
                .eq('user_id', uid)
                .order('concluido_em', { ascending: false })
                .limit(1);

            if (lastWorkout && lastWorkout.length > 0) {
                const lastDate = new Date(lastWorkout[0].concluido_em).toDateString();
                const today = new Date().toDateString();
                if (lastDate === today) {
                    points = 0;
                }
            }

            // Ensure timestamp reflects the estimated end time calculated, not RIGHT NOW.
            // Wait, the prompt said "End_Time gravado no banco de dados não deve ser o horário atual, mas sim: (Horário do check da última série + 5 minutos)."
            // Since our estimatedDuration is essentially that (lastActionTime - startTime + 300s), 
            // the effective "end timestamp" is exactly startTime + (adjustedDuration * 1000).
            const effectiveEndTime = new Date(forgottenData.startTime + (adjustedDurationSeconds * 1000));

            await supabase.from('tbTreinosCompletos').insert({
                user_id: uid,
                ficha_id: forgottenData.fichaId,
                dia: forgottenData.dia,
                duracao_segundos: adjustedDurationSeconds,
                // Override default created_at/concluido_em if column supports it. Usually it inherits DB default now().
                // Let's check existing column names in db schema or use the explicit concluido_em override.
                concluido_em: effectiveEndTime.toISOString()
            });
            
            if (points > 0) {
                await supabase.from('tbFitPoints').insert({
                    user_id: uid,
                    pontos: points,
                    motivo: 'treino_recuperado'
                });
            }
        } catch (err) {
            console.error('Error saving forgotten workout:', err);
        } finally {
            clearForgottenWorkout();
            setForgottenData(null);
            setIsProcessing(false);
        }
    };

    return (
        <ForgottenWorkoutModal
            data={forgottenData}
            onConfirm={handleConfirm}
            onDiscard={handleDiscard}
            isSaving={isProcessing}
        />
    );
}
