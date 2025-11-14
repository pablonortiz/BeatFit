import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

class NotificationService {
  private exerciseSound: Audio.Sound | null = null;
  private routineSound: Audio.Sound | null = null;
  private isInitialized = false;

  async initialize() {
    try {
      // Configurar el modo de audio para NO pausar la música de otras apps
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true, // Reduce el volumen de otras apps temporalmente
        playThroughEarpieceAndroid: false,
      });

      // Cargar sonido de ejercicio completado
      const { sound: exerciseSound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/exercise-done-alert.wav'),
        { shouldPlay: false }
      );
      this.exerciseSound = exerciseSound;

      // Cargar sonido de rutina completada
      const { sound: routineSound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/routine-done-alert.wav'),
        { shouldPlay: false }
      );
      this.routineSound = routineSound;

      this.isInitialized = true;
    } catch (error) {
      console.error('Error inicializando sonidos:', error);
    }
  }

  async playExerciseCompletionSound() {
    try {
      if (this.exerciseSound) {
        await this.exerciseSound.replayAsync();
      }
    } catch (error) {
      console.error('Error reproduciendo sonido de ejercicio:', error);
    }
  }

  async playRoutineCompletionSound() {
    try {
      if (this.routineSound) {
        await this.routineSound.replayAsync();
      }
    } catch (error) {
      console.error('Error reproduciendo sonido de rutina:', error);
    }
  }

  async vibrate() {
    try {
      // Vibración premium con patrón de éxito
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
    } catch (error) {
      console.error('Error vibrando:', error);
    }
  }

  async playNotification() {
    // Reproducir sonido de ejercicio completado + vibración
    await Promise.all([
      this.playExerciseCompletionSound(),
      this.vibrate(),
    ]);
  }

  async playRoutineCompletion() {
    // Reproducir sonido de rutina completada + vibración más intensa
    await Promise.all([
      this.playRoutineCompletionSound(),
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    ]);
  }

  async cleanup() {
    try {
      if (this.exerciseSound) {
        await this.exerciseSound.unloadAsync();
        this.exerciseSound = null;
      }
      if (this.routineSound) {
        await this.routineSound.unloadAsync();
        this.routineSound = null;
      }
      this.isInitialized = false;
    } catch (error) {
      console.error('Error limpiando sonidos:', error);
    }
  }
}

export const notificationService = new NotificationService();
