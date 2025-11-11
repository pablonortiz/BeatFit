import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExerciseTemplate, Routine, AppState, WorkoutSession } from '../types';

// Interfaz para el servicio de almacenamiento
// Esto permite cambiar fácilmente de AsyncStorage a una base de datos remota
export interface StorageService {
  // Ejercicios
  getExercises(): Promise<ExerciseTemplate[]>;
  saveExercise(exercise: ExerciseTemplate): Promise<void>;
  deleteExercise(id: string): Promise<void>;

  // Rutinas
  getRoutines(): Promise<Routine[]>;
  saveRoutine(routine: Routine): Promise<void>;
  deleteRoutine(id: string): Promise<void>;
  updateRoutine(routine: Routine): Promise<void>;

  // Historial de entrenamientos
  getWorkoutHistory(): Promise<WorkoutSession[]>;
  saveWorkoutSession(session: WorkoutSession): Promise<void>;
  deleteWorkoutSession(id: string): Promise<void>;
  clearWorkoutHistory(): Promise<void>;

  // Estado completo
  getAppState(): Promise<AppState>;
  clearAll(): Promise<void>;
}

// Implementación con AsyncStorage (local)
class LocalStorageService implements StorageService {
  private EXERCISES_KEY = '@BeatFit:exercises';
  private ROUTINES_KEY = '@BeatFit:routines';
  private WORKOUT_HISTORY_KEY = '@BeatFit:workout_history';

  async getExercises(): Promise<ExerciseTemplate[]> {
    try {
      const data = await AsyncStorage.getItem(this.EXERCISES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading exercises:', error);
      return [];
    }
  }

  async saveExercise(exercise: ExerciseTemplate): Promise<void> {
    try {
      const exercises = await this.getExercises();
      const existingIndex = exercises.findIndex(e => e.id === exercise.id);

      if (existingIndex >= 0) {
        exercises[existingIndex] = exercise;
      } else {
        exercises.push(exercise);
      }

      await AsyncStorage.setItem(this.EXERCISES_KEY, JSON.stringify(exercises));
    } catch (error) {
      console.error('Error saving exercise:', error);
      throw error;
    }
  }

  async deleteExercise(id: string): Promise<void> {
    try {
      const exercises = await this.getExercises();
      const filtered = exercises.filter(e => e.id !== id);
      await AsyncStorage.setItem(this.EXERCISES_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting exercise:', error);
      throw error;
    }
  }

  async getRoutines(): Promise<Routine[]> {
    try {
      const data = await AsyncStorage.getItem(this.ROUTINES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading routines:', error);
      return [];
    }
  }

  async saveRoutine(routine: Routine): Promise<void> {
    try {
      const routines = await this.getRoutines();
      const existingIndex = routines.findIndex(r => r.id === routine.id);

      if (existingIndex >= 0) {
        routines[existingIndex] = routine;
      } else {
        routines.push(routine);
      }

      await AsyncStorage.setItem(this.ROUTINES_KEY, JSON.stringify(routines));
    } catch (error) {
      console.error('Error saving routine:', error);
      throw error;
    }
  }

  async updateRoutine(routine: Routine): Promise<void> {
    await this.saveRoutine(routine);
  }

  async deleteRoutine(id: string): Promise<void> {
    try {
      const routines = await this.getRoutines();
      const filtered = routines.filter(r => r.id !== id);
      await AsyncStorage.setItem(this.ROUTINES_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting routine:', error);
      throw error;
    }
  }

  async getWorkoutHistory(): Promise<WorkoutSession[]> {
    try {
      const data = await AsyncStorage.getItem(this.WORKOUT_HISTORY_KEY);
      const history = data ? JSON.parse(data) : [];
      // Ordenar por fecha (más recientes primero)
      return history.sort((a: WorkoutSession, b: WorkoutSession) => b.completedAt - a.completedAt);
    } catch (error) {
      console.error('Error loading workout history:', error);
      return [];
    }
  }

  async saveWorkoutSession(session: WorkoutSession): Promise<void> {
    try {
      const history = await this.getWorkoutHistory();
      history.push(session);
      await AsyncStorage.setItem(this.WORKOUT_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving workout session:', error);
      throw error;
    }
  }

  async deleteWorkoutSession(id: string): Promise<void> {
    try {
      const history = await this.getWorkoutHistory();
      const filtered = history.filter(s => s.id !== id);
      await AsyncStorage.setItem(this.WORKOUT_HISTORY_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting workout session:', error);
      throw error;
    }
  }

  async clearWorkoutHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.WORKOUT_HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing workout history:', error);
      throw error;
    }
  }

  async getAppState(): Promise<AppState> {
    const [exercises, routines, workoutHistory] = await Promise.all([
      this.getExercises(),
      this.getRoutines(),
      this.getWorkoutHistory(),
    ]);

    return { exercises, routines, workoutHistory };
  }

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      this.EXERCISES_KEY,
      this.ROUTINES_KEY,
      this.WORKOUT_HISTORY_KEY,
    ]);
  }
}

// TODO: Implementación futura con base de datos remota
// class RemoteStorageService implements StorageService {
//   private apiUrl = 'https://api.beatfit.com';
//
//   async getExercises(): Promise<ExerciseTemplate[]> {
//     // Implementar llamada a API
//   }
//   // ... resto de métodos
// }

// Exportar instancia del servicio
// Para cambiar a base de datos remota, simplemente cambiar esta línea:
export const storageService: StorageService = new LocalStorageService();

// Flag para indicar si estamos usando almacenamiento remoto
export const isUsingRemoteStorage = false;
