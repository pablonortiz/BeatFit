import { Routine, WorkoutSession } from '../types';

export type RootStackParamList = {
  Home: undefined;
  RoutinesList: undefined;
  CreateRoutine: { mode: 'full' | 'dynamic'; routine?: Routine };
  ExecuteRoutine: { routine: Routine; mode: 'full' | 'dynamic' };
  ExerciseManager: undefined;
  ManageExercises: undefined;
  WorkoutHistory: undefined;
  WorkoutDetail: { workout: WorkoutSession };
  Stats: undefined;
};
