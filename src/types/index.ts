// Tipos de ejercicios
export type ExerciseType = 'time' | 'reps';
export type ActivityType = 'exercise' | 'rest';

// Iconos disponibles para ejercicios
export type ExerciseIcon =
  | 'fitness'
  | 'run'
  | 'walk'
  | 'bicycle'
  | 'body'
  | 'barbell'
  | 'heart'
  | 'timer'
  | 'water'
  | 'nutrition'
  | 'accessibility'
  | 'time-outline'
  | 'pause'
  | 'play'
  | 'stop';

// Ejercicio guardado (plantilla)
export interface ExerciseTemplate {
  id: string;
  name: string;
  icon: ExerciseIcon;
  createdAt: number;
  lastUsed?: number;
}

// Actividad individual en una rutina
export interface Activity {
  id: string;
  type: ActivityType;
  exerciseTemplateId?: string; // Referencia al ejercicio guardado
  name: string;
  icon: ExerciseIcon;
  exerciseType: ExerciseType; // 'time' o 'reps'
  duration?: number; // en segundos (para type='time')
  reps?: number; // número de repeticiones (para type='reps')
}

// Bloque de ejercicios con repeticiones
export interface Block {
  id: string;
  name?: string;
  activities: Activity[];
  repetitions: number; // Cuántas veces se repite este bloque
}

// Rutina completa
export interface Routine {
  id: string;
  name: string;
  blocks: Block[];
  createdAt: number;
  lastUsed?: number;
  syncedToCloud?: boolean; // Para futuro sync con base de datos
}

// Estado de ejecución de una rutina
export interface RoutineExecutionState {
  routineId: string;
  currentBlockIndex: number;
  currentBlockRepetition: number; // Qué repetición del bloque actual
  currentActivityIndex: number;
  isPaused: boolean;
  isComplete: boolean;
  startedAt?: number;
  completedAt?: number;
}

// Modo de creación de rutina
export type RoutineMode = 'full' | 'dynamic'; // 'full' = armar completa, 'dynamic' = ejercicio por ejercicio

// Estado global de la app
export interface AppState {
  exercises: ExerciseTemplate[];
  routines: Routine[];
}
