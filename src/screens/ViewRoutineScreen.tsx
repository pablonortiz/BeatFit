import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { Card } from '../components';
import { Ionicons } from '@expo/vector-icons';
import { formatTime, formatTimeLong, calculateRoutineDuration } from '../utils/helpers';
import { Block, Activity, BlockType } from '../types';
import { useTranslation } from 'react-i18next';

type Props = NativeStackScreenProps<RootStackParamList, 'ViewRoutine'>;

export default function ViewRoutineScreen({ navigation, route }: Props) {
  const { routine } = route.params;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Calcular estadísticas de la rutina
  const stats = useMemo(() => {
    const totalDuration = calculateRoutineDuration(routine.blocks);
    const totalActivities = routine.blocks.reduce(
      (sum, block) => sum + block.activities.length * block.repetitions,
      0
    );
    const totalExercises = routine.blocks.reduce(
      (sum, block) =>
        sum +
        block.activities.filter((a) => a.type === 'exercise').length *
          block.repetitions,
      0
    );
    const totalRests = routine.blocks.reduce(
      (sum, block) =>
        sum +
        block.activities.filter((a) => a.type === 'rest').length *
          block.repetitions,
      0
    );

    return {
      totalDuration,
      totalActivities,
      totalExercises,
      totalRests,
      totalBlocks: routine.blocks.length,
    };
  }, [routine]);

  const getBlockTypeLabel = (type?: BlockType): string => {
    switch (type) {
      case 'warmup':
        return t('createRoutine.warmup');
      case 'cooldown':
        return t('createRoutine.cooldown');
      case 'rest-block':
        return t('createRoutine.restBetweenBlocks');
      default:
        return t('createRoutine.exercise');
    }
  };

  const getBlockTypeColor = (type?: BlockType): string => {
    switch (type) {
      case 'warmup':
        return theme.colors.warning;
      case 'cooldown':
        return theme.colors.accent;
      case 'rest-block':
        return theme.colors.rest;
      default:
        return theme.colors.primary;
    }
  };

  const renderActivity = (activity: Activity, index: number) => {
    return (
      <View key={activity.id} style={styles.activityItem}>
        <View style={styles.activityIndexContainer}>
          <Text style={styles.activityIndex}>{index + 1}</Text>
        </View>

        <View
          style={[
            styles.activityIconContainer,
            {
              backgroundColor:
                activity.type === 'rest'
                  ? theme.colors.rest + '20'
                  : theme.colors.exercise + '20',
            },
          ]}
        >
          <Ionicons
            name={activity.icon as any}
            size={24}
            color={
              activity.type === 'rest'
                ? theme.colors.rest
                : theme.colors.exercise
            }
          />
        </View>

        <View style={styles.activityContent}>
          <Text style={styles.activityName}>{activity.name}</Text>
          <Text style={styles.activityDetail}>
            {activity.exerciseType === 'time'
              ? formatTime(activity.duration || 0)
              : `${activity.reps} reps`}
          </Text>
        </View>

        {activity.type === 'rest' && (
          <View style={styles.restBadge}>
            <Ionicons name="pause" size={12} color={theme.colors.rest} />
            <Text style={styles.restBadgeText}>Descanso</Text>
          </View>
        )}
      </View>
    );
  };

  const renderBlock = (block: Block, blockIndex: number) => {
    const blockColor = getBlockTypeColor(block.type);

    return (
      <Card key={block.id} style={styles.blockCard}>
        {/* Header del bloque */}
        <View style={styles.blockHeader}>
          <View style={styles.blockHeaderLeft}>
            <View
              style={[
                styles.blockTypeIndicator,
                { backgroundColor: blockColor },
              ]}
            />
            <View style={styles.blockHeaderInfo}>
              <Text style={styles.blockName}>{block.name}</Text>
              {block.type && block.type !== 'normal' && (
                <View
                  style={[
                    styles.blockTypeBadge,
                    { backgroundColor: blockColor + '20' },
                  ]}
                >
                  <Text style={[styles.blockTypeText, { color: blockColor }]}>
                    {getBlockTypeLabel(block.type)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {block.repetitions > 1 && (
            <View style={styles.repetitionsBadge}>
              <Ionicons
                name="repeat"
                size={16}
                color={theme.colors.primary}
              />
              <Text style={styles.repetitionsText}>x{block.repetitions}</Text>
            </View>
          )}
        </View>

        {/* Lista de actividades */}
        <View style={styles.activitiesContainer}>
          {block.activities.map((activity, index) =>
            renderActivity(activity, index)
          )}
        </View>

        {/* Footer del bloque con stats */}
        <View style={styles.blockFooter}>
          <View style={styles.blockStat}>
            <Ionicons
              name="fitness"
              size={14}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.blockStatText}>
              {block.activities.length}{' '}
              {block.activities.length === 1 ? 'actividad' : 'actividades'}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Card de información general */}
        <Card style={styles.statsCard}>
          <Text style={styles.routineName}>{routine.name}</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons
                  name="time-outline"
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.statLabel}>Duración estimada</Text>
              <Text style={styles.statValue}>
                {stats.totalDuration > 0
                  ? formatTimeLong(stats.totalDuration)
                  : 'Variable'}
              </Text>
            </View>

            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons
                  name="list"
                  size={24}
                  color={theme.colors.accent}
                />
              </View>
              <Text style={styles.statLabel}>Bloques</Text>
              <Text style={styles.statValue}>{stats.totalBlocks}</Text>
            </View>

            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons
                  name="barbell"
                  size={24}
                  color={theme.colors.exercise}
                />
              </View>
              <Text style={styles.statLabel}>Ejercicios</Text>
              <Text style={styles.statValue}>{stats.totalExercises}</Text>
            </View>

            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons
                  name="pause"
                  size={24}
                  color={theme.colors.rest}
                />
              </View>
              <Text style={styles.statLabel}>Descansos</Text>
              <Text style={styles.statValue}>{stats.totalRests}</Text>
            </View>
          </View>
        </Card>

        {/* Sección de bloques */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bloques de entrenamiento</Text>
          <Text style={styles.sectionSubtitle}>
            Secuencia de ejercicios de esta rutina
          </Text>
        </View>

        {routine.blocks.map((block, index) => renderBlock(block, index))}
      </ScrollView>

      {/* Botón flotante para iniciar rutina */}
      <View
        style={[
          styles.floatingButtonContainer,
          { bottom: insets.bottom + theme.spacing.md },
        ]}
      >
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => navigation.replace('ExecuteRoutine', { routine })}
        >
          <Ionicons name="play" size={28} color={theme.colors.white} />
          <Text style={styles.floatingButtonText}>Iniciar rutina</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
  },
  statsCard: {
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.xl,
  },
  routineName: {
    ...theme.typography.h1,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.backgroundCardLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  sectionHeader: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  blockCard: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  blockHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  blockTypeIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: theme.spacing.md,
  },
  blockHeaderInfo: {
    flex: 1,
  },
  blockName: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.xs,
  },
  blockTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  blockTypeText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  repetitionsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  repetitionsText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  activitiesContainer: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCardLight,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  activityIndexContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityIndex: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityName: {
    ...theme.typography.bodyBold,
    marginBottom: 2,
  },
  activityDetail: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  restBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    backgroundColor: theme.colors.rest + '20',
    borderRadius: theme.borderRadius.sm,
  },
  restBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.rest,
    fontSize: 10,
    fontWeight: '600',
  },
  blockFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
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
  floatingButtonContainer: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    elevation: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingButtonText: {
    ...theme.typography.h4,
    color: theme.colors.white,
    fontWeight: '700',
  },
});

