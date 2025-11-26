import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { theme } from '../theme';
import { Activity } from '../types';
import { formatTime } from '../utils/helpers';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const COLLAPSED_HEIGHT = 60;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.7;

// Interfaz extendida para actividades con metadata
interface SequencedActivity extends Activity {
  sequenceIndex: number;
  blockIndex: number;
  blockName: string;
  blockRepetition: number;
  isRestBetweenReps: boolean;
}

interface UpcomingActivitiesSheetProps {
  activitySequence: SequencedActivity[];
  currentSequenceIndex: number;
  isProcessingPending?: boolean;
  pendingActivities?: SequencedActivity[];
  currentPendingIndex?: number;
}

export function UpcomingActivitiesSheet({
  activitySequence,
  currentSequenceIndex,
  isProcessingPending = false,
  pendingActivities = [],
  currentPendingIndex = 0,
}: UpcomingActivitiesSheetProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  // Iniciar en estado colapsado (abajo)
  const translateY = useSharedValue(EXPANDED_HEIGHT - COLLAPSED_HEIGHT);
  const context = useSharedValue({ y: 0 });

  // Calcular todas las actividades desde la actual en adelante
  const upcomingActivities = useMemo(() => {
    const activities: Array<{
      activity: SequencedActivity;
      blockName: string;
      blockRepetition: number;
      isCurrent: boolean;
      isPending: boolean;
    }> = [];

    // Si estamos procesando pendientes, agregar los pendientes restantes
    if (isProcessingPending && pendingActivities.length > 0) {
      pendingActivities.forEach((activity, idx) => {
        if (idx >= currentPendingIndex) {
          activities.push({
            activity,
            blockName: 'Pendientes',
            blockRepetition: 0,
            isCurrent: idx === currentPendingIndex,
            isPending: true,
          });
        }
      });
    } else {
      // Agregar actividades desde la actual en adelante
      for (let i = currentSequenceIndex; i < activitySequence.length; i++) {
        const activity = activitySequence[i];
        activities.push({
          activity,
          blockName: activity.blockName,
          blockRepetition: activity.blockRepetition,
          isCurrent: i === currentSequenceIndex,
          isPending: false,
        });
      }
    }

    return activities;
  }, [
    activitySequence,
    currentSequenceIndex,
    isProcessingPending,
    pendingActivities,
    currentPendingIndex,
  ]);

  // Auto-scroll al ejercicio actual cuando se expande el sheet
  useEffect(() => {
    // Pequeño delay para asegurar que el sheet se expandió
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [currentSequenceIndex, isProcessingPending]);

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      const newValue = context.value.y + event.translationY;
      // Limitar el movimiento entre 0 (expandido hacia arriba) y max (colapsado abajo)
      const maxCollapsed = EXPANDED_HEIGHT - COLLAPSED_HEIGHT;
      if (newValue >= 0 && newValue <= maxCollapsed) {
        translateY.value = newValue;
      }
    })
    .onEnd((event) => {
      const threshold = (EXPANDED_HEIGHT - COLLAPSED_HEIGHT) / 2;
      const shouldExpand = event.velocityY < -500 || translateY.value < threshold;
      
      if (shouldExpand) {
        // Expandir (mover hacia arriba)
        translateY.value = withSpring(0, {
          damping: 30,
          stiffness: 180,
        });
      } else {
        // Colapsar (mover hacia abajo)
        translateY.value = withSpring(EXPANDED_HEIGHT - COLLAPSED_HEIGHT, {
          damping: 30,
          stiffness: 180,
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  // Estilo para ocultar contenido cuando está colapsado
  const contentOpacityStyle = useAnimatedStyle(() => {
    const maxCollapsed = EXPANDED_HEIGHT - COLLAPSED_HEIGHT;
    const isCollapsed = translateY.value > maxCollapsed / 2;
    return {
      opacity: isCollapsed ? 0 : 1,
    };
  });

  const chevronStyle = useAnimatedStyle(() => {
    const maxCollapsed = EXPANDED_HEIGHT - COLLAPSED_HEIGHT;
    const rotation = translateY.value > maxCollapsed / 2 ? 0 : 180;
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const toggleSheet = () => {
    const maxCollapsed = EXPANDED_HEIGHT - COLLAPSED_HEIGHT;
    const isCollapsed = translateY.value > maxCollapsed / 2;

    translateY.value = withSpring(
      isCollapsed ? 0 : maxCollapsed,
      {
        damping: 30,
        stiffness: 180,
      }
    );
  };

  const renderActivity = (
    item: {
      activity: SequencedActivity;
      blockName: string;
      blockRepetition: number;
      isCurrent: boolean;
      isPending: boolean;
    },
    index: number
  ) => {
    const isRest = item.activity.type === 'rest';
    const isRestBetweenReps = item.activity.isRestBetweenReps;
    const iconColor = isRest ? theme.colors.rest : theme.colors.exercise;

    return (
      <View
        key={`${item.blockName}-${item.blockRepetition}-${item.activity.id}-${index}`}
        style={[
          styles.activityItem,
          item.isCurrent && styles.activityItemCurrent,
          item.isPending && styles.activityItemPending,
        ]}
      >
        <View style={styles.activityLeft}>
          <View style={styles.activityIndex}>
            {item.isCurrent ? (
              <Ionicons name="play" size={14} color={theme.colors.primary} />
            ) : (
              <Text style={styles.activityIndexText}>{index + 1}</Text>
            )}
          </View>

          <View
            style={[
              styles.activityIconContainer,
              { backgroundColor: iconColor + '20' },
            ]}
          >
            <Ionicons name={item.activity.icon as any} size={20} color={iconColor} />
          </View>

          <View style={styles.activityInfo}>
            <Text
              style={[
                styles.activityName,
                item.isCurrent && styles.activityNameCurrent,
              ]}
              numberOfLines={1}
            >
              {item.activity.name}
            </Text>
            <View style={styles.activityMeta}>
              <Text style={styles.activityMetaText}>
                {isRestBetweenReps ? 'Descanso entre reps' : item.blockName}
                {item.blockRepetition > 0 && !isRestBetweenReps && ` (Rep ${item.blockRepetition})`}
              </Text>
              {item.isPending && (
                <View style={styles.pendingTag}>
                  <Text style={styles.pendingTagText}>Pendiente</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.activityRight}>
          <Text
            style={[
              styles.activityDuration,
              item.isCurrent && styles.activityDurationCurrent,
            ]}
          >
            {item.activity.exerciseType === 'time'
              ? formatTime(item.activity.duration || 0)
              : `${item.activity.reps} reps`}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Animated.View style={[styles.container, { bottom: insets.bottom }, animatedStyle]}>
      {/* Handle - Con gesto para arrastrar */}
      <GestureDetector gesture={gesture}>
        <TouchableOpacity
          style={styles.handleContainer}
          onPress={toggleSheet}
          activeOpacity={0.8}
        >
          <View style={styles.handle} />
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Ionicons
                name="list-outline"
                size={20}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.headerTitle}>
                Próximos ejercicios ({upcomingActivities.length})
              </Text>
            </View>
            <Animated.View style={chevronStyle}>
              <Ionicons
                name="chevron-up"
                size={20}
                color={theme.colors.textSecondary}
              />
            </Animated.View>
          </View>
        </TouchableOpacity>
      </GestureDetector>

      {/* Content - Sin gesto, permite scroll libremente */}
      <Animated.View style={[{ flex: 1 }, contentOpacityStyle]}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom }]}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          {upcomingActivities.map((item, index) => renderActivity(item, index))}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: EXPANDED_HEIGHT,
    backgroundColor: theme.colors.backgroundCard,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 20,
    overflow: 'hidden', // Ocultar contenido fuera del contenedor
  },
  handleContainer: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: theme.spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activityItemCurrent: {
    backgroundColor: theme.colors.primary + '15',
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  activityItemPending: {
    backgroundColor: theme.colors.warning + '10',
    borderColor: theme.colors.warning + '50',
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  activityIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityIndexText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    ...theme.typography.body,
    marginBottom: 2,
  },
  activityNameCurrent: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  activityMetaText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  pendingTag: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    backgroundColor: theme.colors.warning + '20',
    borderRadius: theme.borderRadius.sm,
  },
  pendingTagText: {
    ...theme.typography.caption,
    fontSize: 10,
    color: theme.colors.warning,
    fontWeight: '600',
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  activityDuration: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
  },
  activityDurationCurrent: {
    color: theme.colors.primary,
    fontSize: 16,
  },
});

