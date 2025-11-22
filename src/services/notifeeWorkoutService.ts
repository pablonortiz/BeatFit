import notifee, { AndroidImportance, AndroidStyle, EventType } from '@notifee/react-native';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WORKOUT_STATE_KEY = '@beatfit_workout_state';
const CHANNEL_ID = 'workout-foreground';
const NOTIFICATION_ID = 'beatfit-workout';

interface WorkoutState {
  isActive: boolean;
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

class NotifeeWorkoutService {
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Inicializar el servicio y crear el canal de notificaciones
   */
  async initialize() {
    try {
      // Crear canal de notificaciones de alta prioridad
      await notifee.createChannel({
        id: CHANNEL_ID,
        name: 'Entrenamiento en Progreso',
        importance: AndroidImportance.HIGH,
        sound: undefined, // Sin sonido para actualizaciones
        vibration: false,
      });

      // Configurar listeners de eventos
      notifee.onForegroundEvent(async ({ type, detail }) => {
        if (type === EventType.PRESS) {
          // Usuario tocó la notificación - traer app al frente
          console.log('[Notifee] Notification pressed');
        }
      });
    } catch (error) {
      console.error('[Notifee] Error al inicializar:', error);
    }
  }

  /**
   * Iniciar foreground service con notificación
   */
  async startWorkoutNotification(state: Omit<WorkoutState, 'isActive'>) {
    try {
      await this.initialize();

      // Guardar estado
      const workoutState: WorkoutState = {
        ...state,
        isActive: true,
      };
      await AsyncStorage.setItem(WORKOUT_STATE_KEY, JSON.stringify(workoutState));

      // Iniciar foreground service de Notifee
      // Esto mantiene el servicio activo en segundo plano
      await notifee.startForegroundService({
        id: NOTIFICATION_ID,
        title: '🏃 Entrenamiento en progreso',
        body: 'Iniciando...',
        android: {
          channelId: CHANNEL_ID,
          asForegroundService: true,
        },
      });

      // Mostrar notificación inicial
      await this.displayNotification(workoutState);

      // Iniciar actualización continua
      this.startUpdating();
    } catch (error) {
      console.error('[Notifee] Error iniciando workout notification:', error);
    }
  }

  /**
   * Iniciar intervalo de actualización
   * Nota: JavaScript se pausa en background, pero el foreground service mantiene
   * el servicio activo. La notificación se actualiza cuando JavaScript puede ejecutarse.
   */
  private startUpdating() {
    if (this.isRunning) return;

    this.isRunning = true;
    
    // Actualizar cada segundo cuando sea posible
    // Con foreground service, Android puede permitir ejecuciones más frecuentes
    this.updateInterval = setInterval(async () => {
      try {
        const savedState = await AsyncStorage.getItem(WORKOUT_STATE_KEY);
        if (savedState) {
          const state: WorkoutState = JSON.parse(savedState);
          if (state.isActive) {
            // Actualizar notificación - el foreground service permite esto
            await this.displayNotification(state);
          }
        }
      } catch (error) {
        console.error('[Notifee] Error en actualización:', error);
      }
    }, 1000);
  }

  /**
   * Detener actualización
   */
  private stopUpdating() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      this.isRunning = false;
    }
  }

  /**
   * Actualizar estado del entrenamiento
   */
  async updateWorkoutState(updates: Partial<Omit<WorkoutState, 'isActive'>>) {
    try {
      const savedState = await AsyncStorage.getItem(WORKOUT_STATE_KEY);
      if (savedState) {
        const currentState: WorkoutState = JSON.parse(savedState);
        const newState = { ...currentState, ...updates };
        await AsyncStorage.setItem(WORKOUT_STATE_KEY, JSON.stringify(newState));
        
        // Actualizar notificación inmediatamente
        if (AppState.currentState !== 'active') {
          await this.displayNotification(newState);
        }
      }
    } catch (error) {
      console.error('[Notifee] Error actualizando estado:', error);
    }
  }

  /**
   * Mostrar/actualizar notificación
   */
  private async displayNotification(state: WorkoutState) {
    try {
      const now = Date.now();

      // Calcular tiempo total transcurrido
      let elapsedSeconds: number;
      if (state.isPaused && state.pausedAt) {
        elapsedSeconds = Math.floor((state.pausedAt - state.startTime - state.totalPausedTime) / 1000);
      } else {
        elapsedSeconds = Math.floor((now - state.startTime - state.totalPausedTime) / 1000);
      }

      // Calcular tiempo del ejercicio actual
      let exerciseTime = '';
      let exerciseProgress = '';
      
      if (state.exerciseType === 'time' && state.exerciseDuration) {
        const exerciseElapsed = state.isPaused 
          ? Math.floor((state.pausedAt! - state.exerciseStartTime) / 1000)
          : Math.floor((now - state.exerciseStartTime) / 1000);
        const remaining = Math.max(0, state.exerciseDuration - exerciseElapsed);
        exerciseTime = this.formatTime(remaining);
        
        // Calcular progreso del ejercicio para progress bar
        const exercisePercent = Math.min(100, Math.round((exerciseElapsed / state.exerciseDuration) * 100));
        exerciseProgress = exercisePercent.toString();
      } else if (state.exerciseType === 'reps' && state.exerciseReps) {
        exerciseTime = `${state.exerciseReps} reps`;
        exerciseProgress = '0';
      }

      // Formatear tiempo total
      const totalTime = this.formatTime(elapsedSeconds);
      const progressPercent = Math.round(state.progress * 100);

      // Título dinámico
      const title = state.isPaused
        ? '⏸️ Entrenamiento en pausa'
        : '🏃 Entrenamiento en progreso';

      // Cuerpo de la notificación
      const bodyLines = [
        `⏱️ Tiempo total: ${totalTime}`,
        `💪 ${state.currentExercise}${exerciseTime ? ' • ' + exerciseTime : ''}`,
        `📊 Progreso: ${progressPercent}%`,
      ];

      // Mostrar notificación con estilo avanzado
      await notifee.displayNotification({
        id: NOTIFICATION_ID,
        title: title,
        subtitle: state.routineName,
        body: bodyLines.join('\n'),
        android: {
          channelId: CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          ongoing: true, // No se puede descartar deslizando
          autoCancel: false,
          onlyAlertOnce: true, // Solo alertar una vez, no en cada actualización
          showTimestamp: false,
          color: '#FF6B35',
          smallIcon: 'ic_notification',
          largeIcon: require('../../assets/icon.png'),
          style: {
            type: AndroidStyle.BIGTEXT,
            text: bodyLines.join('\n'),
          },
          // Progress bar para ejercicios basados en tiempo
          progress: state.exerciseType === 'time' && exerciseProgress 
            ? {
                max: 100,
                current: parseInt(exerciseProgress),
                indeterminate: false,
              }
            : undefined,
          // Acciones
          actions: [
            {
              title: state.isPaused ? '▶️ Reanudar' : '⏸️ Pausar',
              pressAction: {
                id: 'pause-resume',
              },
            },
            {
              title: '⏹️ Detener',
              pressAction: {
                id: 'stop',
              },
            },
          ],
          // Mantener como foreground service
          asForegroundService: true,
        },
      });
    } catch (error) {
      console.error('[Notifee] Error mostrando notificación:', error);
    }
  }

  /**
   * Detener el servicio y cancelar notificación
   */
  async stopWorkoutNotification() {
    try {
      // Detener actualizaciones
      this.stopUpdating();

      // Limpiar estado
      await AsyncStorage.removeItem(WORKOUT_STATE_KEY);

      // Detener foreground service primero
      await notifee.stopForegroundService();
      
      // Cancelar notificación
      await notifee.cancelNotification(NOTIFICATION_ID);
    } catch (error) {
      console.error('[Notifee] Error deteniendo servicio:', error);
    }
  }

  /**
   * Formatear tiempo en MM:SS o HH:MM:SS
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

export const notifeeWorkoutService = new NotifeeWorkoutService();

