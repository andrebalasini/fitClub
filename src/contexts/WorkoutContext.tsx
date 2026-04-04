import { createContext, useContext, useState } from 'react';
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

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [workoutConfig, setWorkoutConfig] = useState<WorkoutConfig | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const startWorkout = (config: WorkoutConfig) => {
    setWorkoutConfig(config);
    setIsMinimized(false);
  };

  const endWorkout = () => {
    setWorkoutConfig(null);
    setIsMinimized(false);
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
