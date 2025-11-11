import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

class NotificationService {
  private sound: Audio.Sound | null = null;

  async initialize() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }

  async playCompletionSound() {
    try {
      // Crear un sonido simple usando Audio.Sound
      // En producción, aquí cargarías un archivo de audio premium
      const { sound } = await Audio.Sound.createAsync(
        // Por ahora usaremos el sonido del sistema
        // En producción reemplazar con: require('../../assets/sounds/completion.mp3')
        { uri: 'https://www.soundjay.com/buttons/sounds/button-50.mp3' },
        { shouldPlay: true, volume: 1.0 }
      );

      this.sound = sound;

      // Liberar el sonido después de reproducirlo
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  async vibrate() {
    try {
      // Vibración premium con patrón
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
    } catch (error) {
      console.error('Error vibrating:', error);
    }
  }

  async playNotification() {
    // Reproducir sonido y vibrar simultáneamente
    await Promise.all([
      this.playCompletionSound(),
      this.vibrate(),
    ]);
  }

  async cleanup() {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }
}

export const notificationService = new NotificationService();
