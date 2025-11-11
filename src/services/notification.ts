import * as Haptics from 'expo-haptics';

class NotificationService {
  async initialize() {
    // No requiere inicialización
  }

  async playCompletionSound() {
    // TODO: Implementar con archivos de audio locales cuando estén listos
    // Por ahora usamos solo vibración que es más efectivo durante el ejercicio
    // En producción: agregar archivos .mp3 en assets/sounds/ y usar expo-audio
    // Ejemplo: const sound = await Audio.load(require('../../assets/sounds/completion.mp3'));
    //          await sound.play();
  }

  async vibrate() {
    try {
      // Vibración premium con patrón de éxito
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
    } catch (error) {
      console.error('Error vibrating:', error);
    }
  }

  async playNotification() {
    // Por ahora solo vibrar - más efectivo durante el ejercicio
    await this.vibrate();

    // Nota: El sonido se puede agregar fácilmente más adelante
    // con archivos de audio locales y expo-audio
  }

  async cleanup() {
    // No hay recursos para limpiar actualmente
  }
}

export const notificationService = new NotificationService();
