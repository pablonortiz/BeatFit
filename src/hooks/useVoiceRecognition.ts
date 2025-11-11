import { useState, useEffect, useCallback, useRef } from 'react';
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

  const isListeningRef = useRef(false);
  const onDoneRef = useRef(onDone);
  const keywordsRef = useRef(keywords);

  // Actualizar refs cuando cambien
  useEffect(() => {
    onDoneRef.current = onDone;
    keywordsRef.current = keywords;
  }, [onDone, keywords]);

  // Configurar listeners UNA SOLA VEZ al montar
  useEffect(() => {
    console.log('[Voice] Configurando listeners');

    Voice.onSpeechStart = () => {
      console.log('[Voice] onSpeechStart');
    };

    Voice.onSpeechResults = (e) => {
      console.log('[Voice] onSpeechResults:', e.value);
      if (e.value && e.value.length > 0) {
        const text = e.value[0].toLowerCase();
        setLastTranscript(text);

        // Verificar si alguna palabra clave fue detectada
        const matched = keywordsRef.current.some(keyword =>
          text.includes(keyword.toLowerCase())
        );

        console.log('[Voice] Texto detectado:', text, 'Matched:', matched);

        if (matched) {
          console.log('[Voice] Palabra clave detectada! Llamando onDone');
          onDoneRef.current();
        }
      }
    };

    Voice.onSpeechError = (e) => {
      console.log('[Voice] onSpeechError:', e);
      setIsListening(false);
      isListeningRef.current = false;
    };

    Voice.onSpeechEnd = () => {
      console.log('[Voice] onSpeechEnd, isListening:', isListeningRef.current);
      // Reiniciar automáticamente si todavía estamos en modo listening
      if (isListeningRef.current) {
        setTimeout(() => {
          Voice.start('es-ES').catch((err) => {
            console.log('[Voice] Error reiniciando:', err);
          });
        }, 100);
      }
    };

    return () => {
      console.log('[Voice] Cleanup - removiendo listeners');
      Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
    };
  }, []); // Solo al montar

  // Verificar disponibilidad
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        console.log('[Voice] Pidiendo permiso de micrófono');
        const hasPermission = await requestMicrophonePermission();

        if (!hasPermission) {
          console.log('[Voice] Permiso denegado');
          setIsAvailable(false);
          return;
        }

        console.log('[Voice] Permiso otorgado, Voice disponible');
        setIsAvailable(true);
      } catch (error) {
        console.log('[Voice] Error verificando disponibilidad:', error);
        setIsAvailable(true); // Asumir disponible en builds nativos
      }
    };
    checkAvailability();
  }, []);

  const startListening = useCallback(async () => {
    if (!isAvailable) {
      console.log('[Voice] No disponible, no se puede iniciar');
      return;
    }

    try {
      console.log('[Voice] Iniciando reconocimiento');
      await Voice.start('es-ES');
      setIsListening(true);
      isListeningRef.current = true;
      console.log('[Voice] Reconocimiento iniciado correctamente');
    } catch (error) {
      console.log('[Voice] Error al iniciar:', error);
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, [isAvailable]);

  const stopListening = useCallback(async () => {
    try {
      console.log('[Voice] Deteniendo reconocimiento');
      isListeningRef.current = false;
      setIsListening(false);
      await Voice.stop();
      await Voice.destroy();
    } catch (error) {
      console.log('[Voice] Error al detener:', error);
    }
  }, []);

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
