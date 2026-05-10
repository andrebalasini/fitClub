import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { ForgottenWorkoutData } from '../components/ForgottenWorkoutModal';

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
  /** Updates the timestamp of the last user action (set logged, exercise completed, etc.) */
  recordAction: () => void;
  /** Checks if there's a forgotten workout and returns its data if so */
  checkForForgottenWorkout: () => ForgottenWorkoutData | null;
  /** Clears the forgotten workout state without saving */
  clearForgottenWorkout: () => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = '@fitClub:activeWorkout';
const MINIMIZED_STORAGE_KEY = '@fitClub:workoutMinimized';

/** 30 minutes in milliseconds */
const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000;

/** 5 minutes in seconds — added to lastAction to estimate real end time */
const END_TIME_BUFFER_SECONDS = 5 * 60;

const FW_KEYS = [
    '@fw:currentIndex', '@fw:currentSetIndex', '@fw:focusedIndex',
    '@fw:workoutStarted', '@fw:workoutStartTime',
    '@fw:sessionHistoryIds', '@fw:isResting',
    '@fw:restEndTime', '@fw:completedIndices', '@fw:setsLoggedByIndex',
    '@fw:cardioState', '@fw:cardioEndTime', '@fw:cardioRemainingDuration',
    '@fw:currentRestPhrase', '@fw:lastActionTime'
];

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
    FW_KEYS.forEach(k => localStorage.removeItem(k));
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

  const recordAction = useCallback(() => {
    localStorage.setItem('@fw:lastActionTime', Date.now().toString());
  }, []);

  /**
   * Checks if the current workout in localStorage is "forgotten" (inactive > 30 min).
   * Returns the workout recovery data if so, null otherwise.
   *
   * Critical exception: If a Cardio timer is running (`cardioState === 'running'` and
   * `cardioEndTime` is in the future), inactivity check is skipped.
   */
  const checkForForgottenWorkout = useCallback((): ForgottenWorkoutData | null => {
    try {
      const configRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!configRaw) return null;

      const config: WorkoutConfig = JSON.parse(configRaw);
      
      const workoutStarted = localStorage.getItem('@fw:workoutStarted') === 'true';
      if (!workoutStarted) return null;

      const startTimeRaw = localStorage.getItem('@fw:workoutStartTime');
      if (!startTimeRaw) return null;
      const startTime = parseInt(startTimeRaw, 10);

      const lastActionRaw = localStorage.getItem('@fw:lastActionTime');
      // If no action was ever recorded, use start time as fallback
      const lastActionTime = lastActionRaw ? parseInt(lastActionRaw, 10) : startTime;

      const now = Date.now();
      const inactiveMs = now - lastActionTime;

      // Exception: If cardio timer is currently running, don't flag as forgotten
      const cardioState = localStorage.getItem('@fw:cardioState');
      const cardioEndTimeRaw = localStorage.getItem('@fw:cardioEndTime');
      if (cardioState === 'running' && cardioEndTimeRaw) {
        const cardioEndTime = parseInt(cardioEndTimeRaw, 10);
        if (cardioEndTime > now) {
          // Cardio is still running — not forgotten
          return null;
        }
      }

      // Check if inactive for more than 30 minutes
      if (inactiveMs < INACTIVITY_THRESHOLD_MS) {
        return null;
      }

      // It's forgotten! Build the recovery data.
      let completedCount = 0;
      let totalCount = 0;
      try {
        const completedIndices: number[] = JSON.parse(localStorage.getItem('@fw:completedIndices') || '[]');
        completedCount = completedIndices.length;
        // Total count is harder without fetching DB. We use setsLoggedByIndex keys as a proxy.
        // The caller can override with the real count if needed.
        const setsLogged: Record<string, number> = JSON.parse(localStorage.getItem('@fw:setsLoggedByIndex') || '{}');
        // Estimate total from the highest index we've seen + 1
        const allIndices = Object.keys(setsLogged).map(Number);
        if (allIndices.length > 0) {
          totalCount = Math.max(...allIndices) + 1;
        }
        // Ensure totalCount is at least as large as completedCount
        totalCount = Math.max(totalCount, completedCount);
      } catch {
        // ignore
      }

      let sessionHistoryIds: string[] = [];
      try {
        sessionHistoryIds = JSON.parse(localStorage.getItem('@fw:sessionHistoryIds') || '[]');
      } catch {
        // ignore
      }

      // Estimated duration: (lastAction - startTime) + 5 minutes buffer
      const rawDuration = Math.floor((lastActionTime - startTime) / 1000);
      const estimatedDurationSeconds = rawDuration + END_TIME_BUFFER_SECONDS;

      return {
        grupos: config.grupos,
        dia: config.dia,
        fichaId: config.fichaId,
        startTime,
        lastActionTime,
        estimatedDurationSeconds: Math.max(estimatedDurationSeconds, 60), // At least 1 min
        completedCount,
        totalCount: totalCount || 1,
        sessionHistoryIds,
      };
    } catch {
      return null;
    }
  }, []);

  const clearForgottenWorkout = useCallback(() => {
    setWorkoutConfig(null);
    setIsMinimized(false);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(MINIMIZED_STORAGE_KEY);
    clearActiveWorkoutState();
  }, []);

  return (
    <WorkoutContext.Provider value={{
      workoutConfig,
      startWorkout,
      endWorkout,
      isMinimized,
      setIsMinimized,
      recordAction,
      checkForForgottenWorkout,
      clearForgottenWorkout
    }}>
      {children}
    </WorkoutContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useActiveWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) {
    throw new Error('useActiveWorkout must be used within a WorkoutProvider');
  }
  return ctx;
}
