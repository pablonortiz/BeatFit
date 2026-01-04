import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
  BackHandler,
  AppState,
  AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";
import { Button, CustomAlert, UpcomingActivitiesSheet } from "../components";
import { Ionicons } from "@expo/vector-icons";
import {
  Activity,
  Block,
  Routine,
  WorkoutSession,
  ExecutedActivity,
} from "../types";
import { formatTime, generateId, formatTimeLong } from "../utils/helpers";
import { useVoiceRecognition } from "../hooks/useVoiceRecognition";
import { useWorkoutHistory } from "../hooks/useStorage";
import { getBestTimeForRoutine } from "../utils/stats";
import { useCustomAlert } from "../hooks/useCustomAlert";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { workoutSoundService } from "../services/workoutSoundService";

type Props = NativeStackScreenProps<RootStackParamList, "ExecuteRoutine">;

// Tipo extendido de actividad que incluye metadata de ejecución
interface SequencedActivity extends Activity {
  sequenceIndex: number; // Índice en la secuencia completa
  blockIndex: number; // Índice del bloque original
  blockName: string; // Nombre del bloque
  blockRepetition: number; // Qué repetición del bloque es
  isRestBetweenReps: boolean; // Si es un descanso entre repeticiones
}

// Función para generar la secuencia completa de actividades
function generateActivitySequence(routine: Routine, t: (key: string, options?: Record<string, unknown>) => string): SequencedActivity[] {
  const sequence: SequencedActivity[] = [];
  let sequenceIndex = 0;

  routine.blocks.forEach((block, blockIndex) => {
    for (let rep = 0; rep < block.repetitions; rep++) {
      // Agregar todas las actividades del bloque
      block.activities.forEach((activity) => {
        sequence.push({
          ...activity,
          sequenceIndex: sequenceIndex++,
          blockIndex,
          blockName: block.name || t("createRoutine.blockDefaultName", { number: blockIndex + 1 }),
          blockRepetition: rep + 1,
          isRestBetweenReps: false,
        });
      });

      // Agregar descanso entre repeticiones si no es la última repetición
      if (
        rep < block.repetitions - 1 &&
        block.restBetweenReps &&
        block.restBetweenReps > 0
      ) {
        const restActivity: SequencedActivity = {
          id: `rest-between-reps-${block.id}-${rep}`,
          type: "rest",
          name: t("executeRoutine.restBetweenReps"),
          icon: "pause-circle",
          exerciseType: "time",
          duration: block.restBetweenReps,
          sequenceIndex: sequenceIndex++,
          blockIndex,
          blockName: block.name || t("createRoutine.blockDefaultName", { number: blockIndex + 1 }),
          blockRepetition: rep + 1,
          isRestBetweenReps: true,
        };
        sequence.push(restActivity);
      }
    }
  });

  return sequence;
}

export default function ExecuteRoutineScreen({ navigation, route }: Props) {
  const { routine } = route.params;
  const { saveWorkout, history } = useWorkoutHistory();
  const bestTime = getBestTimeForRoutine(routine.id, history);
  const { t } = useTranslation();
  const {
    alertConfig,
    visible: alertVisible,
    showAlert,
    hideAlert,
  } = useCustomAlert();

  // Generar secuencia de actividades al inicio
  const activitySequence = useMemo(
    () => generateActivitySequence(routine, t),
    [routine, t],
  );

  // Estado simplificado
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [pendingActivities, setPendingActivities] = useState<
    SequencedActivity[]
  >([]);
  const [isProcessingPending, setIsProcessingPending] = useState(false);
  const [currentPendingIndex, setCurrentPendingIndex] = useState(0);
  const [executionTimeline, setExecutionTimeline] = useState<
    ExecutedActivity[]
  >([]);
  const executionTimelineRef = useRef<ExecutedActivity[]>([]);
  const [savedWorkoutId, setSavedWorkoutId] = useState<string | null>(null);
  const [currentActivityStartTime, setCurrentActivityStartTime] =
    useState<number>(Date.now());
  const [currentActivityPausedTime, setCurrentActivityPausedTime] =
    useState<number>(0);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState<number>(0);
  const [currentPauseDuration, setCurrentPauseDuration] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isExitingRef = useRef(false);
  const previousActivityIdRef = useRef<string | null>(null);
  const backgroundTimeRef = useRef<number | null>(null);
  const timeRemainingRef = useRef<number>(0);

  // Determinar actividad actual
  const currentActivity: SequencedActivity | undefined = isProcessingPending
    ? pendingActivities[currentPendingIndex]
    : activitySequence[currentSequenceIndex];

  // Obtener bloque actual para UI
  const currentBlock = currentActivity
    ? routine.blocks[currentActivity.blockIndex]
    : routine.blocks[0];

  const isLastPendingActivity =
    currentPendingIndex === pendingActivities.length - 1;

  // Calcular progreso total
  const calculateProgress = useCallback(() => {
    if (isProcessingPending) {
      // Durante pendientes, el progreso sigue siendo el de la secuencia principal
      return currentSequenceIndex / activitySequence.length;
    }
    return currentSequenceIndex / activitySequence.length;
  }, [currentSequenceIndex, activitySequence.length, isProcessingPending]);

  const progress = calculateProgress();

  // Inicializar servicio de sonidos
  useEffect(() => {
    workoutSoundService.initialize();

    return () => {
      workoutSoundService.cleanup();
    };
  }, []);

  // Validar que no haya bloques vacíos
  useEffect(() => {
    const emptyBlocks = routine.blocks.filter(
      (block) => block.activities.length === 0,
    );
    if (emptyBlocks.length > 0) {
      showAlert(
        t("createRoutine.errorEmptyBlocks"),
        t("createRoutine.errorEmptyBlocksMessage"),
        [
          {
            text: t("common.back"),
            onPress: () => navigation.goBack(),
          },
        ],
        "alert-circle",
        theme.colors.error,
      );
    }
  }, [routine, navigation, showAlert]);

  // Trackear cuando cambia la actividad actual (solo cuando cambia el ID)
  const lastTrackedActivityIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      currentActivity &&
      currentActivity.id !== lastTrackedActivityIdRef.current
    ) {
      lastTrackedActivityIdRef.current = currentActivity.id;
      setCurrentActivityStartTime(Date.now());
      setCurrentActivityPausedTime(0); // Reset paused time for new activity
    }
  }, [currentActivity?.id]);

  // Cerrar modal de skip si cambia la actividad mientras está abierto
  useEffect(() => {
    if (showSkipModal) {
      setShowSkipModal(false);
    }
  }, [currentActivity?.id]);

  // Guardar el entrenamiento cuando se complete la rutina
  useEffect(() => {
    if (isComplete && !savedWorkoutId) {
      saveCompletedWorkout();
    }
  }, [isComplete, savedWorkoutId, saveCompletedWorkout]);

  // Timer para tiempo transcurrido (sigue corriendo incluso en pausa)
  useEffect(() => {
    if (isComplete) {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
      return;
    }

    // Actualizar cada segundo (continúa incluso si está en pausa)
    elapsedTimerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
    };
  }, [isComplete, startTime]);

  // Sincronizar valores con refs para acceso en el intervalo
  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

  // Manejar cuando la app va a segundo plano y vuelve
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState: AppStateStatus) => {
        if (nextAppState === "background" || nextAppState === "inactive") {
          // App va a segundo plano
          console.log(
            "[AppState] Going to background, timeRemaining:",
            timeRemainingRef.current,
          );
          backgroundTimeRef.current = Date.now();
        } else if (nextAppState === "active" && backgroundTimeRef.current) {
          // App vuelve a foreground - recalcular tiempo si es necesario
          if (
            currentActivity?.exerciseType === "time" &&
            currentActivity.duration &&
            !isPaused &&
            !isComplete &&
            timeRemainingRef.current > 0
          ) {
            const totalElapsed = Math.floor(
              (Date.now() - currentActivityStartTime) / 1000,
            );
            const activeTime = totalElapsed - currentActivityPausedTime;
            const recalculated = Math.max(
              0,
              currentActivity.duration - activeTime,
            );
            setTimeRemaining(recalculated);

            // Si el tiempo se acabó mientras estaba en background
            if (recalculated === 0) {
              console.log(
                "[AppState] Time expired in background, advancing to next activity",
              );
              goToNextActivity();
            }
          }

          backgroundTimeRef.current = null;
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [currentActivity, isPaused, isComplete, goToNextActivity]);

  // Función para guardar el entrenamiento completado
  const saveCompletedWorkout = useCallback(async () => {
    const endTime = Date.now();
    // Use activitySequence.length to include rest-between-reps activities
    const totalActivities = activitySequence.length;

    // Use ref to get the latest executionTimeline (avoids stale closure)
    const timeline = executionTimelineRef.current;

    // Contar actividades realmente completadas (no saltadas)
    const completedCount = timeline.filter(
      (item) => item.status === "completed",
    ).length;

    const workoutId = generateId();
    const workoutSession: WorkoutSession = {
      id: workoutId,
      routineId: routine.id,
      routineName: routine.name,
      startedAt: startTime,
      completedAt: endTime,
      duration: Math.round((endTime - startTime) / 1000), // en segundos
      totalActivities,
      completedActivities: completedCount,
      blocks: routine.blocks,
      executionTimeline: timeline, // Incluir la línea de tiempo de ejecución
    };

    await saveWorkout(workoutSession);
    setSavedWorkoutId(workoutId);
    return workoutId;
  }, [routine, startTime, saveWorkout, activitySequence]);

  // Función para avanzar a la siguiente actividad (SIMPLIFICADA)
  const goToNextActivity = useCallback(async () => {
    if (!currentActivity) return;

    if (AppState.currentState === "active") {
      workoutSoundService.playExerciseComplete();
    }

    // Registrar actividad actual como completada
    const completedActivity: ExecutedActivity = {
      activity: currentActivity,
      blockIndex: currentActivity.blockIndex,
      blockName: currentActivity.blockName,
      blockRepetition: currentActivity.blockRepetition,
      status: "completed",
      startedAt: currentActivityStartTime,
      completedAt: Date.now(),
      wasPostponed: isProcessingPending, // True si vino de pendientes
      pausedTime:
        currentActivityPausedTime > 0 ? currentActivityPausedTime : undefined,
    };

    // Update both state and ref to ensure ref is always current
    setExecutionTimeline((prev) => {
      const newTimeline = [...prev, completedActivity];
      executionTimelineRef.current = newTimeline;
      return newTimeline;
    });

    // Resetear el tiempo de inicio y el tiempo pausado para la siguiente actividad
    setCurrentActivityStartTime(Date.now());
    setCurrentActivityPausedTime(0);

    // LÓGICA SIMPLIFICADA DE AVANCE
    if (isProcessingPending) {
      // Estamos procesando pendientes
      if (isLastPendingActivity) {
        // Terminamos de procesar todos los pendientes
        setPendingActivities([]);
        setIsProcessingPending(false);
        setCurrentPendingIndex(0);

        // Si ya habíamos terminado la secuencia principal, completar rutina
        if (currentSequenceIndex >= activitySequence.length) {
          setTimeout(() => {
            setIsComplete(true);
          }, 0);
        }
      } else {
        // Siguiente actividad pendiente
        setCurrentPendingIndex(currentPendingIndex + 1);
      }
    } else {
      // Estamos en la secuencia principal
      const nextIndex = currentSequenceIndex + 1;

      if (nextIndex >= activitySequence.length) {
        // Terminamos la secuencia principal
        if (pendingActivities.length > 0) {
          // Hay pendientes, procesarlos
          setIsProcessingPending(true);
          setCurrentPendingIndex(0);
        } else {
          // No hay pendientes, completar rutina
          setTimeout(() => {
            setIsComplete(true);
          }, 0);
        }
      } else {
        // Siguiente actividad en la secuencia
        setCurrentSequenceIndex(nextIndex);
      }
    }
  }, [
    currentActivity,
    currentActivityStartTime,
    currentActivityPausedTime,
    isProcessingPending,
    isLastPendingActivity,
    currentSequenceIndex,
    activitySequence.length,
    pendingActivities,
    currentPendingIndex,
    activitySequence,
  ]);

  // Reconocimiento de voz para ejercicios por repeticiones
  const {
    isListening,
    startListening,
    stopListening,
    isAvailable: isVoiceAvailable,
  } = useVoiceRecognition(goToNextActivity);

  // Configurar temporizador para actividad actual e iniciar notificación
  useEffect(() => {
    if (!currentActivity || isPaused || isComplete) return;

    const isNewActivity = previousActivityIdRef.current !== currentActivity.id;

    if (currentActivity.exerciseType === "time" && currentActivity.duration) {
      // Solo resetear el tiempo si es una nueva actividad
      if (isNewActivity) {
        const computeRemaining = () => {
          const totalElapsed = Math.floor(
            (Date.now() - currentActivityStartTime) / 1000,
          );
          const activeTime = totalElapsed - currentActivityPausedTime;
          return Math.max(0, currentActivity.duration - activeTime);
        };
        setTimeRemaining(computeRemaining());
        previousActivityIdRef.current = currentActivity.id;
      }

      const tick = () => {
        const totalElapsed = Math.floor(
          (Date.now() - currentActivityStartTime) / 1000,
        );
        const activeTime = totalElapsed - currentActivityPausedTime;
        const remaining = Math.max(0, currentActivity.duration - activeTime);
        setTimeRemaining(remaining);
        if (remaining <= 0) {
          goToNextActivity();
        }
      };

      tick();
      timerRef.current = setInterval(tick, 1000);
    } else if (currentActivity.exerciseType === "reps") {
      if (isNewActivity) {
        previousActivityIdRef.current = currentActivity.id;
      }
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
    currentSequenceIndex,
    routine.name,
    progress,
    activitySequence.length,
    currentActivityStartTime,
    currentActivityPausedTime,
  ]);

  // Timer para actualizar el tiempo pausado en tiempo real
  useEffect(() => {
    if (isPaused && pauseStartTime) {
      pauseTimerRef.current = setInterval(() => {
        setCurrentPauseDuration(
          Math.floor((Date.now() - pauseStartTime) / 1000),
        );
      }, 1000);
    } else {
      setCurrentPauseDuration(0);
      if (pauseTimerRef.current) {
        clearInterval(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
    }

    return () => {
      if (pauseTimerRef.current) {
        clearInterval(pauseTimerRef.current);
      }
    };
  }, [isPaused, pauseStartTime]);

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
      ]),
    );

    if (!isPaused && !isComplete) {
      pulse.start();
    } else {
      pulse.stop();
      pulseAnim.setValue(1);
    }

    return () => pulse.stop();
  }, [isPaused, isComplete, pulseAnim]);

  // Interceptar navegación hacia atrás con el botón de la app
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      // Si la rutina ya está completa o el usuario confirmó salir, permitir
      if (isComplete || isExitingRef.current) {
        return;
      }

      // Prevenir la acción por defecto
      e.preventDefault();

      // Mostrar alerta de confirmación
      showAlert(
        t("executeRoutine.exitRoutine"),
        t("executeRoutine.exitWarning"),
        [
          { text: t("executeRoutine.continueRoutine"), style: "cancel" },
          {
            text: t("executeRoutine.exit"),
            style: "destructive",
            onPress: () => {
              isExitingRef.current = true;
              navigation.dispatch(e.data.action);
            },
          },
        ],
        "warning",
        theme.colors.warning,
      );
    });

    return unsubscribe;
  }, [navigation, isComplete, showAlert]);

  // Interceptar botón físico de back en Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // Si la rutina ya está completa o el usuario confirmó salir, permitir
        if (isComplete || isExitingRef.current) {
          return false;
        }

        // Mostrar alerta de confirmación
        showAlert(
          t("executeRoutine.exitRoutine"),
          t("executeRoutine.exitWarning"),
          [
            { text: t("executeRoutine.continueRoutine"), style: "cancel" },
            {
              text: t("executeRoutine.exit"),
              style: "destructive",
              onPress: () => {
                isExitingRef.current = true;
                navigation.goBack();
              },
            },
          ],
          "warning",
          theme.colors.warning,
        );

        return true; // Prevenir comportamiento por defecto
      },
    );

    return () => backHandler.remove();
  }, [navigation, isComplete, showAlert]);

  const handlePause = () => {
    // Haptic feedback al pausar/reanudar
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!isPaused) {
      // Pausando: guardar el timestamp actual
      setPauseStartTime(Date.now());
      workoutSoundService.playPause();
    } else {
      // Reanudando: calcular el tiempo pausado
      if (pauseStartTime) {
        const pauseDuration = Math.floor((Date.now() - pauseStartTime) / 1000);
        setCurrentActivityPausedTime((prev) => prev + pauseDuration);
        setTotalPausedTime((prev) => prev + pauseDuration);
        setPauseStartTime(null);
      }
      workoutSoundService.playResume();
    }
    setIsPaused(!isPaused);
  };

  const handleStop = useCallback(() => {
    // Si la rutina ya está completa, permitir salir sin confirmación
    if (isComplete) {
      navigation.goBack();
      return;
    }

    showAlert(
      t("executeRoutine.exitRoutine"),
      t("executeRoutine.exitWarning"),
      [
        { text: t("executeRoutine.continueRoutine"), style: "cancel" },
        {
          text: t("executeRoutine.exit"),
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            isExitingRef.current = true;
            navigation.goBack();
          },
        },
      ],
      "warning",
      theme.colors.warning,
    );
  }, [isComplete, navigation, showAlert]);

  const handleSkipPress = () => {
    setShowSkipModal(true);
  };

  const handleSkipDefinitely = () => {
    // Haptic feedback al saltar
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowSkipModal(false);

    // Play sound when skipping
    workoutSoundService.playExerciseComplete();

    if (!currentActivity) return;

    // Registrar actividad como saltada
    const skippedActivity: ExecutedActivity = {
      activity: currentActivity,
      blockIndex: currentActivity.blockIndex,
      blockName: currentActivity.blockName,
      blockRepetition: currentActivity.blockRepetition,
      status: "skipped",
      startedAt: currentActivityStartTime,
      completedAt: Date.now(),
      wasPostponed: isProcessingPending,
      pausedTime:
        currentActivityPausedTime > 0 ? currentActivityPausedTime : undefined,
    };

    // Update both state and ref to ensure ref is always current
    setExecutionTimeline((prev) => {
      const newTimeline = [...prev, skippedActivity];
      executionTimelineRef.current = newTimeline;
      return newTimeline;
    });

    // Resetear el tiempo de inicio y el tiempo pausado para la siguiente actividad
    setCurrentActivityStartTime(Date.now());
    setCurrentActivityPausedTime(0);

    // MISMA LÓGICA QUE goToNextActivity
    if (isProcessingPending) {
      if (isLastPendingActivity) {
        setPendingActivities([]);
        setIsProcessingPending(false);
        setCurrentPendingIndex(0);

        if (currentSequenceIndex >= activitySequence.length) {
          setTimeout(() => {
            setIsComplete(true);
          }, 0);
        }
      } else {
        setCurrentPendingIndex(currentPendingIndex + 1);
      }
    } else {
      const nextIndex = currentSequenceIndex + 1;

      if (nextIndex >= activitySequence.length) {
        if (pendingActivities.length > 0) {
          setIsProcessingPending(true);
          setCurrentPendingIndex(0);
        } else {
          setTimeout(() => {
            setIsComplete(true);
          }, 0);
        }
      } else {
        setCurrentSequenceIndex(nextIndex);
      }
    }
  };

  const handleSkipPending = () => {
    // Haptic feedback al postergar
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSkipModal(false);

    if (!currentActivity) return;

    // Registrar actividad como postergada
    const postponedActivity: ExecutedActivity = {
      activity: currentActivity,
      blockIndex: currentActivity.blockIndex,
      blockName: currentActivity.blockName,
      blockRepetition: currentActivity.blockRepetition,
      status: "postponed",
      startedAt: currentActivityStartTime,
      postponedAt: Date.now(),
      wasPostponed: false,
      pausedTime:
        currentActivityPausedTime > 0 ? currentActivityPausedTime : undefined,
    };

    // Update both state and ref to ensure ref is always current
    setExecutionTimeline((prev) => {
      const newTimeline = [...prev, postponedActivity];
      executionTimelineRef.current = newTimeline;
      return newTimeline;
    });

    // Agregar a pendientes
    setPendingActivities((prev) => [...prev, currentActivity]);

    // Resetear el tiempo de inicio y el tiempo pausado para la siguiente actividad
    setCurrentActivityStartTime(Date.now());
    setCurrentActivityPausedTime(0);

    // Avanzar a la siguiente actividad (sin procesarla como completada)
    const nextIndex = currentSequenceIndex + 1;

    if (nextIndex >= activitySequence.length) {
      // Terminamos la secuencia principal, pero hay pendientes
      setIsProcessingPending(true);
      setCurrentPendingIndex(0);
    } else {
      setCurrentSequenceIndex(nextIndex);
    }
  };

  // Verificar si se puede dejar como pendiente
  // No se puede postergar si es un descanso automático entre repeticiones
  const canLeavePending = currentActivity
    ? !currentActivity.isRestBetweenReps
    : false;

  if (!currentActivity) {
    return null;
  }

  const isTimeBasedActivity = currentActivity.exerciseType === "time";
  const isRepsBasedActivity = currentActivity.exerciseType === "reps";
  const isRestActivity = currentActivity.type === "rest";

  // Formatear tiempo transcurrido (MM:SS o HH:MM:SS)
  const formatElapsedTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Reproducir sonido cuando se completa la rutina
  useEffect(() => {
    if (isComplete) {
      workoutSoundService.playRoutineComplete();
    }
  }, [isComplete]);

  // Si la rutina está completa, mostrar pantalla de éxito
  if (isComplete) {
    const isNewBestTime = bestTime ? elapsedTime < bestTime : true;
    const completedCount = executionTimeline.filter(
      (item) => item.status === "completed",
    ).length;
    const skippedCount = executionTimeline.filter(
      (item) => item.status === "skipped",
    ).length;
    const postponedCount = executionTimeline.filter(
      (item) => item.status === "postponed",
    ).length;

    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: theme.colors.success + "20",
                borderColor: theme.colors.success,
              },
            ]}
          >
            <Ionicons name="trophy" size={64} color={theme.colors.success} />
          </View>
          <Text style={styles.activityName}>
            {t("executeRoutine.completed")}
          </Text>

          {isNewBestTime && (
            <View style={styles.bestTimeBadge}>
              <Ionicons name="trophy" size={20} color={theme.colors.warning} />
              <Text style={styles.bestTimeLabel}>
                {t("executeRoutine.newRecord")}
              </Text>
            </View>
          )}

          <Text
            style={[
              styles.completionSubtitle,
              {
                textAlign: "center",
                fontSize: 15,
                marginTop: theme.spacing.sm,
                opacity: 0.8,
              },
            ]}
          >
            {t("executeRoutine.finishedTraining")}
          </Text>

          {/* Tiempo transcurrido */}
          <View
            style={[styles.elapsedTimeChip, { marginTop: theme.spacing.lg }]}
          >
            <Ionicons
              name="time-outline"
              size={18}
              color={theme.colors.accent}
            />
            <Text style={styles.elapsedTimeText}>
              {formatElapsedTime(elapsedTime)}
            </Text>
          </View>

          {/* Estadísticas del entrenamiento */}
          <View style={styles.completionStatsGrid}>
            <View style={styles.completionStatBox}>
              <Ionicons
                name="checkmark-circle"
                size={28}
                color={theme.colors.success}
              />
              <Text style={styles.completionStatValue}>{completedCount}</Text>
              <Text style={styles.completionStatLabel}>
                {t("executeRoutine.completedCount")}
              </Text>
            </View>
            {postponedCount > 0 && (
              <View style={styles.completionStatBox}>
                <Ionicons name="time" size={28} color={theme.colors.warning} />
                <Text style={styles.completionStatValue}>{postponedCount}</Text>
                <Text style={styles.completionStatLabel}>
                  {t("executeRoutine.postponedCount")}
                </Text>
              </View>
            )}
            {skippedCount > 0 && (
              <View style={styles.completionStatBox}>
                <Ionicons
                  name="close-circle"
                  size={28}
                  color={theme.colors.error}
                />
                <Text style={styles.completionStatValue}>{skippedCount}</Text>
                <Text style={styles.completionStatLabel}>
                  {t("executeRoutine.skippedCount")}
                </Text>
              </View>
            )}
          </View>

          {/* Botones */}
          <View style={styles.completionButtons}>
            {savedWorkoutId && (
              <Button
                title={t("executeRoutine.viewDetail")}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const workout = history.find((w) => w.id === savedWorkoutId);
                  if (workout) {
                    navigation.replace("WorkoutDetail", { workout });
                  }
                }}
                variant="outline"
                size="large"
                fullWidth
                style={{ marginBottom: theme.spacing.md }}
              />
            )}
            <Button
              title={t("executeRoutine.finish")}
              onPress={() => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
                navigation.goBack();
              }}
              variant="primary"
              size="large"
              fullWidth
            />
          </View>
        </ScrollView>
        {/* Alerta de respaldo por si acaso */}
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

  // Validar que existe actividad actual
  if (!currentActivity) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.content}>
          <View style={styles.contentContainer}>
            <Text style={styles.activityName}>{t("executeRoutine.loading")}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        style={[styles.container, isRestActivity && styles.containerRest]}
        edges={["top", "bottom"]}
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
                <Text style={styles.pendingBadgeText}>
                  {t("executeRoutine.pendingExercises", { count: pendingActivities.length })}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={handleSkipPress}
              style={styles.skipButton}
            >
              <Ionicons
                name="play-skip-forward"
                size={24}
                color={theme.colors.warning}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePause}>
              <Ionicons
                name={isPaused ? "play" : "pause"}
                size={32}
                color={theme.colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <View style={styles.progressTextContainer}>
            {currentBlock.type === "rest-block" && (
              <Ionicons
                name="pause-circle"
                size={16}
                color={theme.colors.rest}
                style={{ marginRight: theme.spacing.xs }}
              />
            )}
            {currentBlock.type === "warmup" && (
              <Ionicons
                name="flame"
                size={16}
                color={theme.colors.info}
                style={{ marginRight: theme.spacing.xs }}
              />
            )}
            {currentBlock.type === "cooldown" && (
              <Ionicons
                name="leaf"
                size={16}
                color={theme.colors.success}
                style={{ marginRight: theme.spacing.xs }}
              />
            )}
            <Text
              style={[
                styles.progressText,
                currentBlock.type === "rest-block" && {
                  color: theme.colors.rest,
                },
                currentBlock.type === "warmup" && { color: theme.colors.info },
                currentBlock.type === "cooldown" && {
                  color: theme.colors.success,
                },
              ]}
            >
              {currentActivity?.isRestBetweenReps
                ? t("executeRoutine.restBetweenReps")
                : currentBlock.type === "rest-block"
                ? t("executeRoutine.restBetweenBlocks")
                : currentBlock.type === "warmup"
                ? t("executeRoutine.warmup")
                : currentBlock.type === "cooldown"
                ? t("executeRoutine.cooldown")
                : t("executeRoutine.block", {
                    current: currentActivity?.blockIndex
                      ? currentActivity.blockIndex + 1
                      : 1,
                    total: routine.blocks.length,
                  })}{" "}
              •{" "}
              {t("executeRoutine.rep", {
                current: currentActivity?.blockRepetition || 1,
                total: currentBlock.repetitions,
              })}
            </Text>
          </View>
        </View>

        {/* Elapsed Time Chip */}
        <View style={styles.elapsedTimeContainer}>
          <View style={styles.elapsedTimeChip}>
            <Ionicons
              name="time-outline"
              size={18}
              color={theme.colors.accent}
            />
            <Text style={styles.elapsedTimeText}>
              {formatElapsedTime(elapsedTime)}
            </Text>
          </View>
          {bestTime && (
            <View style={styles.bestTimeChip}>
              <Ionicons
                name="trophy-outline"
                size={16}
                color={theme.colors.warning}
              />
              <Text style={styles.bestTimeChipText}>
                {t("executeRoutine.record", { time: formatTimeLong(bestTime) })}
              </Text>
            </View>
          )}
        </View>

        {/* Pending Activities Indicator */}
        {isProcessingPending && (
          <View style={styles.pendingIndicatorContainer}>
            <View style={styles.pendingIndicator}>
              <Ionicons
                name="return-down-back"
                size={20}
                color={theme.colors.warning}
              />
              <Text style={styles.pendingIndicatorText}>
                {t("executeRoutine.exercisePending", {
                  current: currentPendingIndex + 1,
                  total: pendingActivities.length,
                })}
              </Text>
            </View>
          </View>
        )}

        {/* Pause Indicator */}
        {isPaused && (
          <View style={styles.pauseIndicatorContainer}>
            <View style={styles.pauseIndicator}>
              <Ionicons
                name="pause-circle"
                size={48}
                color={theme.colors.warning}
              />
              <Text style={styles.pauseTitle}>
                {t("executeRoutine.pausedRoutine")}
              </Text>
              {pauseStartTime && (
                <View style={styles.pauseTimeChip}>
                  <Ionicons
                    name="timer-outline"
                    size={18}
                    color={theme.colors.warning}
                  />
                  <Text style={styles.pauseTimeText}>
                    {t("executeRoutine.paused", {
                      time: formatTime(
                        currentActivityPausedTime + currentPauseDuration,
                      ),
                    })}
                  </Text>
                </View>
              )}
              <Text style={styles.pauseHint}>
                {t("executeRoutine.pressPlay")}
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
                <Text style={styles.repsLabel}>{t("executeRoutine.reps")}</Text>
                <Text style={styles.repsValue}>{currentActivity.reps}</Text>
              </View>

              {/* Voice Recognition Indicator - PROMINENTE */}
              {isVoiceAvailable && isListening && (
                <Animated.View
                  style={[
                    styles.voiceIndicator,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  <Ionicons
                    name="mic-circle"
                    size={40}
                    color={theme.colors.accent}
                  />
                  <Text style={styles.voiceText}>
                    {t("executeRoutine.listening")}
                  </Text>
                  <Text style={styles.voiceHint}>
                    {t("executeRoutine.voiceHint")}
                  </Text>
                  <Text style={styles.voiceHintSmall}>
                    {t("executeRoutine.voiceHintAlt")}
                  </Text>
                </Animated.View>
              )}

              {/* Info cuando voz no disponible */}
              {!isVoiceAvailable && (
                <View style={styles.infoIndicator}>
                  <Ionicons
                    name="information-circle"
                    size={18}
                    color={theme.colors.textTertiary}
                  />
                  <Text style={styles.infoText}>
                    {t("executeRoutine.tapWhenDone")}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Next Activity Preview - SIMPLIFICADO */}
          {(() => {
            let label = "";
            let nextActivityName = "";

            if (isProcessingPending) {
              // Estamos procesando pendientes
              if (!isLastPendingActivity) {
                label = t("executeRoutine.nextPending");
                nextActivityName =
                  pendingActivities[currentPendingIndex + 1]?.name || "";
              } else {
                // Último pendiente
                label = t("executeRoutine.lastActivity");
                nextActivityName = "";
              }
            } else {
              // Estamos en la secuencia principal
              const nextIndex = currentSequenceIndex + 1;

              if (nextIndex < activitySequence.length) {
                // Hay más actividades en la secuencia
                const nextActivity = activitySequence[nextIndex];

                if (nextActivity.isRestBetweenReps) {
                  label = t("executeRoutine.restBetweenReps");
                } else {
                  label = t("executeRoutine.nextExercise");
                }

                nextActivityName = nextActivity.name;
              } else {
                // Terminamos la secuencia principal
                if (pendingActivities.length > 0) {
                  label = t("executeRoutine.pendingExercises", {
                    count: pendingActivities.length,
                  });
                  nextActivityName = pendingActivities[0]?.name || "";
                } else {
                  label = t("executeRoutine.lastActivity");
                  nextActivityName = "";
                }
              }
            }

            if (!label) return null;

            return (
              <View style={styles.nextActivity}>
                <Text style={styles.nextActivityLabel}>{label}</Text>
                {nextActivityName ? (
                  <Text style={styles.nextActivityName}>
                    {nextActivityName}
                  </Text>
                ) : null}
              </View>
            );
          })()}
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
              <Text style={styles.modalTitle}>
                {t("executeRoutine.skipExercise")}
              </Text>
              <Text style={styles.modalSubtitle}>{currentActivity.name}</Text>

              <View style={styles.modalButtons}>
                {/* Skip Definitely */}
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSkip]}
                  onPress={handleSkipDefinitely}
                >
                  <Ionicons
                    name="close-circle"
                    size={48}
                    color={theme.colors.error}
                  />
                  <Text style={styles.modalButtonTitle}>
                    {t("executeRoutine.skip")}
                  </Text>
                  <Text style={styles.modalButtonSubtitle}>
                    {t("executeRoutine.skipDefinitely")}
                  </Text>
                </TouchableOpacity>

                {/* Skip Pending (only if allowed) */}
                {canLeavePending && (
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonPending]}
                    onPress={handleSkipPending}
                  >
                    <Ionicons
                      name="time"
                      size={48}
                      color={theme.colors.warning}
                    />
                    <Text style={styles.modalButtonTitle}>
                      {t("executeRoutine.skipPendingVerb")}
                    </Text>
                    <Text style={styles.modalButtonSubtitle}>
                      {t("executeRoutine.skipPendingNoun")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowSkipModal(false)}
              >
                <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
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

        {/* Floating Complete Button for Reps-based exercises */}
        {isRepsBasedActivity && !isPaused && (
          <View style={styles.floatingButtonContainer}>
            <TouchableOpacity
              style={styles.floatingCompleteButton}
              onPress={() => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
                goToNextActivity();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={32} color="#FFFFFF" />
              <Text style={styles.floatingButtonText}>
                {t("executeRoutine.markComplete")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upcoming Activities Sheet */}
        {!isComplete && currentActivity && (
          <UpcomingActivitiesSheet
            activitySequence={activitySequence}
            currentSequenceIndex={currentSequenceIndex}
            isProcessingPending={isProcessingPending}
            pendingActivities={pendingActivities}
            currentPendingIndex={currentPendingIndex}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  containerRest: {
    backgroundColor: "#001529", // Fondo más azulado para descanso
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: theme.spacing.md,
  },
  routineName: {
    ...theme.typography.h4,
  },
  pendingBadge: {
    marginTop: theme.spacing.xs,
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.warning + "30",
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  pendingBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    fontSize: 11,
    fontWeight: "600",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
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
    overflow: "hidden",
    marginBottom: theme.spacing.sm,
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.round,
  },
  progressTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.xs,
  },
  progressText: {
    ...theme.typography.caption,
    textAlign: "center",
  },
  elapsedTimeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    flexWrap: "wrap",
  },
  elapsedTimeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.accent + "20",
    borderRadius: theme.borderRadius.round,
    borderWidth: 1.5,
    borderColor: theme.colors.accent + "40",
  },
  elapsedTimeText: {
    ...theme.typography.bodyBold,
    color: theme.colors.accent,
    fontSize: 16,
    fontVariant: ["tabular-nums"],
  },
  bestTimeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.warning + "15",
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.warning + "40",
  },
  bestTimeChipText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    fontSize: 12,
    fontWeight: "600",
  },
  pendingIndicatorContainer: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  pendingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.warning + "20",
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  pendingIndicatorText: {
    ...theme.typography.body,
    color: theme.colors.warning,
    fontWeight: "600",
  },
  pauseIndicatorContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  pauseIndicator: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.warning + "15",
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.warning,
  },
  pauseTitle: {
    ...theme.typography.h3,
    color: theme.colors.warning,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  pauseTimeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.backgroundCard,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  pauseTimeText: {
    ...theme.typography.bodyBold,
    color: theme.colors.warning,
  },
  pauseHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    paddingBottom: 180, // Espacio para el sheet colapsado y el botón flotante
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: theme.colors.rest + "20",
    borderColor: theme.colors.rest,
  },
  activityName: {
    ...theme.typography.h1,
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  timer: {
    ...theme.typography.timer,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  repsContainer: {
    alignItems: "center",
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
    alignItems: "center",
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.accent + "20",
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.accent + "40",
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
    textAlign: "center",
    fontSize: 11,
  },
  voiceHintSmall: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    opacity: 0.7,
    marginTop: 2,
    textAlign: "center",
    fontSize: 9,
  },
  infoIndicator: {
    flexDirection: "row",
    alignItems: "center",
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
  nextActivity: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    alignItems: "center",
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
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  modalContent: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    ...theme.typography.h3,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  modalSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  modalButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.md,
  },
  modalButtonSkip: {
    backgroundColor: theme.colors.error + "20",
    borderWidth: 3,
    borderColor: theme.colors.error,
  },
  modalButtonPending: {
    backgroundColor: theme.colors.warning + "20",
    borderWidth: 3,
    borderColor: theme.colors.warning,
  },
  modalButtonTitle: {
    ...theme.typography.h4,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  modalButtonSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  modalCancelButton: {
    paddingVertical: theme.spacing.md,
    alignItems: "center",
  },
  modalCancelText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
  },
  bestTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.warning + "20",
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.warning,
    marginTop: theme.spacing.sm,
  },
  bestTimeLabel: {
    ...theme.typography.bodyBold,
    color: theme.colors.warning,
    fontSize: 14,
  },
  completionStatsGrid: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    flexWrap: "wrap",
  },
  completionStatBox: {
    alignItems: "center",
    gap: theme.spacing.xs,
    minWidth: 80,
  },
  completionStatValue: {
    ...theme.typography.h3,
  },
  completionStatLabel: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  completionSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  completionButtons: {
    width: "100%",
    paddingHorizontal: theme.spacing.lg,
    maxWidth: 400,
  },
  floatingButtonContainer: {
    position: "absolute",
    bottom: 140, // Above the UpcomingActivitiesSheet
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  floatingCompleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.round,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 220,
  },
  floatingButtonText: {
    ...theme.typography.bodyBold,
    color: "#FFFFFF",
    fontSize: 18,
  },
});
