import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { Button, CustomAlert } from '../components';
import { Ionicons } from '@expo/vector-icons';
import { Activity, Block, WorkoutSession } from '../types';
import { formatTime, generateId, formatTimeLong } from '../utils/helpers';
import { notificationService } from '../services/notification';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useWorkoutHistory } from '../hooks/useStorage';
import { getBestTimeForRoutine } from '../utils/stats';
import { useCustomAlert } from '../hooks/useCustomAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'ExecuteRoutine'>;

export default function ExecuteRoutineScreen({ navigation, route }: Props) {
  const { routine } = route.params;
  const { saveWorkout, history } = useWorkoutHistory();
  const bestTime = getBestTimeForRoutine(routine.id, history);
  const { alertConfig, visible: alertVisible, showAlert, hideAlert } = useCustomAlert();

  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [currentBlockRep, setCurrentBlockRep] = useState(0);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [pendingActivities, setPendingActivities] = useState<Activity[]>([]);
  const [isProcessingPending, setIsProcessingPending] = useState(false);
  const [currentPendingIndex, setCurrentPendingIndex] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const currentBlock = routine.blocks[currentBlockIndex];

  // Determinar actividad actual (puede ser de pendientes o del bloque)
  const currentActivity = isProcessingPending
    ? pendingActivities[currentPendingIndex]
    : currentBlock?.activities[currentActivityIndex];

  const isLastActivityInBlock = currentActivityIndex === currentBlock?.activities.length - 1;
  const isLastRepOfBlock = currentBlockRep === currentBlock?.repetitions - 1;
  const isLastBlock = currentBlockIndex === routine.blocks.length - 1;
  const isLastPendingActivity = currentPendingIndex === pendingActivities.length - 1;

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

  // Timer para tiempo transcurrido
  useEffect(() => {
    if (isPaused || isComplete) {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
      return;
    }

    // Actualizar cada segundo
    elapsedTimerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
    };
  }, [isPaused, isComplete, startTime]);

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

    // Si estamos procesando pendientes
    if (isProcessingPending) {
      if (isLastPendingActivity) {
        // Terminamos de procesar todos los pendientes
        setPendingActivities([]);
        setIsProcessingPending(false);
        setCurrentPendingIndex(0);

        // Verificar si estábamos en el último bloque y última rep
        // En ese caso, la rutina está completa
        if (isLastRepOfBlock && isLastBlock) {
          setIsComplete(true);

          // Reproducir sonido de rutina completada
          await notificationService.playRoutineCompletion();

          // Guardar en el historial
          await saveCompletedWorkout();

          showAlert(
            '¡Rutina Completada!',
            'Has terminado tu entrenamiento',
            [
              {
                text: 'Finalizar',
                onPress: () => navigation.goBack(),
              },
            ],
            'trophy'
          );
          return;
        }

        // Ahora sí avanzar al siguiente bloque o repetición
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
        // Siguiente actividad pendiente
        setCurrentPendingIndex(currentPendingIndex + 1);
      }
      return;
    }

    // Lógica normal (no pendientes)
    if (isLastActivityInBlock && isLastRepOfBlock && isLastBlock) {
      // Verificar si hay pendientes antes de completar
      if (pendingActivities.length > 0) {
        setIsProcessingPending(true);
        setCurrentPendingIndex(0);
        return;
      }

      // Rutina completa
      setIsComplete(true);

      // Reproducir sonido de rutina completada
      await notificationService.playRoutineCompletion();

      // Guardar en el historial
      await saveCompletedWorkout();

      showAlert(
        '¡Rutina Completada!',
        'Has terminado tu entrenamiento',
        [
          {
            text: 'Finalizar',
            onPress: () => navigation.goBack(),
          },
        ],
        'trophy'
      );
      return;
    }

    if (isLastActivityInBlock) {
      // Verificar si hay pendientes antes de cambiar de bloque/repetición
      if (pendingActivities.length > 0) {
        setIsProcessingPending(true);
        setCurrentPendingIndex(0);
        return;
      }

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
    isProcessingPending,
    currentPendingIndex,
    isLastPendingActivity,
    pendingActivities,
    navigation,
    saveCompletedWorkout,
  ]);

  // Reconocimiento de voz para ejercicios por repeticiones
  const { isListening, startListening, stopListening, isAvailable: isVoiceAvailable } = useVoiceRecognition(
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
    showAlert(
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

  const handleSkipPress = () => {
    setShowSkipModal(true);
  };

  const handleSkipDefinitely = async () => {
    setShowSkipModal(false);
    await goToNextActivity();
  };

  const handleSkipPending = async () => {
    setShowSkipModal(false);
    // Agregar actividad actual a la cola de pendientes
    if (currentActivity) {
      setPendingActivities((prev) => [...prev, currentActivity]);
    }
    await goToNextActivity();
  };

  // Verificar si se puede dejar como pendiente (no último ejercicio de última rep del bloque)
  const canLeavePending = !(isLastActivityInBlock && isLastRepOfBlock);

  if (!currentActivity) {
    return null;
  }

  const isTimeBasedActivity = currentActivity.exerciseType === 'time';
  const isRepsBasedActivity = currentActivity.exerciseType === 'reps';
  const isRestActivity = currentActivity.type === 'rest';

  // Formatear tiempo transcurrido (MM:SS o HH:MM:SS)
  const formatElapsedTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        isRestActivity && styles.containerRest,
      ]}
      edges={['top', 'bottom']}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleStop}>
          <Ionicons name="close" size={32} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.routineName}>{routine.name}</Text>
          {pendingActivities.length > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingActivities.length} pendiente{pendingActivities.length !== 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={handleSkipPress} style={styles.skipButton}>
            <Ionicons name="play-skip-forward" size={24} color={theme.colors.warning} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePause}>
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={32}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
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

      {/* Elapsed Time Chip */}
      <View style={styles.elapsedTimeContainer}>
        <View style={styles.elapsedTimeChip}>
          <Ionicons name="time-outline" size={18} color={theme.colors.accent} />
          <Text style={styles.elapsedTimeText}>
            {formatElapsedTime(elapsedTime)}
          </Text>
        </View>
        {bestTime && (
          <View style={styles.bestTimeChip}>
            <Ionicons name="trophy-outline" size={16} color={theme.colors.warning} />
            <Text style={styles.bestTimeChipText}>
              Récord: {formatTimeLong(bestTime)}
            </Text>
          </View>
        )}
      </View>

      {/* Pending Activities Indicator */}
      {isProcessingPending && (
        <View style={styles.pendingIndicatorContainer}>
          <View style={styles.pendingIndicator}>
            <Ionicons name="return-down-back" size={20} color={theme.colors.warning} />
            <Text style={styles.pendingIndicatorText}>
              Ejercicio Pendiente ({currentPendingIndex + 1}/{pendingActivities.length})
            </Text>
          </View>
        </View>
      )}

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Activity Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            isRestActivity && styles.iconContainerRest,
            isRepsBasedActivity && styles.iconContainerSmall,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Ionicons
            name={currentActivity.icon as any}
            size={isRepsBasedActivity ? 60 : 80}
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

            {/* Voice Recognition Indicator - PROMINENTE */}
            {isVoiceAvailable && isListening && (
              <Animated.View style={[styles.voiceIndicator, { transform: [{ scale: pulseAnim }] }]}>
                <Ionicons name="mic-circle" size={40} color={theme.colors.accent} />
                <Text style={styles.voiceText}>
                  Escuchando...
                </Text>
                <Text style={styles.voiceHint}>
                  Di "terminé", "listo" o "siguiente"
                </Text>
              </Animated.View>
            )}

            {/* Info cuando voz no disponible */}
            {!isVoiceAvailable && (
              <View style={styles.infoIndicator}>
                <Ionicons name="information-circle" size={18} color={theme.colors.textTertiary} />
                <Text style={styles.infoText}>
                  Toca el botón cuando termines las repeticiones
                </Text>
              </View>
            )}
          </>
        )}

        {/* Next Activity Preview - ANTES del botón para mejor visibilidad */}
        {(() => {
          // Determinar qué se viene después
          let label = '';
          let nextActivityName = '';

          if (isProcessingPending) {
            // Estamos procesando pendientes
            if (!isLastPendingActivity) {
              label = 'Siguiente pendiente:';
              nextActivityName = pendingActivities[currentPendingIndex + 1]?.name || '';
            } else {
              // Después de los pendientes, volvemos al flujo normal
              if (isLastRepOfBlock) {
                label = 'Próximo bloque:';
                const nextBlock = routine.blocks[currentBlockIndex + 1];
                nextActivityName = nextBlock?.activities[0]?.name || '';
              } else {
                label = 'Repetir bloque:';
                nextActivityName = currentBlock.activities[0]?.name || '';
              }
            }
          } else {
            // Flujo normal
            if (!isLastActivityInBlock) {
              // Siguiente actividad en el mismo bloque
              label = 'Siguiente:';
              nextActivityName = currentBlock.activities[currentActivityIndex + 1]?.name || '';
            } else if (isLastActivityInBlock && !isLastRepOfBlock) {
              // Repetir el bloque o procesar pendientes
              if (pendingActivities.length > 0) {
                label = 'Ejercicios pendientes:';
                nextActivityName = pendingActivities[0]?.name || '';
              } else {
                label = 'Repetir bloque:';
                nextActivityName = currentBlock.activities[0]?.name || '';
              }
            } else if (isLastActivityInBlock && isLastRepOfBlock && !isLastBlock) {
              // Próximo bloque o procesar pendientes
              if (pendingActivities.length > 0) {
                label = 'Ejercicios pendientes:';
                nextActivityName = pendingActivities[0]?.name || '';
              } else {
                label = 'Próximo bloque:';
                const nextBlock = routine.blocks[currentBlockIndex + 1];
                nextActivityName = nextBlock?.activities[0]?.name || '';
              }
            } else {
              // Última actividad de la rutina (o pendientes si hay)
              if (pendingActivities.length > 0) {
                label = 'Ejercicios pendientes:';
                nextActivityName = pendingActivities[0]?.name || '';
              } else {
                label = '¡Última actividad!';
                nextActivityName = '';
              }
            }
          }

          if (!label) return null;

          return (
            <View style={styles.nextActivity}>
              <Text style={styles.nextActivityLabel}>{label}</Text>
              {nextActivityName ? (
                <Text style={styles.nextActivityName}>{nextActivityName}</Text>
              ) : null}
            </View>
          );
        })()}

        {/* Manual Complete Button - DESPUÉS del próximo ejercicio */}
        {isRepsBasedActivity && (
          <Button
            title="Marcar como Completado"
            onPress={goToNextActivity}
            variant="primary"
            size="large"
            fullWidth
            style={styles.completeButton}
          />
        )}
      </ScrollView>

      {/* Skip Modal */}
      <Modal
        visible={showSkipModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSkipModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Saltar Ejercicio</Text>
            <Text style={styles.modalSubtitle}>{currentActivity.name}</Text>

            <View style={styles.modalButtons}>
              {/* Skip Definitely */}
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSkip]}
                onPress={handleSkipDefinitely}
              >
                <Ionicons name="close-circle" size={48} color={theme.colors.error} />
                <Text style={styles.modalButtonTitle}>Saltar</Text>
                <Text style={styles.modalButtonSubtitle}>Definitivamente</Text>
              </TouchableOpacity>

              {/* Skip Pending (only if allowed) */}
              {canLeavePending && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPending]}
                  onPress={handleSkipPending}
                >
                  <Ionicons name="time" size={48} color={theme.colors.warning} />
                  <Text style={styles.modalButtonTitle}>Dejar</Text>
                  <Text style={styles.modalButtonSubtitle}>Pendiente</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowSkipModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Alert */}
      {alertConfig && (
        <CustomAlert
          visible={alertVisible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          icon={alertConfig.icon}
          iconColor={alertConfig.iconColor}
          onDismiss={hideAlert}
        />
      )}
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
  },
  routineName: {
    ...theme.typography.h4,
  },
  pendingBadge: {
    marginTop: theme.spacing.xs,
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.warning + '30',
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  pendingBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    fontSize: 11,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  skipButton: {
    padding: theme.spacing.xs,
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
  elapsedTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    flexWrap: 'wrap',
  },
  elapsedTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.accent + '20',
    borderRadius: theme.borderRadius.round,
    borderWidth: 1.5,
    borderColor: theme.colors.accent + '40',
  },
  elapsedTimeText: {
    ...theme.typography.bodyBold,
    color: theme.colors.accent,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  bestTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.warning + '15',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.warning + '40',
  },
  bestTimeChipText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    fontSize: 12,
    fontWeight: '600',
  },
  pendingIndicatorContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  pendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.warning + '20',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  pendingIndicatorText: {
    ...theme.typography.body,
    color: theme.colors.warning,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 4,
    borderColor: theme.colors.primary,
  },
  iconContainerSmall: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: theme.spacing.md,
  },
  iconContainerRest: {
    backgroundColor: theme.colors.rest + '20',
    borderColor: theme.colors.rest,
  },
  activityName: {
    ...theme.typography.h1,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  timer: {
    ...theme.typography.timer,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  repsContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
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
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.accent + '20',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.accent + '40',
  },
  voiceText: {
    ...theme.typography.bodyBold,
    color: theme.colors.accent,
    marginTop: theme.spacing.xs,
    fontSize: 16,
  },
  voiceHint: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    marginTop: 2,
    textAlign: 'center',
    fontSize: 11,
  },
  infoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCardLight,
    borderRadius: theme.borderRadius.md,
  },
  infoText: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    flex: 1,
    fontSize: 12,
  },
  completeButton: {
    maxWidth: 300,
    marginTop: theme.spacing.lg,
  },
  nextActivity: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 200,
  },
  nextActivityLabel: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.xs,
    fontSize: 12,
  },
  nextActivityName: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  modalContent: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...theme.typography.h3,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  modalSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  modalButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  modalButtonSkip: {
    backgroundColor: theme.colors.error + '20',
    borderWidth: 3,
    borderColor: theme.colors.error,
  },
  modalButtonPending: {
    backgroundColor: theme.colors.warning + '20',
    borderWidth: 3,
    borderColor: theme.colors.warning,
  },
  modalButtonTitle: {
    ...theme.typography.h4,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  modalButtonSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  modalCancelButton: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  modalCancelText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
  },
});
