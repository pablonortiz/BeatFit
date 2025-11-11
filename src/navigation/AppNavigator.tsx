import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { theme } from '../theme';

// Screens
import HomeScreen from '../screens/HomeScreen';
import RoutinesListScreen from '../screens/RoutinesListScreen';
import CreateRoutineScreen from '../screens/CreateRoutineScreen';
import ExecuteRoutineScreen from '../screens/ExecuteRoutineScreen';
import WorkoutHistoryScreen from '../screens/WorkoutHistoryScreen';
import StatsScreen from '../screens/StatsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Tema personalizado para NavigationContainer
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background,
    card: theme.colors.background,
    primary: theme.colors.primary,
    text: theme.colors.textPrimary,
    border: theme.colors.border,
    notification: theme.colors.accent,
  },
};

export function AppNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.textPrimary,
          headerTitleStyle: {
            fontSize: 22,
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
          animation: 'fade',
          animationDuration: 150,
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RoutinesList"
          component={RoutinesListScreen}
          options={{ title: 'Mis Rutinas' }}
        />
        <Stack.Screen
          name="CreateRoutine"
          component={CreateRoutineScreen}
          options={{ title: 'Crear Rutina' }}
        />
        <Stack.Screen
          name="ExecuteRoutine"
          component={ExecuteRoutineScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="WorkoutHistory"
          component={WorkoutHistoryScreen}
          options={{ title: 'Historial' }}
        />
        <Stack.Screen
          name="Stats"
          component={StatsScreen}
          options={{ title: 'Estadísticas' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
