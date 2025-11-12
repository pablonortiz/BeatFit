import { WorkoutSession } from '../types';

/**
 * Calcular el mejor tiempo (menor duración) para una rutina específica
 */
export function getBestTimeForRoutine(routineId: string, history: WorkoutSession[]): number | null {
  const routineWorkouts = history.filter(
    (workout) => workout.routineId === routineId && workout.completedActivities === workout.totalActivities
  );

  if (routineWorkouts.length === 0) {
    return null;
  }

  return Math.min(...routineWorkouts.map((w) => w.duration));
}

/**
 * Verificar si un workout es el mejor tiempo para su rutina
 */
export function isBestTime(workout: WorkoutSession, history: WorkoutSession[]): boolean {
  // Solo considerar si completó todos los ejercicios
  if (workout.completedActivities !== workout.totalActivities) {
    return false;
  }

  const bestTime = getBestTimeForRoutine(workout.routineId, history);
  return bestTime !== null && workout.duration === bestTime;
}

/**
 * Obtener todas las estadísticas de una rutina
 */
export function getRoutineStats(routineId: string, history: WorkoutSession[]) {
  const routineWorkouts = history.filter((w) => w.routineId === routineId);

  if (routineWorkouts.length === 0) {
    return {
      totalCompletions: 0,
      bestTime: null,
      averageTime: null,
      lastCompleted: null,
    };
  }

  const completedWorkouts = routineWorkouts.filter(
    (w) => w.completedActivities === w.totalActivities
  );

  const bestTime =
    completedWorkouts.length > 0
      ? Math.min(...completedWorkouts.map((w) => w.duration))
      : null;

  const averageTime =
    completedWorkouts.length > 0
      ? Math.round(
          completedWorkouts.reduce((sum, w) => sum + w.duration, 0) / completedWorkouts.length
        )
      : null;

  const lastCompleted = routineWorkouts.sort((a, b) => b.completedAt - a.completedAt)[0];

  return {
    totalCompletions: routineWorkouts.length,
    bestTime,
    averageTime,
    lastCompleted: lastCompleted?.completedAt || null,
  };
}
