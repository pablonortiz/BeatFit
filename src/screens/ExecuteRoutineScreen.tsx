import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";
import { Button, CustomAlert } from "../components";
import { Ionicons } from "@expo/vector-icons";
import { Activity, Block, WorkoutSession, ExecutedActivity } from "../types";
import { formatTime, generateId, formatTimeLong } from "../utils/helpers";
import { notificationService } from "../services/notification";
import { useVoiceRecognition } from "../hooks/useVoiceRecognition";
import { useWorkoutHistory } from "../hooks/useStorage";
import { getBestTimeForRoutine } from "../utils/stats";
import { useCustomAlert } from "../hooks/useCustomAlert";
import * as Haptics from "expo-haptics";

type Props = NativeStackScreenProps<RootStackParamList, "ExecuteRoutine">;

export default function ExecuteRoutineScreen({ navigation, route }: Props) {
  const { routine } = route.params;
  const { saveWorkout, history } = useWorkoutHistory();
  const bestTime = getBestTimeForRoutine(routine.id, history);
  const {
    alertConfig,
    visible: alertVisible,
    showAlert,
    hideAlert,
  } = useCustomAlert();

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
  const [executionTimeline, setExecutionTimeline] = useState<
    ExecutedActivity[]
  >([]);
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

  const currentBlock = routine.blocks[currentBlockIndex];

  // Determinar actividad actual (puede ser de pendientes o del bloque)
  const currentActivity = isProcessingPending
    ? pendingActivities[currentPendingIndex]
    : currentBlock?.activities[currentActivityIndex];

  const isLastActivityInBlock =
    currentActivityIndex === currentBlock?.activities.length - 1;
  const isLastRepOfBlock = currentBlockRep === currentBlock?.repetitions - 1;
  const isLastBlock = currentBlockIndex === routine.blocks.length - 1;
  const isLastPendingActivity =
    currentPendingIndex === pendingActivities.length - 1;

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
        completedActivities +=
          currentBlockRep * block.activities.length + currentActivityIndex;
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

  // Validar que no haya bloques vacíos
  useEffect(() => {
    const emptyBlocks = routine.blocks.filter(
      (block) => block.activities.length === 0,
    );
    if (emptyBlocks.length > 0) {
      showAlert(
        "Error en la rutina",
        "Esta rutina tiene bloques vacíos. Por favor edítala antes de ejecutarla.",
        [
          {
            text: "Volver",
            onPress: () => navigation.goBack(),
          },
        ],
        "alert-circle",
        theme.colors.error,
      );
    }
  }, [routine, navigation, showAlert]);

  // Trackear cuando cambia la actividad actual
  useEffect(() => {
    if (!isPaused && !isComplete && currentActivity) {
      setCurrentActivityStartTime(Date.now());
      // NO resetear currentActivityPausedTime aquí - se resetea después de guardar
    }
  }, [currentActivity?.id, isPaused, isComplete]);

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

  // Sincronizar timeRemaining con ref para acceso en AppState
  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

  // Manejar cuando la app va a segundo plano y vuelve
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "background" || nextAppState === "inactive") {
          // App va a segundo plano
          console.log(
            "[AppState] Going to background, timeRemaining:",
            timeRemainingRef.current,
          );
          backgroundTimeRef.current = Date.now();
        } else if (nextAppState === "active" && backgroundTimeRef.current) {
          // App vuelve a primer plano
          const timeInBackground = Math.floor(
            (Date.now() - backgroundTimeRef.current) / 1000,
          );
          console.log(
            "[AppState] Returned to foreground, time in background:",
            timeInBackground,
            "seconds",
          );

          // Si hay un ejercicio activo por tiempo y no está pausado ni completo
          if (
            currentActivity?.exerciseType === "time" &&
            !isPaused &&
            !isComplete &&
            timeRemainingRef.current > 0
          ) {
            const newTimeRemaining = Math.max(
              0,
              timeRemainingRef.current - timeInBackground,
            );
            console.log(
              "[AppState] Updating timeRemaining from",
              timeRemainingRef.current,
              "to",
              newTimeRemaining,
            );
            setTimeRemaining(newTimeRemaining);

            // Si el tiempo se acabó mientras estaba en background
            if (newTimeRemaining === 0) {
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
    const totalActivities = routine.blocks.reduce(
      (sum, block) => sum + block.activities.length * block.repetitions,
      0,
    );

    // Contar actividades realmente completadas (no saltadas)
    const completedCount = executionTimeline.filter(
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
      executionTimeline, // Incluir la línea de tiempo de ejecución
    };

    await saveWorkout(workoutSession);
    setSavedWorkoutId(workoutId);
    return workoutId;
  }, [routine, startTime, saveWorkout, executionTimeline]);

  // Función para avanzar a la siguiente actividad
  const goToNextActivity = useCallback(async () => {
    // Haptic feedback al completar actividad
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Reproducir notificación
    await notificationService.playNotification();

    // Si estamos procesando pendientes
    if (isProcessingPending) {
      // Registrar actividad actual como completada
      if (currentActivity) {
        const completedActivity: ExecutedActivity = {
          activity: currentActivity,
          blockIndex: -1, // -1 para pendientes
          blockName: "Pendiente",
          blockRepetition: 0,
          status: "completed",
          startedAt: currentActivityStartTime,
          completedAt: Date.now(),
          wasPostponed: true,
          pausedTime:
            currentActivityPausedTime > 0
              ? currentActivityPausedTime
              : undefined,
        };
        setExecutionTimeline((prev) => {
          const updatedTimeline = [...prev, completedActivity];

          // Si es el último pendiente y estábamos en el último bloque/rep, completar la rutina
          if (isLastPendingActivity && isLastRepOfBlock && isLastBlock) {
            // Guardar con el timeline actualizado
            setTimeout(async () => {
              setIsComplete(true);
              await notificationService.playRoutineCompletion();
              // saveCompletedWorkout se llamará después con el timeline actualizado
            }, 0);
          }

          return updatedTimeline;
        });
      }

      // Resetear el tiempo de inicio y el tiempo pausado para la siguiente actividad
      setCurrentActivityStartTime(Date.now());
      setCurrentActivityPausedTime(0);

      if (isLastPendingActivity) {
        // Terminamos de procesar todos los pendientes
        setPendingActivities([]);
        setIsProcessingPending(false);
        setCurrentPendingIndex(0);

        // Verificar si estábamos en el último bloque y última rep
        // En ese caso, la rutina está completa
        if (isLastRepOfBlock && isLastBlock) {
          // La rutina se completará mediante el efecto del setExecutionTimeline
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
    // Registrar actividad actual como completada
    if (currentActivity) {
      const completedActivity: ExecutedActivity = {
        activity: currentActivity,
        blockIndex: currentBlockIndex,
        blockName: currentBlock?.name || `Bloque ${currentBlockIndex + 1}`,
        blockRepetition: currentBlockRep + 1,
        status: "completed",
        startedAt: currentActivityStartTime,
        completedAt: Date.now(),
        wasPostponed: false,
        pausedTime:
          currentActivityPausedTime > 0 ? currentActivityPausedTime : undefined,
      };
      setExecutionTimeline((prev) => {
        const updatedTimeline = [...prev, completedActivity];

        // Si es la última actividad de la rutina, completar
        if (
          isLastActivityInBlock &&
          isLastRepOfBlock &&
          isLastBlock &&
          pendingActivities.length === 0
        ) {
          setTimeout(async () => {
            setIsComplete(true);
            await notificationService.playRoutineCompletion();
          }, 0);
        }

        return updatedTimeline;
      });
    }

    // Resetear el tiempo de inicio y el tiempo pausado para la siguiente actividad
    setCurrentActivityStartTime(Date.now());
    setCurrentActivityPausedTime(0);

    if (isLastActivityInBlock && isLastRepOfBlock && isLastBlock) {
      // Verificar si hay pendientes antes de completar
      if (pendingActivities.length > 0) {
        setIsProcessingPending(true);
        setCurrentPendingIndex(0);
        return;
      }

      // La rutina se completará mediante el efecto del setExecutionTimeline
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
    currentActivity,
    currentBlock,
    currentBlockIndex,
    currentBlockRep,
    currentActivityIndex,
    currentActivityStartTime,
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
  const {
    isListening,
    startListening,
    stopListening,
    isAvailable: isVoiceAvailable,
  } = useVoiceRecognition(goToNextActivity);

  // Configurar temporizador para actividad actual
  useEffect(() => {
    if (!currentActivity || isPaused || isComplete) return;

    const isNewActivity = previousActivityIdRef.current !== currentActivity.id;

    if (currentActivity.exerciseType === "time" && currentActivity.duration) {
      // Solo resetear el tiempo si es una nueva actividad
      if (isNewActivity) {
        setTimeRemaining(currentActivity.duration);
        previousActivityIdRef.current = currentActivity.id;
      }

      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            goToNextActivity();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
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
        "Salir de la Rutina",
        "Si sales ahora, perderás todo el progreso de esta rutina. ¿Estás seguro que deseas salir?",
        [
          { text: "Continuar Rutina", style: "cancel" },
          {
            text: "Salir",
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
          "Salir de la Rutina",
          "Si sales ahora, perderás todo el progreso de esta rutina. ¿Estás seguro que deseas salir?",
          [
            { text: "Continuar Rutina", style: "cancel" },
            {
              text: "Salir",
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
    } else {
      // Reanudando: calcular el tiempo pausado
      if (pauseStartTime) {
        const pauseDuration = Math.floor((Date.now() - pauseStartTime) / 1000);
        setCurrentActivityPausedTime((prev) => prev + pauseDuration);
        setTotalPausedTime((prev) => prev + pauseDuration);
        setPauseStartTime(null);
      }
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
      "Salir de la Rutina",
      "Si sales ahora, perderás todo el progreso de esta rutina. ¿Estás seguro que deseas salir?",
      [
        { text: "Continuar Rutina", style: "cancel" },
        {
          text: "Salir",
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

  const handleSkipDefinitely = async () => {
    // Haptic feedback al saltar
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowSkipModal(false);

    // Avanzar sin usar goToNextActivity (que también registraría)
    await notificationService.playNotification();

    if (isProcessingPending) {
      // Registrar actividad como saltada
      if (currentActivity) {
        const skippedActivity: ExecutedActivity = {
          activity: currentActivity,
          blockIndex: -1,
          blockName: "Pendiente",
          blockRepetition: 0,
          status: "skipped",
          startedAt: currentActivityStartTime,
          completedAt: Date.now(),
          wasPostponed: true,
          pausedTime:
            currentActivityPausedTime > 0
              ? currentActivityPausedTime
              : undefined,
        };
        setExecutionTimeline((prev) => {
          const updatedTimeline = [...prev, skippedActivity];

          // Si es el último pendiente y estábamos en el último bloque/rep, completar la rutina
          if (isLastPendingActivity && isLastRepOfBlock && isLastBlock) {
            setTimeout(async () => {
              setIsComplete(true);
              await notificationService.playRoutineCompletion();
            }, 0);
          }

          return updatedTimeline;
        });
      }

      // Resetear el tiempo de inicio y el tiempo pausado para la siguiente actividad
      setCurrentActivityStartTime(Date.now());
      setCurrentActivityPausedTime(0);

      if (isLastPendingActivity) {
        setPendingActivities([]);
        setIsProcessingPending(false);
        setCurrentPendingIndex(0);
        if (isLastRepOfBlock && isLastBlock) {
          // La rutina se completará mediante el efecto del setExecutionTimeline
          return;
        }
        if (isLastRepOfBlock) {
          setCurrentBlockIndex(currentBlockIndex + 1);
          setCurrentBlockRep(0);
          setCurrentActivityIndex(0);
        } else {
          setCurrentBlockRep(currentBlockRep + 1);
          setCurrentActivityIndex(0);
        }
      } else {
        setCurrentPendingIndex(currentPendingIndex + 1);
      }
    } else {
      // Registrar actividad como saltada
      if (currentActivity) {
        const skippedActivity: ExecutedActivity = {
          activity: currentActivity,
          blockIndex: currentBlockIndex,
          blockName: currentBlock?.name || `Bloque ${currentBlockIndex + 1}`,
          blockRepetition: currentBlockRep + 1,
          status: "skipped",
          startedAt: currentActivityStartTime,
          completedAt: Date.now(),
          wasPostponed: false,
          pausedTime:
            currentActivityPausedTime > 0
              ? currentActivityPausedTime
              : undefined,
        };
        setExecutionTimeline((prev) => {
          const updatedTimeline = [...prev, skippedActivity];

          // Si es la última actividad de la rutina, completar
          if (
            isLastActivityInBlock &&
            isLastRepOfBlock &&
            isLastBlock &&
            pendingActivities.length === 0
          ) {
            setTimeout(async () => {
              setIsComplete(true);
              await notificationService.playRoutineCompletion();
            }, 0);
          }

          return updatedTimeline;
        });
      }

      // Resetear el tiempo de inicio y el tiempo pausado para la siguiente actividad
      setCurrentActivityStartTime(Date.now());
      setCurrentActivityPausedTime(0);

      if (isLastActivityInBlock && isLastRepOfBlock && isLastBlock) {
        if (pendingActivities.length > 0) {
          setIsProcessingPending(true);
          setCurrentPendingIndex(0);
        } else {
          // La rutina se completará mediante el efecto del setExecutionTimeline
        }
      } else if (isLastActivityInBlock) {
        if (pendingActivities.length > 0) {
          setIsProcessingPending(true);
          setCurrentPendingIndex(0);
        } else if (isLastRepOfBlock) {
          setCurrentBlockIndex(currentBlockIndex + 1);
          setCurrentBlockRep(0);
          setCurrentActivityIndex(0);
        } else {
          setCurrentBlockRep(currentBlockRep + 1);
          setCurrentActivityIndex(0);
        }
      } else {
        setCurrentActivityIndex(currentActivityIndex + 1);
      }
    }
  };

  const handleSkipPending = async () => {
    // Haptic feedback al postergar
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSkipModal(false);
    // Registrar actividad como postergada
    if (currentActivity) {
      const postponedActivity: ExecutedActivity = {
        activity: currentActivity,
        blockIndex: currentBlockIndex,
        blockName: currentBlock?.name || `Bloque ${currentBlockIndex + 1}`,
        blockRepetition: currentBlockRep + 1,
        status: "postponed",
        startedAt: currentActivityStartTime,
        postponedAt: Date.now(),
        wasPostponed: false,
        pausedTime:
          currentActivityPausedTime > 0 ? currentActivityPausedTime : undefined,
      };
      setExecutionTimeline((prev) => [...prev, postponedActivity]);
      setPendingActivities((prev) => [...prev, currentActivity]);
    }

    // Resetear el tiempo de inicio y el tiempo pausado para la siguiente actividad
    setCurrentActivityStartTime(Date.now());
    setCurrentActivityPausedTime(0);

    // Avanzar sin usar goToNextActivity
    await notificationService.playNotification();

    if (isLastActivityInBlock) {
      if (isLastRepOfBlock) {
        setCurrentBlockIndex(currentBlockIndex + 1);
        setCurrentBlockRep(0);
        setCurrentActivityIndex(0);
      } else {
        setCurrentBlockRep(currentBlockRep + 1);
        setCurrentActivityIndex(0);
      }
    } else {
      setCurrentActivityIndex(currentActivityIndex + 1);
    }
  };

  // Verificar si se puede dejar como pendiente (no último ejercicio de última rep del bloque)
  const canLeavePending = !(isLastActivityInBlock && isLastRepOfBlock);

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
          <Text style={styles.activityName}>¡Rutina Completada!</Text>

          {isNewBestTime && (
            <View style={styles.bestTimeBadge}>
              <Ionicons name="trophy" size={20} color={theme.colors.warning} />
              <Text style={styles.bestTimeLabel}>¡Nuevo Récord!</Text>
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
            Has terminado tu entrenamiento
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
              <Text style={styles.completionStatLabel}>Completados</Text>
            </View>
            {postponedCount > 0 && (
              <View style={styles.completionStatBox}>
                <Ionicons name="time" size={28} color={theme.colors.warning} />
                <Text style={styles.completionStatValue}>{postponedCount}</Text>
                <Text style={styles.completionStatLabel}>Postergados</Text>
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
                <Text style={styles.completionStatLabel}>Saltados</Text>
              </View>
            )}
          </View>

          {/* Botones */}
          <View style={styles.completionButtons}>
            {savedWorkoutId && (
              <Button
                title="Ver Detalle"
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
              title="Finalizar"
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
            <Text style={styles.activityName}>Cargando...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
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
                {pendingActivities.length} pendiente
                {pendingActivities.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={handleSkipPress} style={styles.skipButton}>
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
            {currentBlock.type === "rest-block"
              ? "Descanso entre Bloques"
              : currentBlock.type === "warmup"
              ? "Calentamiento"
              : currentBlock.type === "cooldown"
              ? "Elongación"
              : `Bloque ${currentBlockIndex + 1}/${routine.blocks.length}`}{" "}
            • Rep {currentBlockRep + 1}/{currentBlock.repetitions}
          </Text>
        </View>
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
            <Ionicons
              name="trophy-outline"
              size={16}
              color={theme.colors.warning}
            />
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
            <Ionicons
              name="return-down-back"
              size={20}
              color={theme.colors.warning}
            />
            <Text style={styles.pendingIndicatorText}>
              Ejercicio Pendiente ({currentPendingIndex + 1}/
              {pendingActivities.length})
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
            <Text style={styles.pauseTitle}>Rutina en Pausa</Text>
            {pauseStartTime && (
              <View style={styles.pauseTimeChip}>
                <Ionicons
                  name="timer-outline"
                  size={18}
                  color={theme.colors.warning}
                />
                <Text style={styles.pauseTimeText}>
                  Pausado:{" "}
                  {formatTime(currentActivityPausedTime + currentPauseDuration)}
                </Text>
              </View>
            )}
            <Text style={styles.pauseHint}>Presiona play para continuar</Text>
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
                <Text style={styles.voiceText}>🎤 Escuchando...</Text>
                <Text style={styles.voiceHint}>
                  Di "terminé", "listo", "siguiente" o "ya"
                </Text>
                <Text style={styles.voiceHintSmall}>
                  También: "hecho", "completo", "ok", "fin"
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
                  Toca el botón cuando termines las repeticiones
                </Text>
              </View>
            )}
          </>
        )}

        {/* Next Activity Preview - ANTES del botón para mejor visibilidad */}
        {(() => {
          // Determinar qué se viene después
          let label = "";
          let nextActivityName = "";

          if (isProcessingPending) {
            // Estamos procesando pendientes
            if (!isLastPendingActivity) {
              label = "Siguiente pendiente:";
              nextActivityName =
                pendingActivities[currentPendingIndex + 1]?.name || "";
            } else {
              // Después de los pendientes, volvemos al flujo normal
              if (isLastRepOfBlock) {
                label = "Próximo bloque:";
                const nextBlock = routine.blocks[currentBlockIndex + 1];
                nextActivityName = nextBlock?.activities[0]?.name || "";
              } else {
                label = "Repetir bloque:";
                nextActivityName = currentBlock.activities[0]?.name || "";
              }
            }
          } else {
            // Flujo normal
            if (!isLastActivityInBlock) {
              // Siguiente actividad en el mismo bloque
              label = "Siguiente:";
              nextActivityName =
                currentBlock.activities[currentActivityIndex + 1]?.name || "";
            } else if (isLastActivityInBlock && !isLastRepOfBlock) {
              // Repetir el bloque o procesar pendientes
              if (pendingActivities.length > 0) {
                label = "Ejercicios pendientes:";
                nextActivityName = pendingActivities[0]?.name || "";
              } else {
                label = "Repetir bloque:";
                nextActivityName = currentBlock.activities[0]?.name || "";
              }
            } else if (
              isLastActivityInBlock &&
              isLastRepOfBlock &&
              !isLastBlock
            ) {
              // Próximo bloque o procesar pendientes
              if (pendingActivities.length > 0) {
                label = "Ejercicios pendientes:";
                nextActivityName = pendingActivities[0]?.name || "";
              } else {
                label = "Próximo bloque:";
                const nextBlock = routine.blocks[currentBlockIndex + 1];
                nextActivityName = nextBlock?.activities[0]?.name || "";
              }
            } else {
              // Última actividad de la rutina (o pendientes si hay)
              if (pendingActivities.length > 0) {
                label = "Ejercicios pendientes:";
                nextActivityName = pendingActivities[0]?.name || "";
              } else {
                label = "¡Última actividad!";
                nextActivityName = "";
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
                <Ionicons
                  name="close-circle"
                  size={48}
                  color={theme.colors.error}
                />
                <Text style={styles.modalButtonTitle}>Saltar</Text>
                <Text style={styles.modalButtonSubtitle}>Definitivamente</Text>
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
  completeButton: {
    maxWidth: 300,
    marginTop: theme.spacing.lg,
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
});
