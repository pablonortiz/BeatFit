import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
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

export function AppNavigator() {
  return (
    <NavigationContainer>
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
          animation: 'slide_from_right',
          animationDuration: 200,
          customAnimationOnGesture: true,
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
