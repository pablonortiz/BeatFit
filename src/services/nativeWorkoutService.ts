import { NativeModules, Platform } from 'react-native';

interface WorkoutData {
  routineName: string;
  currentExercise: string;
  startTime: number;
  isPaused: boolean;
  pausedAt?: number;
  totalPausedTime: number;
  exerciseType: 'time' | 'reps';
  exerciseDuration?: number;
  exerciseStartTime: number;
  exerciseReps?: number;
  progress: number;
}

// Obtener el módulo nativo directamente
const WorkoutNotificationService = NativeModules.WorkoutNotificationService;

// Log para debugging
console.log('[NativeWorkoutService] Platform:', Platform.OS);
console.log('[NativeWorkoutService] Available modules:', Object.keys(NativeModules));
console.log('[NativeWorkoutService] WorkoutNotificationService available:', !!WorkoutNotificationService);

class NativeWorkoutService {
  /**
   * Iniciar el servicio nativo de foreground
   * Este servicio actualiza la notificación cada segundo usando código nativo
   */
  async startService(data: WorkoutData): Promise<void> {
    try {
      console.log('[NativeWorkoutService] startService called with data:', data);
      console.log('[NativeWorkoutService] Platform:', Platform.OS);
      
      if (Platform.OS !== 'android') {
        console.warn('[NativeWorkoutService] Only available on Android');
        return;
      }
      
      if (!WorkoutNotificationService) {
        console.error('[NativeWorkoutService] ❌ WorkoutNotificationService native module NOT AVAILABLE!');
        console.log('[NativeWorkoutService] Available NativeModules:', Object.keys(NativeModules).sort());
        console.warn('[NativeWorkoutService] ⚠️  The module needs to be registered in MainApplication.java');
        console.warn('[NativeWorkoutService] 📝 Add this to MainApplication.java:');
        console.warn('[NativeWorkoutService]    import com.beatfit.workoutnotification.WorkoutNotificationPackage;');
        console.warn('[NativeWorkoutService]    packages.add(new WorkoutNotificationPackage());');
        return;
      }

      console.log('[NativeWorkoutService] ✅ Module found! Calling native startService...');

      const result = await WorkoutNotificationService.startService({
        routineName: data.routineName,
        currentExercise: data.currentExercise,
        startTime: data.startTime,
        isPaused: data.isPaused,
        pausedAt: data.pausedAt || -1,
        totalPausedTime: data.totalPausedTime,
        exerciseType: data.exerciseType,
        exerciseDuration: data.exerciseDuration || -1,
        exerciseStartTime: data.exerciseStartTime,
        exerciseReps: data.exerciseReps || -1,
        progress: data.progress,
      });
      
      console.log('[NativeWorkoutService] startService result:', result);
    } catch (error) {
      console.error('[NativeWorkoutService] Error starting service:', error);
      console.error('[NativeWorkoutService] Error details:', JSON.stringify(error, null, 2));
      // No lanzar error para que la app continúe funcionando
    }
  }

  /**
   * Actualizar datos del workout en el servicio nativo
   */
  async updateWorkoutData(data: WorkoutData): Promise<void> {
    try {
      if (!WorkoutNotificationService) {
        console.warn('WorkoutNotificationService native module not available - running in development mode');
        return;
      }

      await WorkoutNotificationService.updateWorkoutData({
        routineName: data.routineName,
        currentExercise: data.currentExercise,
        startTime: data.startTime,
        isPaused: data.isPaused,
        pausedAt: data.pausedAt || -1,
        totalPausedTime: data.totalPausedTime,
        exerciseType: data.exerciseType,
        exerciseDuration: data.exerciseDuration || -1,
        exerciseStartTime: data.exerciseStartTime,
        exerciseReps: data.exerciseReps || -1,
        progress: data.progress,
      });
    } catch (error) {
      console.error('[NativeWorkoutService] Error updating workout data:', error);
      throw error;
    }
  }

  /**
   * Detener el servicio nativo
   */
  async stopService(): Promise<void> {
    try {
      if (!WorkoutNotificationService) {
        console.warn('WorkoutNotificationService native module not available');
        return;
      }

      await WorkoutNotificationService.stopService();
    } catch (error) {
      console.error('[NativeWorkoutService] Error stopping service:', error);
    }
  }
}

export const nativeWorkoutService = new NativeWorkoutService();

