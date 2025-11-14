import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import es from './locales/es.json';
import en from './locales/en.json';
import pt from './locales/pt.json';

const LANGUAGE_KEY = '@BeatFit:language';

// Recursos de traducción
const resources = {
  es: { translation: es },
  en: { translation: en },
  pt: { translation: pt },
};

// Detectar idioma del dispositivo
const getDeviceLanguage = (): string => {
  const locale = Localization.locale || 'es';
  const languageCode = locale.split('-')[0];
  
  // Si el idioma está soportado, usarlo, sino usar español por defecto
  if (['es', 'en', 'pt'].includes(languageCode)) {
    return languageCode;
  }
  
  return 'es';
};

// Obtener idioma guardado o del dispositivo
export const getStoredLanguage = async (): Promise<string> => {
  try {
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    return storedLanguage || getDeviceLanguage();
  } catch (error) {
    return getDeviceLanguage();
  }
};

// Guardar idioma seleccionado
export const setStoredLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

// Inicializar i18n
export const initI18n = async () => {
  const language = await getStoredLanguage();
  
  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: language,
      fallbackLng: 'es',
      compatibilityJSON: 'v3',
      interpolation: {
        escapeValue: false,
      },
    });
};

export default i18n;

