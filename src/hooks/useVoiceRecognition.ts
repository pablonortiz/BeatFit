import { useState, useEffect, useCallback } from 'react';
import Voice from '@react-native-voice/voice';
import * as Speech from 'expo-speech';

interface VoiceRecognitionHook {
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  lastTranscript: string;
}

export function useVoiceRecognition(
  onDone: () => void,
  keywords: string[] = ['terminé', 'termine', 'listo', 'siguiente', 'done']
): VoiceRecognitionHook {
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');

  const startListening = useCallback(async () => {
    try {
      setIsListening(true);
      await Voice.start('es-ES');
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      setIsListening(false);
      await Voice.stop();
      await Voice.destroy();
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
    }
  }, []);

  useEffect(() => {
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
      console.error('Speech recognition error:', e);
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
      stopListening();
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [onDone, keywords, stopListening, isListening, startListening]);

  return {
    isListening,
    startListening,
    stopListening,
    lastTranscript,
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
