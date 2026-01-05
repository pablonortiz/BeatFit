import { Routine, WorkoutSession } from '../types';

export type RootStackParamList = {
  Home: undefined;
  RoutinesList: undefined;
  CreateRoutine: { routine?: Routine };
  ViewRoutine: { routine: Routine };
  SelectStartPoint: { routine: Routine };
  ExecuteRoutine: { routine: Routine; startingIndex?: number };
  ExerciseManager: undefined;
  ManageExercises: undefined;
  WorkoutHistory: undefined;
  WorkoutDetail: { workout: WorkoutSession };
  Stats: undefined;
  Settings: undefined;
};
