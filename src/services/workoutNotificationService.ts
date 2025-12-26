import notifee, {
  AndroidImportance,
  AndroidStyle,
  AndroidForegroundServiceType,
  EventType,
  Event,
} from '@notifee/react-native';
import { AppState } from 'react-native';

// IDs para los canales de notificación
const CHANNEL_ID_PROGRESS = 'workout-progress';
const CHANNEL_ID_ALERT = 'workout-alert';
const NOTIFICATION_ID = 'workout-active';

interface WorkoutData {
  routineName: string;
  currentExercise: string;
  exerciseType: 'time' | 'reps';
  exerciseDuration?: number; // en segundos
  exerciseReps?: number;
  exerciseStartTime: number; // timestamp en ms
  isPaused: boolean;
  pausedTime: number; // tiempo pausado acumulado en segundos
  progress: number; // 0 a 1
  totalExercises: number;
  completedExercises: number;
}

class WorkoutNotificationService {
  private updateInterval: NodeJS.Timeout | null = null;
  private currentWorkoutData: WorkoutData | null = null;
  private onExerciseComplete: (() => void) | null = null;
  private isInBackground = false;
  private foregroundServiceRegistered = false;
  private foregroundServiceResolver: (() => void) | null = null;
  private lastCompletionStartTime: number | null = null;
  private completionNotified = false;
  private initialized = false;
  private initializing: Promise<void> | null = null;
  private permissionGranted: boolean | null = null;
  private notificationsEnabled = false;
  private lastNotificationUpdateAt: number | null = null;
  private readonly minNotificationUpdateMs = 10000;

  /**
   * Inicializar los canales de notificación
  */
  async initialize() {
    if (this.initialized) return;
    if (this.initializing) {
      await this.initializing;
      return;
    }

    this.initializing = (async () => {
      try {
        this.registerForegroundService();

        // Canal para actualizaciones de progreso (sin sonido)
        await notifee.createChannel({
          id: CHANNEL_ID_PROGRESS,
          name: 'Progreso de Entrenamiento',
          description: 'Muestra el progreso de tu entrenamiento actual',
          importance: AndroidImportance.LOW,
          sound: undefined,
          vibration: false,
        });

        // Canal para alertas (con sonido)
        await notifee.createChannel({
          id: CHANNEL_ID_ALERT,
          name: 'Alertas de Ejercicio',
          description: 'Te notifica cuando completas un ejercicio',
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
        });

        // Configurar listener para eventos en background
        notifee.onBackgroundEvent(async ({ type, detail }: Event) => {
          console.log('[Notifee] Background event:', type);
        });

        this.initialized = true;
        console.log('[WorkoutNotificationService] Initialized successfully');
      } catch (error) {
        console.error('[WorkoutNotificationService] Error initializing:', error);
      }
    })();

    await this.initializing;
    this.initializing = null;
  }

  /**
   * Solicitar permisos de notificación
   */
  async requestPermissions() {
    if (this.permissionGranted !== null) return this.permissionGranted;

    try {
      const settings = await notifee.requestPermission();
      this.permissionGranted = settings.authorizationStatus >= 1; // 1 = authorized
      return this.permissionGranted;
    } catch (error) {
      console.error('[WorkoutNotificationService] Error requesting permissions:', error);
      this.permissionGranted = false;
      return false;
    }
  }

  /**
   * Iniciar la notificación de entrenamiento
   */
  async startWorkout(data: WorkoutData, onComplete: () => void) {
    try {
      await this.initialize();
      this.notificationsEnabled = await this.requestPermissions();
      this.registerForegroundService();
      this.currentWorkoutData = data;
      this.onExerciseComplete = onComplete;
      this.isInBackground = AppState.currentState !== 'active';
      this.lastCompletionStartTime = null;
      this.completionNotified = false;

      // Mostrar notificación inicial
      if (this.notificationsEnabled) {
        await this.updateNotification(true);
      } else {
        console.warn('[WorkoutNotificationService] Notifications disabled; skipping foreground service');
      }

      // Iniciar actualizaciones automáticas cada segundo
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
      }

      this.updateInterval = setInterval(() => {
        this.checkExerciseCompletion();
        if (this.notificationsEnabled) {
          this.updateNotification();
        }
      }, 1000);

      console.log('[WorkoutNotificationService] Workout started:', data.currentExercise);
    } catch (error) {
      console.error('[WorkoutNotificationService] Error starting workout:', error);
    }
  }

  /**
   * Actualizar los datos del workout
   */
  updateWorkoutData(data: Partial<WorkoutData>) {
    if (this.currentWorkoutData) {
      this.currentWorkoutData = {
        ...this.currentWorkoutData,
        ...data,
      };
      // Reset completion guard on new start time
      if (data.exerciseStartTime) {
        this.lastCompletionStartTime = null;
      }
      if (this.notificationsEnabled) {
        const forceUpdate =
          'currentExercise' in data ||
          'exerciseType' in data ||
          'exerciseDuration' in data ||
          'exerciseReps' in data ||
          'exerciseStartTime' in data ||
          'isPaused' in data ||
          'pausedTime' in data ||
          'progress' in data ||
          'totalExercises' in data ||
          'completedExercises' in data;
        this.updateNotification(forceUpdate);
      }
    }
  }

  /**
   * Verificar si el ejercicio actual se completó
   */
  private checkExerciseCompletion() {
    if (!this.currentWorkoutData || this.currentWorkoutData.isPaused) return;

    const { exerciseType, exerciseDuration, exerciseStartTime, pausedTime } = this.currentWorkoutData;

    if (exerciseType === 'time' && exerciseDuration) {
      const elapsed = Math.floor((Date.now() - exerciseStartTime) / 1000) - pausedTime;

      if (elapsed >= exerciseDuration) {
        // Ejercicio completado!
        if (
          this.isInBackground &&
          this.onExerciseComplete &&
          this.lastCompletionStartTime !== exerciseStartTime
        ) {
          this.lastCompletionStartTime = exerciseStartTime;
          // Solo disparar el callback si estamos en background
          // En foreground, el screen maneja esto
          this.playCompletionAlert();
          this.onExerciseComplete?.();
        }
      }
    }
  }

  /**
   * Reproducir alerta de ejercicio completado (solo en background)
   */
  private async playCompletionAlert() {
    if (!this.isInBackground || !this.notificationsEnabled) return;

    try {
      // Mostrar notificación temporal con sonido
      await notifee.displayNotification({
        id: 'exercise-complete-alert',
        title: '✅ ¡Ejercicio Completado!',
        body: `${this.currentWorkoutData?.currentExercise || 'Ejercicio'} terminado`,
        android: {
          channelId: CHANNEL_ID_ALERT,
          importance: AndroidImportance.HIGH,
          sound: 'default',
          pressAction: {
            id: 'default',
          },
          autoCancel: true,
          timeoutAfter: 3000, // Se oculta después de 3 segundos
        },
      });
    } catch (error) {
      console.error('[WorkoutNotificationService] Error playing completion alert:', error);
    }
  }

  /**
   * Actualizar la notificación de progreso
   */
  private async updateNotification(force = false) {
    if (!this.currentWorkoutData || !this.notificationsEnabled) return;

    try {
      const now = Date.now();
      if (
        !force &&
        this.lastNotificationUpdateAt &&
        now - this.lastNotificationUpdateAt < this.minNotificationUpdateMs
      ) {
        return;
      }
      this.lastNotificationUpdateAt = now;

      const {
        routineName,
        currentExercise,
        exerciseType,
        exerciseDuration,
        exerciseReps,
        exerciseStartTime,
        isPaused,
        pausedTime,
        progress,
        totalExercises,
        completedExercises,
      } = this.currentWorkoutData;

      const elapsed = Math.floor((now - exerciseStartTime) / 1000) - pausedTime;
      const remaining = exerciseType === 'time' && exerciseDuration
        ? Math.max(0, exerciseDuration - elapsed)
        : 0;

      // Título dinámico según el estado
      const title = isPaused
        ? '⏸️ Entrenamiento en Pausa'
        : '🏃 Entrenamiento Activo';

      // Información del ejercicio actual
      let exerciseInfo = `💪 ${currentExercise}`;
      if (exerciseType === 'time' && exerciseDuration) {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        exerciseInfo += ` • ${mins}:${secs.toString().padStart(2, '0')}`;
      } else if (exerciseType === 'reps' && exerciseReps) {
        exerciseInfo += ` • ${exerciseReps} reps`;
      }

      // Información de progreso
      const progressPercent = Math.round(progress * 100);
      const progressInfo = `📊 ${completedExercises}/${totalExercises} ejercicios • ${progressPercent}%`;

      // Cuerpo de la notificación
      const bodyText = [
        exerciseInfo,
        progressInfo,
      ].join('\n');

      // Configurar progress bar (solo para ejercicios por tiempo)
      let progressConfig = undefined;
      if (exerciseType === 'time' && exerciseDuration && !isPaused) {
        progressConfig = {
          max: exerciseDuration,
          current: elapsed,
          indeterminate: false,
        };
      }

      // Mostrar notificación
      await notifee.displayNotification({
        id: NOTIFICATION_ID,
        title,
        subtitle: routineName,
        body: bodyText,
        android: {
          channelId: CHANNEL_ID_PROGRESS,
          importance: AndroidImportance.LOW,
          asForegroundService: true,
          foregroundServiceTypes: [
            AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
          ],
          ongoing: true, // No se puede deslizar para cerrar
          autoCancel: false,
          onlyAlertOnce: true, // Solo alertar la primera vez
          color: '#FF6B35',
          smallIcon: 'ic_launcher',
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          style: {
            type: AndroidStyle.BIGTEXT,
            text: bodyText,
          },
          progress: progressConfig,
          foregroundService: {
            stopWithTask: false,
          },
          // Mostrar tiempo restante como cronómetro
          showChronometer: exerciseType === 'time' && !isPaused,
          chronometerDirection: 'down',
          timestamp: exerciseType === 'time' && !isPaused
            ? now + (remaining * 1000)
            : undefined,
        },
      });
    } catch (error) {
      console.error('[WorkoutNotificationService] Error updating notification:', error);
    }
  }

  /**
   * Marcar que la app entró en background
   */
  setInBackground(inBackground: boolean) {
    this.isInBackground = inBackground;
    if (inBackground && this.notificationsEnabled) {
      this.updateNotification(true);
    }
  }

  /**
   * Notificar rutina completada
   */
  async notifyRoutineCompleted(routineName: string) {
    if (this.completionNotified) return;
    this.completionNotified = true;
    if (!this.notificationsEnabled) return;

    try {
      await notifee.displayNotification({
        id: 'workout-completed',
        title: 'Rutina completada',
        body: `${routineName} finalizada con éxito`,
        android: {
          channelId: CHANNEL_ID_ALERT,
          importance: AndroidImportance.HIGH,
          pressAction: { id: 'default' },
          autoCancel: true,
        },
      });
    } catch (error) {
      console.error('[WorkoutNotificationService] Error showing completion notification:', error);
    }
  }

  /**
   * Actualizar el callback de cambio de ejercicio (mantenerlo fresco)
   */
  setOnExerciseComplete(onComplete: () => void) {
    this.onExerciseComplete = onComplete;
  }

  /**
   * Detener el entrenamiento y cerrar la notificación
   */
  async stopWorkout() {
    try {
      // Limpiar intervalo
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }

      // Cancelar notificaciones
      await notifee.cancelNotification(NOTIFICATION_ID);
      await notifee.cancelNotification('exercise-complete-alert');
      this.foregroundServiceResolver?.();
      this.foregroundServiceResolver = null;
      await notifee.stopForegroundService().catch(() => undefined);

      // Limpiar datos
      this.currentWorkoutData = null;
      this.onExerciseComplete = null;

      console.log('[WorkoutNotificationService] Workout stopped');
    } catch (error) {
      console.error('[WorkoutNotificationService] Error stopping workout:', error);
    }
  }

  /**
   * Registrar el servicio en primer plano (solo Android)
   */
  private registerForegroundService() {
    if (this.foregroundServiceRegistered) return;

    notifee.registerForegroundService(() => {
      return new Promise<void>((resolve) => {
        this.foregroundServiceResolver = resolve;
      });
    });

    this.foregroundServiceRegistered = true;
  }
}

export const workoutNotificationService = new WorkoutNotificationService();

