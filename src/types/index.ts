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
  estimatedTime?: number; // tiempo estimado en segundos (para cálculos)
}

// Tipos de bloques
export type BlockType = 'normal' | 'warmup' | 'cooldown' | 'rest-block';

// Bloque de ejercicios con repeticiones
export interface Block {
  id: string;
  name?: string;
  activities: Activity[];
  repetitions: number; // Cuántas veces se repite este bloque
  type?: BlockType; // Tipo de bloque: normal, warmup (calentamiento), cooldown (elongación)
  restBetweenReps?: number; // Descanso en segundos entre repeticiones del bloque (opcional)
}

// Rutina completa
export interface Routine {
  id: string;
  name: string;
  blocks: Block[];
  createdAt: number;
  lastUsed?: number;
  order?: number; // Orden personalizado por el usuario
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

// Estados de una actividad ejecutada
export type ActivityExecutionStatus = 'completed' | 'skipped' | 'postponed';

// Actividad ejecutada con información de ejecución
export interface ExecutedActivity {
  activity: Activity;
  blockIndex: number;
  blockName: string;
  blockRepetition: number;
  status: ActivityExecutionStatus;
  startedAt?: number; // Timestamp de cuando empezó
  completedAt?: number; // Timestamp de cuando terminó
  postponedAt?: number; // Timestamp de cuando se postergó (si fue postergada)
  wasPostponed: boolean; // Si esta actividad fue postergada antes
  pausedTime?: number; // Tiempo total pausado en esta actividad (en segundos)
}

// Entrenamiento completado (historial)
export interface WorkoutSession {
  id: string;
  routineId: string;
  routineName: string;
  startedAt: number;
  completedAt: number;
  duration: number; // Duración total en segundos
  totalActivities: number;
  completedActivities: number;
  blocks: Block[]; // Copia de los bloques al momento de hacer el entrenamiento
  executionTimeline?: ExecutedActivity[]; // Línea de tiempo real de ejecución
  syncedToCloud?: boolean;
}

// Estadísticas agregadas
export interface WorkoutStats {
  totalWorkouts: number;
  totalTime: number; // Tiempo total en segundos
  totalActivities: number;
  averageWorkoutDuration: number;
  favoriteRoutine?: {
    routineId: string;
    routineName: string;
    count: number;
  };
  mostUsedExercises: {
    name: string;
    icon: ExerciseIcon;
    count: number;
  }[];
  workoutsByWeek: number;
  workoutsByMonth: number;
  currentStreak: number; // Días consecutivos con entrenamientos
  longestStreak: number;
  lastWorkoutDate?: number;
}

// Estado global de la app
export interface AppState {
  exercises: ExerciseTemplate[];
  routines: Routine[];
  workoutHistory: WorkoutSession[];
}
