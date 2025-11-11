import { useState, useEffect, useCallback } from 'react';
import * as Speech from 'expo-speech';

// Nota: Expo no tiene reconocimiento de voz integrado de forma nativa
// Para una implementación completa, se necesitaría @react-native-voice/voice
// Por ahora, vamos a simular la funcionalidad usando Speech para TTS
// y en producción se debe integrar una biblioteca de reconocimiento de voz

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

  const startListening = useCallback(() => {
    setIsListening(true);
    // En producción, aquí se iniciaría el reconocimiento de voz real
    // Ejemplo con @react-native-voice/voice:
    // Voice.start('es-ES');
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
    // En producción:
    // Voice.stop();
  }, []);

  useEffect(() => {
    // En producción, configurar listeners para el reconocimiento de voz
    // Voice.onSpeechResults = (e) => {
    //   const text = e.value[0].toLowerCase();
    //   setLastTranscript(text);
    //
    //   if (keywords.some(keyword => text.includes(keyword))) {
    //     onDone();
    //     stopListening();
    //   }
    // };

    return () => {
      // Cleanup
      stopListening();
    };
  }, [onDone, keywords, stopListening]);

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
