import { Routine, WorkoutSession } from '../types';

export type RootStackParamList = {
  Home: undefined;
  RoutinesList: undefined;
  CreateRoutine: { routine?: Routine };
  ViewRoutine: { routine: Routine };
  ExecuteRoutine: { routine: Routine };
  ExerciseManager: undefined;
  ManageExercises: undefined;
  WorkoutHistory: undefined;
  WorkoutDetail: { workout: WorkoutSession };
  Stats: undefined;
  Settings: undefined;
};
