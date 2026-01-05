import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { theme } from '../theme';
import { useTranslation } from 'react-i18next';

// Screens
import HomeScreen from '../screens/HomeScreen';
import RoutinesListScreen from '../screens/RoutinesListScreen';
import CreateRoutineScreen from '../screens/CreateRoutineScreen';
import ViewRoutineScreen from '../screens/ViewRoutineScreen';
import SelectStartPointScreen from '../screens/SelectStartPointScreen';
import ExecuteRoutineScreen from '../screens/ExecuteRoutineScreen';
import WorkoutHistoryScreen from '../screens/WorkoutHistoryScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import StatsScreen from '../screens/StatsScreen';
import ManageExercisesScreen from '../screens/ManageExercisesScreen';
import SettingsScreen from '../screens/SettingsScreen';

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

function Navigator() {
  const { t } = useTranslation();

  return (
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
        options={{ title: t('routines.title') }}
      />
      <Stack.Screen
        name="CreateRoutine"
        component={CreateRoutineScreen}
        options={{ title: t('createRoutine.title') }}
      />
      <Stack.Screen
        name="ViewRoutine"
        component={ViewRoutineScreen}
        options={{ title: t('viewRoutine.title') }}
      />
      <Stack.Screen
        name="SelectStartPoint"
        component={SelectStartPointScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ExecuteRoutine"
        component={ExecuteRoutineScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WorkoutHistory"
        component={WorkoutHistoryScreen}
        options={{ title: t('history.title') }}
      />
      <Stack.Screen
        name="WorkoutDetail"
        component={WorkoutDetailScreen}
        options={{ title: t('workoutDetail.title') }}
      />
      <Stack.Screen
        name="Stats"
        component={StatsScreen}
        options={{ title: t('stats.title') }}
      />
      <Stack.Screen
        name="ManageExercises"
        component={ManageExercisesScreen}
        options={{ title: t('exercises.title') }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('settings.title') }}
      />
    </Stack.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Navigator />
    </NavigationContainer>
  );
}
