import { useState, useEffect, useCallback } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Voice from '@react-native-voice/voice';
import * as Speech from 'expo-speech';

interface VoiceRecognitionHook {
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  lastTranscript: string;
  isAvailable: boolean;
}

// Función para pedir permiso de micrófono en Android
export async function requestMicrophonePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Permiso de Micrófono',
          message: 'BeatFit necesita acceso al micrófono para reconocimiento de voz',
          buttonNeutral: 'Preguntar después',
          buttonNegative: 'Cancelar',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  }
  return true; // iOS maneja permisos automáticamente
}

export function useVoiceRecognition(
  onDone: () => void,
  keywords: string[] = ['terminé', 'termine', 'listo', 'siguiente', 'done']
): VoiceRecognitionHook {
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);

  // Verificar disponibilidad de Voice al montar
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        // Pedir permiso primero
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
          setIsAvailable(false);
          return;
        }

        // Verificar disponibilidad
        const available = await Voice.isAvailable();
        setIsAvailable(available || true); // Asumir disponible si no hay error
      } catch (error) {
        // En builds nativos, Voice.isAvailable() puede fallar pero Voice funciona
        // Así que asumimos que está disponible si tenemos permiso
        setIsAvailable(true);
      }
    };
    checkAvailability();
  }, []);

  const startListening = useCallback(async () => {
    if (!isAvailable) {
      // Voice no disponible, silenciar
      return;
    }

    try {
      setIsListening(true);
      await Voice.start('es-ES');
    } catch (error) {
      // Silenciar error si Voice no está disponible
      setIsListening(false);
    }
  }, [isAvailable]);

  const stopListening = useCallback(async () => {
    if (!isAvailable) {
      setIsListening(false);
      return;
    }

    try {
      setIsListening(false);
      await Voice.stop();
      await Voice.destroy();
    } catch (error) {
      // Silenciar error
    }
  }, [isAvailable]);

  useEffect(() => {
    if (!isAvailable) {
      return;
    }

    // Configurar listeners para el reconocimiento de voz
    Voice.onSpeechResults = (e) => {
      if (e.value && e.value.length > 0) {
        const text = e.value[0].toLowerCase();
        setLastTranscript(text);

        // Verificar si alguna palabra clave fue detectada
        if (keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
          onDone();
          stopListening();
        }
      }
    };

    Voice.onSpeechError = (e) => {
      setIsListening(false);
    };

    Voice.onSpeechEnd = () => {
      // Reiniciar automáticamente si todavía estamos en modo listening
      if (isListening) {
        startListening();
      }
    };

    return () => {
      // Cleanup
      if (isAvailable) {
        stopListening();
        Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
      }
    };
  }, [onDone, keywords, stopListening, isListening, startListening, isAvailable]);

  return {
    isListening,
    startListening,
    stopListening,
    lastTranscript,
    isAvailable,
  };
}

// Función auxiliar para dar feedback de voz al usuario
export async function speakText(text: string) {
  try {
    await Speech.speak(text, {
      language: 'es-ES',
      pitch: 1.0,
      rate: 1.0,
    });
  } catch (error) {
    console.error('Error speaking text:', error);
  }
}
