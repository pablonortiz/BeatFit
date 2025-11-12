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
import { Activity } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutDetail'>;

export default function WorkoutDetailScreen({ navigation, route }: Props) {
  const { workout } = route.params;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTimeOfDay = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const calculateActivityTime = (activity: Activity, totalDuration: number, totalActivities: number): number => {
    // Si tiene duración definida, usarla
    if (activity.exerciseType === 'time' && activity.duration) {
      return activity.duration;
    }
    // Para ejercicios por reps, estimar un tiempo promedio basado en la duración total
    return Math.floor(totalDuration / totalActivities);
  };

  // Calcular todas las actividades con su tiempo estimado
  const activitiesWithTime: Array<Activity & { blockIndex: number; blockName: string; rep: number; estimatedTime: number }> = [];

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

  const renderTimelineItem = (
    activity: Activity & { blockIndex: number; blockName: string; rep: number; estimatedTime: number },
    index: number
  ) => {
    const isRest = activity.type === 'rest';
    const isLastItem = index === activitiesWithTime.length - 1;

    return (
      <View key={`${activity.id}-${index}`} style={styles.timelineItemContainer}>
        <View style={styles.timelineItem}>
          {/* Icon Container */}
          <View style={[styles.timelineIcon, isRest && styles.timelineIconRest]}>
            <Ionicons
              name={activity.icon as any}
              size={32}
              color={isRest ? theme.colors.rest : theme.colors.exercise}
            />
          </View>

          {/* Activity Info */}
          <View style={styles.timelineContent}>
            <Text style={styles.activityName} numberOfLines={2}>
              {activity.name}
            </Text>
            <View style={styles.activityMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>
                  {activity.exerciseType === 'time' && activity.duration
                    ? formatTime(activity.duration)
                    : `~${formatTime(activity.estimatedTime)}`}
                </Text>
              </View>
              {activity.exerciseType === 'reps' && (
                <View style={styles.metaItem}>
                  <Ionicons name="repeat-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.metaText}>{activity.reps} reps</Text>
                </View>
              )}
            </View>
            <Text style={styles.blockInfo}>
              {activity.blockName} • Rep {activity.rep}
            </Text>
          </View>
        </View>

        {/* Connector Line */}
        {!isLastItem && <View style={styles.timelineConnector} />}
      </View>
    );
  };

  const completionRate = (workout.completedActivities / workout.totalActivities) * 100;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <Text style={styles.routineName}>{workout.routineName}</Text>
          <Text style={styles.dateText}>{formatDate(workout.completedAt)}</Text>
          <Text style={styles.timeText}>
            {formatTimeOfDay(workout.startedAt)} - {formatTimeOfDay(workout.completedAt)}
          </Text>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Ionicons name="time-outline" size={28} color={theme.colors.primary} />
              <Text style={styles.statValue}>{formatTimeLong(workout.duration)}</Text>
              <Text style={styles.statLabel}>Duración</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name="fitness-outline" size={28} color={theme.colors.accent} />
              <Text style={styles.statValue}>{workout.completedActivities}</Text>
              <Text style={styles.statLabel}>Ejercicios</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name="checkmark-circle-outline" size={28} color={theme.colors.success} />
              <Text style={styles.statValue}>{completionRate.toFixed(0)}%</Text>
              <Text style={styles.statLabel}>Completado</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${completionRate}%` }]} />
          </View>
        </Card>

        {/* Timeline Section */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>Línea de Tiempo</Text>
          <Text style={styles.sectionSubtitle}>
            {activitiesWithTime.length} actividades realizadas
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
          <Text style={styles.sectionTitle}>Resumen por Bloques</Text>
          {workout.blocks.map((block, index) => (
            <Card key={block.id} style={styles.blockCard}>
              <Text style={styles.blockName}>{block.name}</Text>
              <View style={styles.blockStats}>
                <View style={styles.blockStat}>
                  <Ionicons name="repeat-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.blockStatText}>{block.repetitions} repeticiones</Text>
                </View>
                <View style={styles.blockStat}>
                  <Ionicons name="list-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.blockStatText}>{block.activities.length} actividades</Text>
                </View>
              </View>
            </Card>
          ))}
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
  routineName: {
    ...theme.typography.h2,
    marginBottom: theme.spacing.xs,
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
  blockName: {
    ...theme.typography.h4,
    marginBottom: theme.spacing.sm,
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
});
