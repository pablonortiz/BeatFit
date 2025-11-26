import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WORKOUT_STATE_KEY = "@beatfit_workout_state";
const NOTIFICATION_ID = "beatfit-workout-active";

interface WorkoutState {
  isActive: boolean;
  routineName: string;
  currentExercise: string;
  startTime: number;
  isPaused: boolean;
  pausedAt?: number;
  exerciseType: "time" | "reps";
  exerciseDuration?: number;
  exerciseStartTime: number;
  exerciseReps?: number;
  progress: number;
}

class WorkoutNotificationService {
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Iniciar el servicio de notificaciones de entrenamiento
   */
  async startWorkoutNotification(state: Omit<WorkoutState, "isActive">) {
    try {
      // Guardar estado en AsyncStorage
      const workoutState: WorkoutState = {
        ...state,
        isActive: true,
      };
      await AsyncStorage.setItem(WORKOUT_STATE_KEY, JSON.stringify(workoutState));

      // Crear notificación inicial
      await this.updateNotificationFromState(workoutState);

      // Iniciar actualización periódica
      if (!this.isRunning) {
        this.isRunning = true;
        this.updateInterval = setInterval(async () => {
          try {
            const savedState = await AsyncStorage.getItem(WORKOUT_STATE_KEY);
            if (savedState) {
              const state: WorkoutState = JSON.parse(savedState);
              if (state.isActive) {
                await this.updateNotificationFromState(state);
              }
            }
          } catch (error) {
            console.error("[WorkoutNotification] Error en actualización:", error);
          }
        }, 1000); // Actualizar cada segundo
      }
    } catch (error) {
      console.error("[WorkoutNotification] Error iniciando servicio:", error);
    }
  }

  /**
   * Actualizar el estado del entrenamiento
   */
  async updateWorkoutState(updates: Partial<Omit<WorkoutState, "isActive">>) {
    try {
      const savedState = await AsyncStorage.getItem(WORKOUT_STATE_KEY);
      if (savedState) {
        const currentState: WorkoutState = JSON.parse(savedState);
        const newState = { ...currentState, ...updates };
        await AsyncStorage.setItem(WORKOUT_STATE_KEY, JSON.stringify(newState));
      }
    } catch (error) {
      console.error("[WorkoutNotification] Error actualizando estado:", error);
    }
  }

  /**
   * Detener el servicio de notificaciones
   */
  async stopWorkoutNotification() {
    try {
      // Limpiar estado
      await AsyncStorage.removeItem(WORKOUT_STATE_KEY);

      // Detener intervalo
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
        this.isRunning = false;
      }

      // Cancelar notificación
      await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
    } catch (error) {
      console.error("[WorkoutNotification] Error deteniendo servicio:", error);
    }
  }

  /**
   * Actualizar notificación basándose en el estado
   */
  private async updateNotificationFromState(state: WorkoutState) {
    try {
      const now = Date.now();
      
      // Calcular tiempo total transcurrido
      let elapsedSeconds: number;
      if (state.isPaused && state.pausedAt) {
        elapsedSeconds = Math.floor((state.pausedAt - state.startTime) / 1000);
      } else {
        elapsedSeconds = Math.floor((now - state.startTime) / 1000);
      }

      // Calcular tiempo del ejercicio actual
      let exerciseTime = "";
      if (state.exerciseType === "time" && state.exerciseDuration) {
        const exerciseElapsed = Math.floor((now - state.exerciseStartTime) / 1000);
        const remaining = Math.max(0, state.exerciseDuration - exerciseElapsed);
        exerciseTime = this.formatTime(remaining);
      } else if (state.exerciseType === "reps" && state.exerciseReps) {
        exerciseTime = `${state.exerciseReps} reps`;
      }

      // Formatear tiempo total
      const totalTime = this.formatTime(elapsedSeconds);

      // Crear contenido de notificación
      const title = state.isPaused
        ? "⏸️ Entrenamiento en pausa"
        : "🏃 Entrenamiento en progreso";
      
      const progressPercent = Math.round(state.progress * 100);
      
      let body = `${state.routineName}\n`;
      body += `⏱️ Tiempo total: ${totalTime}\n`;
      body += `💪 ${state.currentExercise}`;
      if (exerciseTime) {
        body += ` • ${exerciseTime}`;
      }
      body += `\n📊 Progreso: ${progressPercent}%`;

      // Configuración de notificación
      const notificationContent: any = {
        title,
        body,
        sound: false,
        priority: Notifications.AndroidNotificationPriority.MAX,
        sticky: true,
        data: {
          type: "workout-progress",
          timestamp: now,
        },
      };

      if (Platform.OS === "android") {
        notificationContent.channelId = "workout";
        notificationContent.tag = NOTIFICATION_ID;
      }

      // Cancelar notificación anterior si existe
      try {
        await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
      } catch (e) {
        // Ignorar si no existe
      }

      // Programar nueva notificación
      await Notifications.scheduleNotificationAsync({
        identifier: NOTIFICATION_ID,
        content: notificationContent,
        trigger: null,
      });
    } catch (error) {
      console.error("[WorkoutNotification] Error actualizando notificación:", error);
    }
  }

  /**
   * Formatear tiempo en MM:SS
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  /**
   * Verificar si el servicio está activo
   */
  async isActive(): Promise<boolean> {
    try {
      const savedState = await AsyncStorage.getItem(WORKOUT_STATE_KEY);
      if (savedState) {
        const state: WorkoutState = JSON.parse(savedState);
        return state.isActive;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
}

export const workoutNotificationService = new WorkoutNotificationService();





