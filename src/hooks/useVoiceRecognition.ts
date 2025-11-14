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
      // Primero verificar si ya tenemos el permiso
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      
      if (hasPermission) {
        return true;
      }
      
      // Solo solicitar si no lo tenemos
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
  keywords: string[] = [
    'terminé', 'termine', 'terminado', 'terminada',
    'listo', 'lista', 'listos', 'listas',
    'siguiente', 'sigue', 'continúa', 'continua',
    'done', 'finished', 'next', 'ready',
    'ya', 'ok', 'adelante', 'hecho', 'hecha',
    'completo', 'completa', 'fin', 'final'
  ]
): VoiceRecognitionHook {
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);

  const isListeningRef = useRef(false);
  const onDoneRef = useRef(onDone);
  const keywordsRef = useRef(keywords);
  const lastCallTimeRef = useRef(0);

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
        const text = e.value[0].toLowerCase().trim();
        setLastTranscript(text);

        // Normalizar texto: quitar acentos para mejor matching
        const normalizeText = (str: string) => {
          return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
        };

        const normalizedText = normalizeText(text);

        // Verificar si alguna palabra clave fue detectada
        const matched = keywordsRef.current.some(keyword => {
          const normalizedKeyword = normalizeText(keyword);
          // Buscar palabra exacta o que el texto contenga la palabra
          const words = normalizedText.split(/\s+/);
          return words.includes(normalizedKeyword) || normalizedText.includes(normalizedKeyword);
        });

        console.log('[Voice] Texto detectado:', text, 'Normalizado:', normalizedText, 'Matched:', matched);

        if (matched) {
          // Evitar llamadas duplicadas (debouncing)
          const now = Date.now();
          if (now - lastCallTimeRef.current < 1500) {
            console.log('[Voice] Ignorando detección duplicada (debounce)');
            return;
          }
          lastCallTimeRef.current = now;

          console.log('[Voice] ¡Palabra clave detectada! Llamando onDone');
          
          // Dar feedback de voz (opcional)
          Speech.speak('Entendido', {
            language: 'es-ES',
            rate: 1.2,
            pitch: 1.0,
          }).catch(() => {});

          onDoneRef.current();
        }
      }
    };

    Voice.onSpeechError = (e) => {
      console.log('[Voice] onSpeechError:', e);
      
      // Algunos errores no son fatales y podemos reintentar
      const errorCode = e?.error?.code || e?.code || '';
      const isFatalError = errorCode === '7' || errorCode === 'permissions';
      
      if (isFatalError) {
        console.log('[Voice] Error fatal, deteniendo reconocimiento');
        setIsListening(false);
        isListeningRef.current = false;
      } else {
        // Error no fatal, reintentar
        console.log('[Voice] Error no fatal, reintentando...');
        if (isListeningRef.current) {
          setTimeout(() => {
            Voice.start('es-ES').catch((err) => {
              console.log('[Voice] Error al reintentar:', err);
            });
          }, 500);
        }
      }
    };

    Voice.onSpeechEnd = () => {
      console.log('[Voice] onSpeechEnd, isListening:', isListeningRef.current);
      // Reiniciar automáticamente si todavía estamos en modo listening
      if (isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current) { // Doble verificación
            Voice.start('es-ES').catch((err) => {
              console.log('[Voice] Error reiniciando en onSpeechEnd:', err);
            });
          }
        }, 300);
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
        // Verificar que el módulo nativo existe (no funciona en Expo Go)
        // @ts-ignore - acceder a propiedad privada para verificar módulo nativo
        const hasNativeModule = Voice && typeof Voice.start === 'function';

        if (!hasNativeModule) {
          console.log('[Voice] Módulo nativo no disponible (probablemente Expo Go)');
          setIsAvailable(false);
          return;
        }

        console.log('[Voice] Pidiendo permiso de micrófono');
        const hasPermission = await requestMicrophonePermission();

        if (!hasPermission) {
          console.log('[Voice] Permiso denegado');
          setIsAvailable(false);
          return;
        }

        // Intentar verificar disponibilidad con timeout
        const checkWithTimeout = Promise.race([
          Voice.isAvailable(),
          new Promise((_, reject) => setTimeout(() => reject('timeout'), 1000))
        ]);

        await checkWithTimeout;
        console.log('[Voice] Módulo nativo disponible y funcional');
        setIsAvailable(true);
      } catch (error) {
        console.log('[Voice] Error verificando disponibilidad:', error);
        // Si Voice.isAvailable() falla, verificamos si es por timeout o error real
        // En Expo Go, dará error "Cannot read property"
        const errorMsg = String(error);
        if (errorMsg.includes('null') || errorMsg.includes('undefined')) {
          console.log('[Voice] Módulo nativo no disponible - usar build nativo');
          setIsAvailable(false);
        } else {
          // Timeout o error menor - asumir disponible
          console.log('[Voice] Asumiendo disponible (build nativo)');
          setIsAvailable(true);
        }
      }
    };
    checkAvailability();
  }, []);

  const startListening = useCallback(async () => {
    if (!isAvailable) {
      console.log('[Voice] No disponible, no se puede iniciar');
      return;
    }

    // Si ya está escuchando, no iniciar de nuevo
    if (isListeningRef.current) {
      console.log('[Voice] Ya está escuchando, no reiniciar');
      return;
    }

    try {
      console.log('[Voice] Iniciando reconocimiento');
      // Asegurarse de que no haya sesiones previas
      await Voice.destroy().catch(() => {});
      await Voice.start('es-ES');
      setIsListening(true);
      isListeningRef.current = true;
      console.log('[Voice] Reconocimiento iniciado correctamente');
    } catch (error) {
      console.log('[Voice] Error al iniciar:', error);
      setIsListening(false);
      isListeningRef.current = false;
      
      // Si el error es por permisos, actualizar disponibilidad
      const errorMsg = String(error);
      if (errorMsg.includes('permission') || errorMsg.includes('Permission')) {
        console.log('[Voice] Error de permisos, marcando como no disponible');
        setIsAvailable(false);
      }
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
