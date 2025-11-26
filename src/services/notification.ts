import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configurar el comportamiento de las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private exerciseSound: Audio.Sound | null = null;
  private routineSound: Audio.Sound | null = null;
  private pauseSound: Audio.Sound | null = null;
  private resumeSound: Audio.Sound | null = null;
  private isInitialized = false;
  private workoutNotificationId: string | null = null;

  async initialize() {
    try {
      // Solicitar permisos de notificación
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("Permisos de notificación no concedidos");
      }

      // Configurar el canal de notificaciones para Android
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("workout", {
          name: "Entrenamiento en progreso",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF6B35",
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
          enableVibrate: true,
          showBadge: false,
        });
      }

      // Configurar el modo de audio para mezclar con música del usuario
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true, // Permite mezclar audio (baja ligeramente el volumen de música)
        playThroughEarpieceAndroid: false,
        // Mezclar con otros audios sin pausarlos
        // iOS: 0 = MIX_WITH_OTHERS (mezcla sin pausar)
        // Android: 2 = DUCK_OTHERS (mezcla bajando volumen temporalmente)
        interruptionModeIOS: 0,
        interruptionModeAndroid: 2,
      });

      // Cargar sonido de ejercicio completado
      const { sound: exerciseSound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/exercise_done_alert.wav"),
        { shouldPlay: false },
      );
      this.exerciseSound = exerciseSound;

      // Cargar sonido de rutina completada
      const { sound: routineSound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/routine_done_alert.wav"),
        { shouldPlay: false },
      );
      this.routineSound = routineSound;

      // Cargar sonido de pausa
      const { sound: pauseSound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/pause_alert.wav"),
        { shouldPlay: false },
      );
      this.pauseSound = pauseSound;

      // Cargar sonido de reanudación
      const { sound: resumeSound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/resume_alert.wav"),
        { shouldPlay: false },
      );
      this.resumeSound = resumeSound;

      this.isInitialized = true;
    } catch (error) {
      console.error("Error inicializando sonidos:", error);
    }
  }

  async playExerciseCompletionSound() {
    try {
      if (this.exerciseSound) {
        await this.exerciseSound.replayAsync();
        // Detener el sonido después de reproducirlo para liberar audio focus
        setTimeout(async () => {
          await this.exerciseSound?.stopAsync();
        }, 1500);
      }
    } catch (error) {
      console.error("Error reproduciendo sonido de ejercicio:", error);
    }
  }

  async playRoutineCompletionSound() {
    try {
      if (this.routineSound) {
        await this.routineSound.replayAsync();
        // Detener el sonido después de reproducirlo para liberar audio focus
        setTimeout(async () => {
          await this.routineSound?.stopAsync();
        }, 2000);
      }
    } catch (error) {
      console.error("Error reproduciendo sonido de rutina:", error);
    }
  }

  async playPauseSound() {
    try {
      if (this.pauseSound) {
        await this.pauseSound.replayAsync();
        // Detener el sonido después de reproducirlo para liberar audio focus
        setTimeout(async () => {
          await this.pauseSound?.stopAsync();
        }, 1000);
      }
    } catch (error) {
      console.error("Error reproduciendo sonido de pausa:", error);
    }
  }

  async playResumeSound() {
    try {
      if (this.resumeSound) {
        await this.resumeSound.replayAsync();
        // Detener el sonido después de reproducirlo para liberar audio focus
        setTimeout(async () => {
          await this.resumeSound?.stopAsync();
        }, 1000);
      }
    } catch (error) {
      console.error("Error reproduciendo sonido de reanudación:", error);
    }
  }

  async vibrate() {
    try {
      // Vibración premium con patrón de éxito
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error vibrando:", error);
    }
  }

  async playNotification() {
    // Reproducir sonido de ejercicio completado + vibración
    await Promise.all([this.playExerciseCompletionSound(), this.vibrate()]);
  }

  async playRoutineCompletion() {
    // Reproducir sonido de rutina completada + vibración más intensa
    await Promise.all([
      this.playRoutineCompletionSound(),
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    ]);
  }

  /**
   * Cancelar la notificación persistente del entrenamiento
   */
  async clearWorkoutNotification() {
    try {
      if (this.workoutNotificationId) {
        await Notifications.dismissNotificationAsync(
          this.workoutNotificationId,
        );
        this.workoutNotificationId = null;
      }
    } catch (error) {
      console.error("Error limpiando notificación de entrenamiento:", error);
    }
  }

  /**
   * Enviar notificación de ejercicio completado (sonido + vibración, SIN notificación visual)
   */
  async notifyExerciseComplete(
    exerciseName: string,
    isInBackground: boolean = false,
  ) {
    try {
      // Siempre reproducir sonido y vibración
      await Promise.all([this.playExerciseCompletionSound(), this.vibrate()]);

      // NO mostrar notificación temporal - el usuario solo quiere la notificación persistente en background
    } catch (error) {
      console.error("Error en notificación de ejercicio completado:", error);
    }
  }

  /**
   * Enviar notificación de rutina completada
   */
  async notifyRoutineComplete(routineName: string, totalTime: string) {
    try {
      await Promise.all([
        this.playRoutineCompletionSound(),
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      ]);

      await this.clearWorkoutNotification();

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🎉 ¡Rutina completada!",
          body: `${routineName}\n⏱️ Tiempo total: ${totalTime}`,
          sound: false,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
    } catch (error) {
      console.error("Error en notificación de rutina completada:", error);
    }
  }

  async cleanup() {
    try {
      // Limpiar notificación persistente
      await this.clearWorkoutNotification();

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
