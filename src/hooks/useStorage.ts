import { useState, useEffect, useCallback, useMemo } from 'react';
import { storageService } from '../services/storage';
import { ExerciseTemplate, Routine, WorkoutSession, WorkoutStats } from '../types';

export function useExercises() {
  const [exercises, setExercises] = useState<ExerciseTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    const data = await storageService.getExercises();
    setExercises(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const saveExercise = useCallback(async (exercise: ExerciseTemplate) => {
    await storageService.saveExercise(exercise);
    await loadExercises();
  }, [loadExercises]);

  const deleteExercise = useCallback(async (id: string) => {
    await storageService.deleteExercise(id);
    await loadExercises();
  }, [loadExercises]);

  return {
    exercises,
    loading,
    saveExercise,
    deleteExercise,
    refresh: loadExercises,
  };
}

export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoutines = useCallback(async () => {
    setLoading(true);
    const data = await storageService.getRoutines();
    setRoutines(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  const saveRoutine = useCallback(async (routine: Routine) => {
    await storageService.saveRoutine(routine);
    await loadRoutines();
  }, [loadRoutines]);

  const updateRoutine = useCallback(async (routine: Routine) => {
    await storageService.updateRoutine(routine);
    await loadRoutines();
  }, [loadRoutines]);

  const deleteRoutine = useCallback(async (id: string) => {
    await storageService.deleteRoutine(id);
    await loadRoutines();
  }, [loadRoutines]);

  return {
    routines,
    loading,
    saveRoutine,
    updateRoutine,
    deleteRoutine,
    refresh: loadRoutines,
  };
}

export function useWorkoutHistory() {
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const data = await storageService.getWorkoutHistory();
    setHistory(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const saveWorkout = useCallback(async (session: WorkoutSession) => {
    await storageService.saveWorkoutSession(session);
    await loadHistory();
  }, [loadHistory]);

  const deleteWorkout = useCallback(async (id: string) => {
    await storageService.deleteWorkoutSession(id);
    await loadHistory();
  }, [loadHistory]);

  const clearHistory = useCallback(async () => {
    await storageService.clearWorkoutHistory();
    await loadHistory();
  }, [loadHistory]);

  return {
    history,
    loading,
    saveWorkout,
    deleteWorkout,
    clearHistory,
    refresh: loadHistory,
  };
}

export function useWorkoutStats() {
  const { history, loading } = useWorkoutHistory();

  const stats: WorkoutStats = useMemo(() => {
    if (history.length === 0) {
      return {
        totalWorkouts: 0,
        totalTime: 0,
        totalActivities: 0,
        averageWorkoutDuration: 0,
        mostUsedExercises: [],
        workoutsByWeek: 0,
        workoutsByMonth: 0,
        currentStreak: 0,
        longestStreak: 0,
      };
    }

    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Totales
    const totalWorkouts = history.length;
    const totalTime = history.reduce((sum, w) => sum + w.duration, 0);
    const totalActivities = history.reduce((sum, w) => sum + w.completedActivities, 0);
    const averageWorkoutDuration = totalTime / totalWorkouts;

    // Workouts por semana y mes
    const workoutsByWeek = history.filter(w => w.completedAt >= oneWeekAgo).length;
    const workoutsByMonth = history.filter(w => w.completedAt >= oneMonthAgo).length;

    // Rutina favorita
    const routineCounts = history.reduce((acc, w) => {
      acc[w.routineId] = acc[w.routineId] || { routineId: w.routineId, routineName: w.routineName, count: 0 };
      acc[w.routineId].count++;
      return acc;
    }, {} as Record<string, { routineId: string; routineName: string; count: number }>);

    const favoriteRoutine = Object.values(routineCounts).sort((a, b) => b.count - a.count)[0];

    // Ejercicios más usados
    const exerciseCounts = history.reduce((acc, workout) => {
      workout.blocks.forEach(block => {
        block.activities.forEach(activity => {
          if (activity.type === 'exercise') {
            const key = activity.name;
            if (!acc[key]) {
              acc[key] = { name: activity.name, icon: activity.icon, count: 0 };
            }
            acc[key].count += block.repetitions;
          }
        });
      });
      return acc;
    }, {} as Record<string, { name: string; icon: any; count: number }>);

    const mostUsedExercises = Object.values(exerciseCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Rachas
    const sortedHistory = [...history].sort((a, b) => a.completedAt - b.completedAt);
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    sortedHistory.forEach(workout => {
      const workoutDate = new Date(workout.completedAt);
      workoutDate.setHours(0, 0, 0, 0);

      if (!lastDate) {
        tempStreak = 1;
      } else {
        const diffDays = Math.floor((workoutDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }

      longestStreak = Math.max(longestStreak, tempStreak);
      lastDate = workoutDate;
    });

    // Current streak (verificar si el último entrenamiento fue ayer o hoy)
    if (history.length > 0) {
      const lastWorkout = new Date(history[0].completedAt);
      lastWorkout.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastWorkout.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        currentStreak = tempStreak;
      }
    }

    return {
      totalWorkouts,
      totalTime,
      totalActivities,
      averageWorkoutDuration,
      favoriteRoutine,
      mostUsedExercises,
      workoutsByWeek,
      workoutsByMonth,
      currentStreak,
      longestStreak,
      lastWorkoutDate: history[0]?.completedAt,
    };
  }, [history]);

  return {
    stats,
    loading,
  };
}
