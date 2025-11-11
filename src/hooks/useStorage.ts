import { useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storage';
import { ExerciseTemplate, Routine } from '../types';

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
