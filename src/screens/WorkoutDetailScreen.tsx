import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { Card } from '../components';
import { Ionicons } from '@expo/vector-icons';
import { formatTime, formatTimeLong } from '../utils/helpers';
import { Activity, ExecutedActivity } from '../types';
import { useWorkoutHistory } from '../hooks/useStorage';
import { isBestTime } from '../utils/stats';
import { useTranslation } from 'react-i18next';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutDetail'>;

export default function WorkoutDetailScreen({ navigation, route }: Props) {
  const { workout } = route.params;
  const { history } = useWorkoutHistory();
  const isPersonalBest = isBestTime(workout, history);
  const { t, i18n } = useTranslation();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const locale = i18n.language === 'en' ? 'en-US' : i18n.language === 'pt' ? 'pt-BR' : 'es-ES';
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTimeOfDay = (timestamp: number) => {
    const date = new Date(timestamp);
    const locale = i18n.language === 'en' ? 'en-US' : i18n.language === 'pt' ? 'pt-BR' : 'es-ES';
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  const calculateActivityTime = (activity: Activity, totalDuration: number, totalActivities: number): number => {
    // Si tiene duración definida, usarla
    if (activity.exerciseType === 'time' && activity.duration) {
      return activity.duration;
    }
    // Para ejercicios por reps, estimar un tiempo promedio basado en la duración total
    return Math.floor(totalDuration / totalActivities);
  };

  // Usar executionTimeline si está disponible, de lo contrario generar la lista tradicional
  const activitiesWithTime: Array<Activity & {
    blockIndex: number;
    blockName: string;
    rep: number;
    estimatedTime: number;
    status?: 'completed' | 'skipped' | 'postponed';
    wasPostponed?: boolean;
    postponedAt?: number;
    actualStartedAt?: number;
    actualCompletedAt?: number;
    pausedTime?: number;
    substitutedWith?: {
      name: string;
      icon: string;
      originalName: string;
    };
  }> = [];

  if (workout.executionTimeline && workout.executionTimeline.length > 0) {
    // Usar la línea de tiempo real
    workout.executionTimeline.forEach((executed: ExecutedActivity) => {
      const duration = executed.completedAt && executed.startedAt
        ? Math.floor((executed.completedAt - executed.startedAt) / 1000)
        : calculateActivityTime(executed.activity, workout.duration, workout.totalActivities);

      activitiesWithTime.push({
        ...executed.activity,
        blockIndex: executed.blockIndex,
        blockName: executed.blockName,
        rep: executed.blockRepetition,
        estimatedTime: duration,
        status: executed.status,
        wasPostponed: executed.wasPostponed,
        postponedAt: executed.postponedAt,
        actualStartedAt: executed.startedAt,
        actualCompletedAt: executed.completedAt,
        pausedTime: executed.pausedTime,
        substitutedWith: executed.substitutedWith,
      });
    });
  } else {
    // Generar la lista tradicional
    workout.blocks.forEach((block, blockIndex) => {
      for (let rep = 0; rep < block.repetitions; rep++) {
        block.activities.forEach((activity) => {
          const estimatedTime = calculateActivityTime(activity, workout.duration, workout.totalActivities);
          activitiesWithTime.push({
            ...activity,
            blockIndex,
            blockName: block.name,
            rep: rep + 1,
            estimatedTime,
          });
        });
      }
    });
  }

  const renderTimelineItem = (
    activity: Activity & {
      blockIndex: number;
      blockName: string;
      rep: number;
      estimatedTime: number;
      status?: 'completed' | 'skipped' | 'postponed';
      wasPostponed?: boolean;
      postponedAt?: number;
      actualStartedAt?: number;
      actualCompletedAt?: number;
      pausedTime?: number;
      substitutedWith?: {
        name: string;
        icon: string;
        originalName: string;
      };
    },
    index: number
  ) => {
    const isRest = activity.type === 'rest';
    const isLastItem = index === activitiesWithTime.length - 1;
    const isSkipped = activity.status === 'skipped';
    const wasPostponedLater = activity.status === 'postponed';
    const wasPostponedBefore = activity.wasPostponed;
    const wasSubstituted = !!activity.substitutedWith;

    // Determinar color del icono basado en estado
    let iconColor = isRest ? theme.colors.rest : theme.colors.exercise;
    let iconBgColor = isRest ? theme.colors.rest + '20' : theme.colors.exercise + '20';
    let iconBorderColor = isRest ? theme.colors.rest : theme.colors.exercise;

    if (isSkipped) {
      iconColor = theme.colors.error;
      iconBgColor = theme.colors.error + '20';
      iconBorderColor = theme.colors.error;
    } else if (wasPostponedLater) {
      iconColor = theme.colors.warning;
      iconBgColor = theme.colors.warning + '20';
      iconBorderColor = theme.colors.warning;
    }

    // Display name and icon - use substitute info if available
    const displayName = wasSubstituted ? activity.substitutedWith!.name : activity.name;
    const displayIcon = wasSubstituted ? activity.substitutedWith!.icon : activity.icon;

    return (
      <View key={`${activity.id}-${index}`} style={styles.timelineItemContainer}>
        <View style={styles.timelineItem}>
          {/* Icon Container */}
          <View style={[styles.timelineIcon, { backgroundColor: iconBgColor, borderColor: iconBorderColor }]}>
            <Ionicons
              name={displayIcon as any}
              size={32}
              color={iconColor}
            />
            {isSkipped && (
              <View style={styles.statusBadge}>
                <Ionicons name="close-circle" size={16} color={theme.colors.error} />
              </View>
            )}
            {wasPostponedBefore && (
              <View style={[styles.statusBadge, { backgroundColor: theme.colors.warning }]}>
                <Ionicons name="return-down-back" size={14} color="white" />
              </View>
            )}
            {wasSubstituted && (
              <View style={[styles.statusBadge, { backgroundColor: theme.colors.accent }]}>
                <Ionicons name="swap-horizontal" size={14} color="white" />
              </View>
            )}
          </View>

          {/* Activity Info */}
          <View style={styles.timelineContent}>
            <Text style={[styles.activityName, isSkipped && styles.activityNameSkipped]} numberOfLines={2}>
              {displayName}
            </Text>
            <View style={styles.activityMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>
                  {activity.exerciseType === 'time' && activity.duration
                    ? formatTime(activity.duration)
                    : formatTime(activity.estimatedTime)}
                </Text>
              </View>
              {activity.exerciseType === 'reps' && (
                <View style={styles.metaItem}>
                  <Ionicons name="repeat-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.metaText}>{activity.reps} {t("exercises.reps").toLowerCase()}</Text>
                </View>
              )}
            </View>
            
            {/* Pause indicator - prominente y separado */}
            {activity.pausedTime && activity.pausedTime > 0 && (
              <View style={styles.pausedIndicatorBox}>
                <Ionicons name="pause-circle" size={16} color={theme.colors.warning} />
                <Text style={styles.pausedIndicatorText}>
                  {t("workoutDetail.pausedTime", { time: formatTime(activity.pausedTime) })}
                </Text>
              </View>
            )}
            
            <Text style={styles.blockInfo}>
              {activity.blockName} • {t("executeRoutine.repLabel")} {activity.rep}
            </Text>
            {isSkipped && (
              <Text style={styles.statusLabel}>{t("workoutDetail.skipped")}</Text>
            )}
            {wasPostponedLater && (
              <Text style={[styles.statusLabel, { color: theme.colors.warning }]}>{t("workoutDetail.postponed")}</Text>
            )}
            {wasPostponedBefore && (
              <Text style={[styles.statusLabel, { color: theme.colors.warning }]}>{t("workoutDetail.completedLater")}</Text>
            )}
            {wasSubstituted && (
              <View style={styles.substituteIndicator}>
                <Ionicons name="swap-horizontal" size={12} color={theme.colors.accent} />
                <Text style={styles.substituteText}>
                  {t("workoutDetail.substitutedFrom", { original: activity.substitutedWith!.originalName })}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Connector Line */}
        {!isLastItem && <View style={styles.timelineConnector} />}
      </View>
    );
  };

  const completionRate = (workout.completedActivities / workout.totalActivities) * 100;

  // Calcular tiempo total en pausa
  const totalPausedTime = activitiesWithTime.reduce((sum, activity) => {
    return sum + (activity.pausedTime || 0);
  }, 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.titleRow}>
            <Text style={styles.routineName}>{workout.routineName}</Text>
            {isPersonalBest && (
              <View style={styles.bestTimeBadge}>
                <Ionicons name="trophy" size={20} color={theme.colors.warning} />
                <Text style={styles.bestTimeLabel}>{t("workoutDetail.bestTime")}</Text>
              </View>
            )}
          </View>
          <Text style={styles.dateText}>{formatDate(workout.completedAt)}</Text>
          <Text style={styles.timeText}>
            {formatTimeOfDay(workout.startedAt)} - {formatTimeOfDay(workout.completedAt)}
          </Text>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Ionicons name="time-outline" size={28} color={theme.colors.primary} />
              <Text style={styles.statValue}>{formatTimeLong(workout.duration)}</Text>
              <Text style={styles.statLabel}>{t("workoutDetail.duration")}</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name="fitness-outline" size={28} color={theme.colors.accent} />
              <Text style={styles.statValue}>{workout.completedActivities}</Text>
              <Text style={styles.statLabel}>{t("workoutDetail.exercises")}</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name="checkmark-circle-outline" size={28} color={theme.colors.success} />
              <Text style={styles.statValue}>{completionRate.toFixed(0)}%</Text>
              <Text style={styles.statLabel}>{t("workoutDetail.completion")}</Text>
            </View>
          </View>

          {/* Pause Time Stat - Only show if there was pause time */}
          {totalPausedTime > 0 && (
            <View style={styles.pauseStatContainer}>
              <View style={styles.pauseStatContent}>
                <Ionicons name="pause-circle" size={24} color={theme.colors.warning} />
                <View style={styles.pauseStatText}>
                  <Text style={styles.pauseStatValue}>{formatTimeLong(totalPausedTime)}</Text>
                  <Text style={styles.pauseStatLabel}>{t("workoutDetail.totalPaused")}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${completionRate}%` }]} />
          </View>
        </Card>

        {/* Timeline Section */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>{t("workoutDetail.timeline")}</Text>
          <Text style={styles.sectionSubtitle}>
            {t("workoutDetail.activitiesCompleted", { count: activitiesWithTime.length })}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timelineScroll}
          >
            {activitiesWithTime.map((activity, index) => renderTimelineItem(activity, index))}
          </ScrollView>
        </View>

        {/* Blocks Summary */}
        <View style={styles.blocksSection}>
          <Text style={styles.sectionTitle}>{t("workoutDetail.blocksSummary")}</Text>
          {workout.blocks.map((block, index) => {
            const isSpecialBlock = block.type === 'warmup' || block.type === 'cooldown' || block.type === 'rest-block';
            const blockColor = 
              block.type === 'warmup' 
                ? theme.colors.info 
                : block.type === 'cooldown' 
                ? theme.colors.success 
                : block.type === 'rest-block'
                ? theme.colors.rest
                : undefined;
            
            const blockIcon = 
              block.type === 'warmup' 
                ? 'flame' 
                : block.type === 'cooldown' 
                ? 'leaf' 
                : 'pause-circle'; // rest-block
            
            return (
              <Card 
                key={block.id} 
                style={[
                  styles.blockCard,
                  isSpecialBlock && { borderLeftWidth: 4, borderLeftColor: blockColor },
                ]}
              >
                <View style={styles.blockHeader}>
                  {isSpecialBlock && (
                    <Ionicons 
                      name={blockIcon as any} 
                      size={20} 
                      color={blockColor}
                      style={{ marginRight: theme.spacing.sm }}
                    />
                  )}
                  <Text style={[
                    styles.blockName,
                    isSpecialBlock && { color: blockColor, fontWeight: '600' },
                  ]}>
                    {block.name}
                  </Text>
                </View>
                <View style={styles.blockStats}>
                  <View style={styles.blockStat}>
                    <Ionicons name="repeat-outline" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.blockStatText}>{t("workoutDetail.repetitions", { count: block.repetitions })}</Text>
                  </View>
                  <View style={styles.blockStat}>
                    <Ionicons name="list-outline" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.blockStatText}>{t("workoutDetail.activities", { count: block.activities.length })}</Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerCard: {
    margin: theme.spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  routineName: {
    ...theme.typography.h2,
  },
  bestTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.warning + '20',
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.warning,
  },
  bestTimeLabel: {
    ...theme.typography.bodyBold,
    color: theme.colors.warning,
    fontSize: 14,
  },
  dateText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
    marginBottom: theme.spacing.xs,
  },
  timeText: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.lg,
  },
  statBox: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statValue: {
    ...theme.typography.h3,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.backgroundCardLight,
    borderRadius: theme.borderRadius.round,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.round,
  },
  timelineSection: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.h3,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  timelineScroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  timelineItemContainer: {
    marginRight: theme.spacing.md,
  },
  timelineItem: {
    alignItems: 'center',
    width: 160,
  },
  timelineIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.exercise + '20',
    borderWidth: 3,
    borderColor: theme.colors.exercise,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  timelineIconRest: {
    backgroundColor: theme.colors.rest + '20',
    borderColor: theme.colors.rest,
  },
  timelineContent: {
    alignItems: 'center',
  },
  activityName: {
    ...theme.typography.bodyBold,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
    minHeight: 40,
  },
  activityMeta: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  pausedMeta: {
    backgroundColor: theme.colors.warning + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  pausedIndicatorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.warning + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.warning + '40',
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  pausedIndicatorText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    fontWeight: '600',
    fontSize: 12,
  },
  pauseStatContainer: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.warning + '15',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.warning + '30',
  },
  pauseStatContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  pauseStatText: {
    flex: 1,
  },
  pauseStatValue: {
    ...theme.typography.h3,
    color: theme.colors.warning,
    fontWeight: '700',
  },
  pauseStatLabel: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    marginTop: 2,
  },
  blockInfo: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    fontSize: 11,
    textAlign: 'center',
  },
  timelineConnector: {
    position: 'absolute',
    top: 32,
    right: -theme.spacing.md,
    width: theme.spacing.md,
    height: 2,
    backgroundColor: theme.colors.border,
  },
  blocksSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  blockCard: {
    marginBottom: theme.spacing.md,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  blockName: {
    ...theme.typography.h4,
  },
  blockStats: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  blockStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  blockStatText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  activityNameSkipped: {
    opacity: 0.5,
    textDecorationLine: 'line-through',
  },
  statusLabel: {
    ...theme.typography.caption,
    color: theme.colors.error,
    fontSize: 11,
    marginTop: theme.spacing.xs,
    fontWeight: '600',
  },
  substituteIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    backgroundColor: theme.colors.accent + '20',
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'center',
  },
  substituteText: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: '600',
  },
});
