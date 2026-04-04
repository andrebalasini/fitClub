import { useEffect } from 'react';
import { useActiveWorkout } from '../contexts/WorkoutContext';
import { ActiveWorkout } from '../pages/ActiveWorkout';
import { useLocation, useNavigate } from 'react-router-dom';

export function ActiveWorkoutWrapper() {
  const { workoutConfig } = useActiveWorkout();
  const location = useLocation();
  const navigate = useNavigate();
  
  const isActiveRoute = location.pathname === '/treino/executar';

  useEffect(() => {
    if (isActiveRoute && !workoutConfig) {
      // User hit back button to workout route but workout is ended
      navigate('/treino', { replace: true });
    }
  }, [isActiveRoute, workoutConfig, navigate]);
  
  if (!workoutConfig) return null;
  
  return (
    <div 
      className={`fixed inset-0 z-50 transition-opacity duration-300 bg-[#0f141e] overflow-y-auto ${!isActiveRoute ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <ActiveWorkout />
    </div>
  );
}
