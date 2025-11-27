import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import notifee, {
  AndroidImportance,
  AndroidStyle,
} from "@notifee/react-native";

type WorkoutNotificationData = {
  exerciseId: string;
  routineName: string;
  currentExercise: string;
  startTime: number; // ms
  isPaused: boolean;
  pausedAt?: number; // ms
  totalPausedTime: number; // seconds
  exerciseType: "time" | "reps";
  exerciseDuration?: number; // seconds
  exerciseStartTime: number; // ms
  exerciseReps?: number;
  exercisePausedTime?: number; // seconds
  progress: number; // 0 - 1
};

const NOTIF_CHANNEL_ID = "workout-progress";
const NOTIF_ID = "beatfit-workout";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const formatSeconds = (totalSeconds: number) => {
  if (Number.isNaN(totalSeconds) || totalSeconds < 0) {
    return "0:00";
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

class NotificationService {
  private exerciseSound: Audio.Sound | null = null;
  private routineSound: Audio.Sound | null = null;
  private pauseSound: Audio.Sound | null = null;
  private resumeSound: Audio.Sound | null = null;
  private isInitialized = false;
  private channelReady = false;
  private workoutUpdateInterval: NodeJS.Timeout | null = null;
  private currentWorkoutData: WorkoutNotificationData | null = null;
  private onExerciseComplete: (() => void) | null = null;
  private hasCompletedCurrentExercise = false;

  async initialize() {
    if (this.isInitialized) return;

    // Permisos de notificaciones
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.warn("Permisos de notificaciones no concedidos");
    }

    // Permisos de notifee (Android 13+)
    try {
      await notifee.requestPermission();
    } catch (e) {
      console.warn("No se pudo solicitar permiso con notifee:", e);
    }

    // Canal expo (por compatibilidad)
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("workout", {
        name: "Entrenamiento en progreso",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF6B35",
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        enableVibrate: true,
        showBadge: false,
      });
    }

    // AudioMode con fallback de constantes (algunas builds no exponen enums nuevos)
    const mixIOS =
      (Audio as any).INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS ??
      (Audio as any).InterruptionModeIOS?.MixWithOthers ??
      0;
    const duckAndroid =
      (Audio as any).INTERRUPTION_MODE_ANDROID_DUCK_OTHERS ??
      (Audio as any).InterruptionModeAndroid?.DuckOthers ??
      2;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: mixIOS,
        interruptionModeAndroid: duckAndroid,
      });
    } catch (error) {
      console.warn("No se pudo configurar audioMode, se continúa igual:", error);
    }

    // Cargar sonidos (aunque audioMode falle)
    try {
      const { sound: exerciseSound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/exercise_done_alert.wav"),
        { shouldPlay: false },
      );
      this.exerciseSound = exerciseSound;

      const { sound: routineSound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/routine_done_alert.wav"),
        { shouldPlay: false },
      );
      this.routineSound = routineSound;

      const { sound: pauseSound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/pause_alert.wav"),
        { shouldPlay: false },
      );
      this.pauseSound = pauseSound;

      const { sound: resumeSound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/resume_alert.wav"),
        { shouldPlay: false },
      );
      this.resumeSound = resumeSound;
    } catch (error) {
      console.warn("No se pudieron cargar sonidos:", error);
    }

    this.isInitialized = true;
  }

  private async ensureReady() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    if (!this.channelReady) {
      await notifee.requestPermission();
      await notifee.createChannel({
        id: NOTIF_CHANNEL_ID,
        name: "Entrenamiento en progreso",
        importance: AndroidImportance.MAX,
        vibration: true,
        sound: undefined,
      });
      this.channelReady = true;
    }
  }

  private async playSound(soundRef: Audio.Sound | null) {
    if (!soundRef) {
      return;
    }
    try {
      await soundRef.replayAsync();
    } catch (error) {
      console.error("Error reproduciendo sonido:", error);
    }
  }

  async playExerciseCompletionSound() {
    await this.ensureReady();
    await this.playSound(this.exerciseSound);
  }

  async playRoutineCompletionSound() {
    await this.ensureReady();
    await this.playSound(this.routineSound);
  }

  async playPauseSound() {
    await this.ensureReady();
    await this.playSound(this.pauseSound);
  }

  async playResumeSound() {
    await this.ensureReady();
    await this.playSound(this.resumeSound);
  }

  async vibrate() {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error vibrando:", error);
    }
  }

  async playNotification() {
    await Promise.all([this.playExerciseCompletionSound(), this.vibrate()]);
  }

  async playRoutineCompletion() {
    await Promise.all([
      this.playRoutineCompletionSound(),
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    ]);
  }

  async startWorkoutNotification(
    data: WorkoutNotificationData,
    onExerciseComplete: () => void,
  ) {
    try {
      await this.ensureReady();

      this.currentWorkoutData = data;
      this.onExerciseComplete = onExerciseComplete;
      this.hasCompletedCurrentExercise = false;

      console.log("[NotificationService] startWorkoutNotification", {
        exercise: data.currentExercise,
        type: data.exerciseType,
        duration: data.exerciseDuration,
      });

      // Siempre usar displayNotification (algunos entornos no exponen startForegroundService)
      await notifee.displayNotification({
        id: NOTIF_ID,
        title: "Entrenamiento en progreso",
        subtitle: data.routineName,
        android: {
          channelId: NOTIF_CHANNEL_ID,
          smallIcon: "ic_launcher",
          color: "#FF6B35",
          ongoing: true,
          pressAction: { id: "default" },
        },
      });

      await this.updateWorkoutNotificationDisplay();

      if (this.workoutUpdateInterval) {
        clearInterval(this.workoutUpdateInterval);
      }

      this.workoutUpdateInterval = setInterval(
        () => this.handleWorkoutTick(),
        1000,
      );
    } catch (error) {
      console.error("Error iniciando notificacion de workout:", error);
    }
  }

  updateWorkoutData(data: WorkoutNotificationData) {
    this.currentWorkoutData = data;
    this.hasCompletedCurrentExercise = false;
    console.log("[NotificationService] updateWorkoutData", {
      exercise: data.currentExercise,
      paused: data.isPaused,
      type: data.exerciseType,
      duration: data.exerciseDuration,
    });
  }

  async updateWorkoutNotification(data: Partial<WorkoutNotificationData>) {
    if (!this.currentWorkoutData) {
      return;
    }
    this.currentWorkoutData = { ...this.currentWorkoutData, ...data };
    await this.updateWorkoutNotificationDisplay();
  }

  private async handleWorkoutTick() {
    if (!this.currentWorkoutData) return;

    const {
      exerciseType,
      exerciseDuration,
      exerciseStartTime,
      isPaused,
      pausedAt,
      exercisePausedTime = 0,
    } = this.currentWorkoutData;

    if (
      exerciseType === "time" &&
      exerciseDuration &&
      !isPaused &&
      !this.hasCompletedCurrentExercise
    ) {
      const effectiveNow = pausedAt ?? Date.now();
      const elapsed = Math.max(
        0,
        Math.floor((effectiveNow - exerciseStartTime) / 1000) -
          Math.floor(exercisePausedTime),
      );
      const remaining = exerciseDuration - elapsed;

      if (remaining <= 0) {
        this.hasCompletedCurrentExercise = true;
        await this.playExerciseCompletionSound();
        await this.vibrate();
        if (this.onExerciseComplete) {
          this.onExerciseComplete();
        }
        return;
      }
    }

    if (exerciseType === "time" && exerciseDuration && !isPaused) {
      const effectiveNow = pausedAt ?? Date.now();
      const elapsed = Math.max(
        0,
        Math.floor((effectiveNow - exerciseStartTime) / 1000) -
          Math.floor(exercisePausedTime),
      );
      const remaining = exerciseDuration - elapsed;
      console.log("[NotificationService] tick", {
        remaining,
        elapsed,
        duration: exerciseDuration,
      });
    }

    await this.updateWorkoutNotificationDisplay();
  }

  private async updateWorkoutNotificationDisplay() {
    try {
      if (!this.currentWorkoutData) return;

      const {
        routineName,
        currentExercise,
        startTime,
        isPaused,
        pausedAt,
        totalPausedTime,
        exerciseType,
        exerciseDuration,
        exerciseStartTime,
        exerciseReps,
        exercisePausedTime = 0,
        progress,
      } = this.currentWorkoutData;

      const now = Date.now();
      const totalPausedMs = Math.max(0, totalPausedTime * 1000);
      const effectiveNow = isPaused && pausedAt ? pausedAt : now;
      const elapsedSeconds = Math.max(
        0,
        Math.floor((effectiveNow - startTime - totalPausedMs) / 1000),
      );

      const title = isPaused
        ? "Entrenamiento en pausa"
        : "Entrenamiento en progreso";

      let bodyLines = [
        `Tiempo total: ${formatSeconds(elapsedSeconds)}`,
        `Ejercicio: ${currentExercise}`,
        `Progreso: ${Math.round(progress * 100)}%`,
      ];

      let exerciseRemaining: number | null = null;
      if (exerciseType === "time" && exerciseDuration) {
        const exerciseEffectiveNow = isPaused && pausedAt ? pausedAt : now;
        const elapsedForExercise = Math.max(
          0,
          Math.floor(
            (exerciseEffectiveNow - exerciseStartTime) / 1000 -
              exercisePausedTime,
          ),
        );
        exerciseRemaining = Math.max(
          0,
          Math.floor(exerciseDuration - elapsedForExercise),
        );
        bodyLines[1] = `Ejercicio: ${currentExercise} (${formatSeconds(
          exerciseRemaining,
        )})`;
      } else if (exerciseType === "reps" && exerciseReps) {
        bodyLines[1] = `Ejercicio: ${currentExercise} (${exerciseReps} reps)`;
      }

      // Usar texto plano para dispositivos con UI compacta
      const collapsedBody = bodyLines.join(" • ");

      await notifee.displayNotification({
        id: NOTIF_ID,
        title,
        subtitle: routineName,
        body: collapsedBody,
        android: {
          channelId: NOTIF_CHANNEL_ID,
          importance: AndroidImportance.MAX,
          ongoing: true,
          autoCancel: false,
          onlyAlertOnce: true,
          pressAction: { id: "default" },
          smallIcon: "ic_launcher", // asegurar recurso existente
          color: "#FF6B35",
          asForegroundService: true,
          showChronometer: !!exerciseRemaining && !isPaused,
          chronometerDirection: "down",
          timestamp:
            exerciseRemaining && !isPaused
              ? Date.now() + exerciseRemaining * 1000
              : undefined,
          style: {
            type: AndroidStyle.BIGTEXT,
            text: bodyLines.join("\n"),
          },
          progress:
            exerciseType === "time" && exerciseDuration
              ? {
                  max: exerciseDuration,
                  current:
                    exerciseRemaining !== null
                      ? exerciseDuration - exerciseRemaining
                      : 0,
                  indeterminate: false,
                }
              : undefined,
        },
      });
    } catch (error) {
      console.error("Error actualizando notificacion de workout:", error);
    }
  }

  async stopWorkoutNotification() {
    try {
      if (this.workoutUpdateInterval) {
        clearInterval(this.workoutUpdateInterval);
        this.workoutUpdateInterval = null;
      }

      await notifee.cancelNotification(NOTIF_ID);

      this.currentWorkoutData = null;
      this.onExerciseComplete = null;
      this.hasCompletedCurrentExercise = false;
    } catch (error) {
      console.error("Error deteniendo notificacion de workout:", error);
    }
  }

  async clearWorkoutNotification() {
    try {
      await notifee.cancelNotification(NOTIF_ID);
      await Notifications.dismissNotificationAsync(NOTIF_ID).catch(() => {});
      this.currentWorkoutData = null;
    } catch (error) {
      console.error("Error limpiando notificacion de entrenamiento:", error);
    }
  }

  async notifyExerciseComplete(exerciseName: string) {
    try {
      await Promise.all([this.playExerciseCompletionSound(), this.vibrate()]);
    } catch (error) {
      console.error("Error en notificacion de ejercicio completado:", error);
    }
  }

  async notifyRoutineComplete(routineName: string, totalTime: string) {
    try {
      await Promise.all([
        this.playRoutineCompletionSound(),
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      ]);

      await this.clearWorkoutNotification();

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Rutina completada",
          body: `${routineName}\nTiempo total: ${totalTime}`,
          sound: false,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
    } catch (error) {
      console.error("Error en notificacion de rutina completada:", error);
    }
  }

  async cleanup() {
    try {
      await this.stopWorkoutNotification();

      if (this.exerciseSound) {
        await this.exerciseSound.unloadAsync();
        this.exerciseSound = null;
      }
      if (this.routineSound) {
        await this.routineSound.unloadAsync();
        this.routineSound = null;
      }
      if (this.pauseSound) {
        await this.pauseSound.unloadAsync();
        this.pauseSound = null;
      }
      if (this.resumeSound) {
        await this.resumeSound.unloadAsync();
        this.resumeSound = null;
      }
      this.isInitialized = false;
    } catch (error) {
      console.error("Error limpiando sonidos:", error);
    }
  }
}

export const notificationService = new NotificationService();
