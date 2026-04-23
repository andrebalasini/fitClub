import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface WorkoutConfig {
  fichaId: string;
  dia: string;
  grupos: string[];
}

interface WorkoutContextType {
  workoutConfig: WorkoutConfig | null;
  startWorkout: (config: WorkoutConfig) => void;
  endWorkout: () => void;
  isMinimized: boolean;
  setIsMinimized: (val: boolean) => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = '@fitClub:activeWorkout';
const MINIMIZED_STORAGE_KEY = '@fitClub:workoutMinimized';

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [workoutConfig, setWorkoutConfig] = useState<WorkoutConfig | null>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(MINIMIZED_STORAGE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (workoutConfig) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(workoutConfig));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [workoutConfig]);

  useEffect(() => {
    localStorage.setItem(MINIMIZED_STORAGE_KEY, String(isMinimized));
  }, [isMinimized]);

  const clearActiveWorkoutState = () => {
    const keys = [
        '@fw:currentIndex', '@fw:currentSetIndex', '@fw:focusedIndex',
        '@fw:workoutStarted', '@fw:workoutStartTime',
        '@fw:sessionHistoryIds', '@fw:isResting',
        '@fw:restEndTime', '@fw:completedIndices', '@fw:setsLoggedByIndex'
    ];
    keys.forEach(k => localStorage.removeItem(k));
  };

  const startWorkout = (config: WorkoutConfig) => {
    clearActiveWorkoutState();
    setWorkoutConfig(config);
    setIsMinimized(false);
  };

  const endWorkout = () => {
    setWorkoutConfig(null);
    setIsMinimized(false);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(MINIMIZED_STORAGE_KEY);
    clearActiveWorkoutState();
  };

  return (
    <WorkoutContext.Provider value={{
      workoutConfig,
      startWorkout,
      endWorkout,
      isMinimized,
      setIsMinimized
    }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useActiveWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) {
    throw new Error('useActiveWorkout must be used within a WorkoutProvider');
  }
  return ctx;
}
