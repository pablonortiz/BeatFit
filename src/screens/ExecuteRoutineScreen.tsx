import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { Button } from '../components';
import { Ionicons } from '@expo/vector-icons';
import { Activity, Block, WorkoutSession } from '../types';
import { formatTime, generateId } from '../utils/helpers';
import { notificationService } from '../services/notification';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useWorkoutHistory } from '../hooks/useStorage';

type Props = NativeStackScreenProps<RootStackParamList, 'ExecuteRoutine'>;

export default function ExecuteRoutineScreen({ navigation, route }: Props) {
  const { routine } = route.params;
  const { saveWorkout } = useWorkoutHistory();

  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [currentBlockRep, setCurrentBlockRep] = useState(0);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime] = useState(Date.now());

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const currentBlock = routine.blocks[currentBlockIndex];
  const currentActivity = currentBlock?.activities[currentActivityIndex];
  const isLastActivityInBlock = currentActivityIndex === currentBlock?.activities.length - 1;
  const isLastRepOfBlock = currentBlockRep === currentBlock?.repetitions - 1;
  const isLastBlock = currentBlockIndex === routine.blocks.length - 1;

  // Calcular progreso total
  const calculateProgress = useCallback(() => {
    let completedActivities = 0;
    let totalActivities = 0;

    routine.blocks.forEach((block, blockIdx) => {
      const activitiesInBlock = block.activities.length * block.repetitions;
      totalActivities += activitiesInBlock;

      if (blockIdx < currentBlockIndex) {
        completedActivities += activitiesInBlock;
      } else if (blockIdx === currentBlockIndex) {
        completedActivities += currentBlockRep * block.activities.length + currentActivityIndex;
      }
    });

    return totalActivities > 0 ? completedActivities / totalActivities : 0;
  }, [routine, currentBlockIndex, currentBlockRep, currentActivityIndex]);

  const progress = calculateProgress();

  // Inicializar notificaciones
  useEffect(() => {
    notificationService.initialize();
    return () => {
      notificationService.cleanup();
    };
  }, []);

  // Función para guardar el entrenamiento completado
  const saveCompletedWorkout = useCallback(async () => {
    const endTime = Date.now();
    const totalActivities = routine.blocks.reduce(
      (sum, block) => sum + block.activities.length * block.repetitions,
      0
    );

    const workoutSession: WorkoutSession = {
      id: generateId(),
      routineId: routine.id,
      routineName: routine.name,
      startedAt: startTime,
      completedAt: endTime,
      duration: Math.round((endTime - startTime) / 1000), // en segundos
      totalActivities,
      completedActivities: totalActivities,
      blocks: routine.blocks,
    };

    await saveWorkout(workoutSession);
  }, [routine, startTime, saveWorkout]);

  // Función para avanzar a la siguiente actividad
  const goToNextActivity = useCallback(async () => {
    // Reproducir notificación
    await notificationService.playNotification();

    if (isLastActivityInBlock && isLastRepOfBlock && isLastBlock) {
      // Rutina completa
      setIsComplete(true);

      // Guardar en el historial
      await saveCompletedWorkout();

      Alert.alert(
        '¡Rutina Completada!',
        'Has terminado tu entrenamiento',
        [
          {
            text: 'Finalizar',
            onPress: () => navigation.goBack(),
          },
        ]
      );
      return;
    }

    if (isLastActivityInBlock) {
      if (isLastRepOfBlock) {
        // Siguiente bloque
        setCurrentBlockIndex(currentBlockIndex + 1);
        setCurrentBlockRep(0);
        setCurrentActivityIndex(0);
      } else {
        // Siguiente repetición del bloque
        setCurrentBlockRep(currentBlockRep + 1);
        setCurrentActivityIndex(0);
      }
    } else {
      // Siguiente actividad en el bloque
      setCurrentActivityIndex(currentActivityIndex + 1);
    }
  }, [
    currentBlockIndex,
    currentBlockRep,
    currentActivityIndex,
    isLastActivityInBlock,
    isLastRepOfBlock,
    isLastBlock,
    navigation,
  ]);

  // Reconocimiento de voz para ejercicios por repeticiones
  const { isListening, startListening, stopListening } = useVoiceRecognition(
    goToNextActivity
  );

  // Configurar temporizador para actividad actual
  useEffect(() => {
    if (!currentActivity || isPaused || isComplete) return;

    if (currentActivity.exerciseType === 'time' && currentActivity.duration) {
      setTimeRemaining(currentActivity.duration);

      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            goToNextActivity();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (currentActivity.exerciseType === 'reps') {
      // Para ejercicios por repeticiones, activar reconocimiento de voz
      startListening();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      stopListening();
    };
  }, [
    currentActivity,
    isPaused,
    isComplete,
    goToNextActivity,
    startListening,
    stopListening,
  ]);

  // Animación de pulso para el icono
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    if (!isPaused && !isComplete) {
      pulse.start();
    } else {
      pulse.stop();
      pulseAnim.setValue(1);
    }

    return () => pulse.stop();
  }, [isPaused, isComplete, pulseAnim]);

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    Alert.alert(
      'Detener Rutina',
      '¿Estás seguro que deseas detener la rutina?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Detener',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  if (!currentActivity) {
    return null;
  }

  const isTimeBasedActivity = currentActivity.exerciseType === 'time';
  const isRepsBasedActivity = currentActivity.exerciseType === 'reps';
  const isRestActivity = currentActivity.type === 'rest';

  return (
    <SafeAreaView
      style={[
        styles.container,
        isRestActivity && styles.containerRest,
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleStop}>
          <Ionicons name="close" size={32} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.routineName}>{routine.name}</Text>
        <TouchableOpacity onPress={handlePause}>
          <Ionicons
            name={isPaused ? 'play' : 'pause'}
            size={32}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Bloque {currentBlockIndex + 1}/{routine.blocks.length} • Rep {currentBlockRep + 1}/
          {currentBlock.repetitions}
        </Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Activity Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            isRestActivity && styles.iconContainerRest,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Ionicons
            name={currentActivity.icon as any}
            size={80}
            color={isRestActivity ? theme.colors.rest : theme.colors.exercise}
          />
        </Animated.View>

        {/* Activity Name */}
        <Text style={styles.activityName}>{currentActivity.name}</Text>

        {/* Timer or Reps */}
        {isTimeBasedActivity && (
          <Text style={styles.timer}>{formatTime(timeRemaining)}</Text>
        )}

        {isRepsBasedActivity && (
          <>
            <View style={styles.repsContainer}>
              <Text style={styles.repsLabel}>Repeticiones</Text>
              <Text style={styles.repsValue}>{currentActivity.reps}</Text>
            </View>

            {/* Voice Recognition Indicator */}
            {isListening && (
              <View style={styles.voiceIndicator}>
                <Ionicons name="mic" size={24} color={theme.colors.accent} />
                <Text style={styles.voiceText}>
                  Di "terminé" o toca el botón
                </Text>
              </View>
            )}

            {/* Manual Complete Button */}
            <Button
              title="Marcar como Completado"
              onPress={goToNextActivity}
              variant="primary"
              size="large"
              fullWidth
              style={styles.completeButton}
            />
          </>
        )}

        {/* Next Activity Preview */}
        {!isLastActivityInBlock && (
          <View style={styles.nextActivity}>
            <Text style={styles.nextActivityLabel}>Siguiente:</Text>
            <Text style={styles.nextActivityName}>
              {currentBlock.activities[currentActivityIndex + 1]?.name}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  containerRest: {
    backgroundColor: '#001529', // Fondo más azulado para descanso
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  routineName: {
    ...theme.typography.h4,
  },
  progressContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.round,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.round,
  },
  progressText: {
    ...theme.typography.caption,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    borderWidth: 4,
    borderColor: theme.colors.primary,
  },
  iconContainerRest: {
    backgroundColor: theme.colors.rest + '20',
    borderColor: theme.colors.rest,
  },
  activityName: {
    ...theme.typography.h1,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  timer: {
    ...theme.typography.timer,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  repsContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  repsLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  repsValue: {
    ...theme.typography.timer,
  },
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.accent + '20',
    borderRadius: theme.borderRadius.md,
  },
  voiceText: {
    ...theme.typography.bodySmall,
    color: theme.colors.accent,
  },
  completeButton: {
    maxWidth: 300,
  },
  nextActivity: {
    marginTop: theme.spacing.xxl,
    alignItems: 'center',
  },
  nextActivityLabel: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.xs,
  },
  nextActivityName: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
  },
});
