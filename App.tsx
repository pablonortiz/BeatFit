import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { theme } from './src/theme';
import { initI18n } from './src/i18n';
import './src/i18n'; // Importar para que i18n esté disponible

const ONBOARDING_KEY = '@BeatFit:onboarding_completed';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [i18nInitialized, setI18nInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Inicializar i18n
      await initI18n();
      setI18nInitialized(true);

      // Verificar onboarding
      await checkOnboarding();
    } catch (error) {
      console.error('Error initializing app:', error);
      setIsLoading(false);
    }
  };

const checkOnboarding = async () => {
  try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      // Si no existe o es null, mostrar onboarding
      if (value === null) {
        setShowOnboarding(true);
      } else {
        // Parsear como boolean
        setShowOnboarding(value !== '1');
      }
    } catch (error) {
      console.error('Error checking onboarding:', error);
      setShowOnboarding(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, '1');
      setShowOnboarding(false);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  if (isLoading || !i18nInitialized) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={styles.container}>
          <StatusBar style="light" />
          {showOnboarding ? (
            <OnboardingScreen onComplete={handleOnboardingComplete} />
          ) : (
            <AppNavigator />
          )}
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
