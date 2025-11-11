import { Routine } from '../types';

export type RootStackParamList = {
  Home: undefined;
  RoutinesList: undefined;
  CreateRoutine: { mode: 'full' | 'dynamic' };
  EditRoutine: { routine: Routine };
  ExecuteRoutine: { routine: Routine; mode: 'full' | 'dynamic' };
  ExerciseManager: undefined;
};
