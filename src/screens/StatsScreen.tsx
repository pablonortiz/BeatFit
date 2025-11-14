import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { Card } from '../components';
import { useWorkoutStats } from '../hooks/useStorage';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeLong } from '../utils/helpers';
import { useTranslation } from 'react-i18next';

type Props = NativeStackScreenProps<RootStackParamList, 'Stats'>;

export default function StatsScreen({ navigation }: Props) {
  const { stats, loading } = useWorkoutStats();
  const [refreshing, setRefreshing] = React.useState(false);
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const handleRefresh = () => {
    setRefreshing(true);
    // El hook se actualizará automáticamente
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatNumber = (num: number) => {
    const locale = i18n.language === 'en' ? 'en-US' : i18n.language === 'pt' ? 'pt-BR' : 'es-ES';
    return num.toLocaleString(locale);
  };

  if (!loading && stats.totalWorkouts === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="stats-chart-outline" size={80} color={theme.colors.textTertiary} />
        <Text style={styles.emptyTitle}>{t('stats.noStats')}</Text>
        <Text style={styles.emptyText}>
          {t('stats.noStatsDescription')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.spacing.xxl }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* Rachas */}
      <View style={styles.streakContainer}>
        <Card style={styles.streakCard}>
          <Ionicons name="flame" size={48} color={theme.colors.primary} />
          <Text style={styles.streakValue}>{stats.currentStreak}</Text>
          <Text style={styles.streakLabel}>{t('stats.currentStreak')}</Text>
          <Text style={styles.streakSubLabel}>{t('stats.consecutiveDays')}</Text>
        </Card>
        <Card style={styles.streakCard}>
          <Ionicons name="trophy" size={48} color={theme.colors.accent} />
          <Text style={styles.streakValue}>{stats.longestStreak}</Text>
          <Text style={styles.streakLabel}>{t('stats.bestStreak')}</Text>
          <Text style={styles.streakSubLabel}>{t('stats.consecutiveDays')}</Text>
        </Card>
      </View>

      {/* Resumen General */}
      <Text style={styles.sectionTitle}>{t('stats.generalSummary')}</Text>
      <Card style={styles.statsCard}>
        <View style={styles.statsGrid}>
          <View style={styles.statBigItem}>
            <Ionicons name="fitness" size={32} color={theme.colors.primary} />
            <Text style={styles.statBigValue}>{formatNumber(stats.totalWorkouts)}</Text>
            <Text style={styles.statBigLabel}>{t('stats.workouts')}</Text>
          </View>

          <View style={styles.statBigItem}>
            <Ionicons name="time" size={32} color={theme.colors.secondary} />
            <Text style={styles.statBigValue}>{formatTimeLong(stats.totalTime)}</Text>
            <Text style={styles.statBigLabel}>{t('stats.totalTime')}</Text>
          </View>

          <View style={styles.statBigItem}>
            <Ionicons name="barbell" size={32} color={theme.colors.accent} />
            <Text style={styles.statBigValue}>{formatNumber(stats.totalActivities)}</Text>
            <Text style={styles.statBigLabel}>{t('stats.exercises')}</Text>
          </View>

          <View style={styles.statBigItem}>
            <Ionicons name="speedometer" size={32} color={theme.colors.info} />
            <Text style={styles.statBigValue}>
              {formatTimeLong(Math.round(stats.averageWorkoutDuration))}
            </Text>
            <Text style={styles.statBigLabel}>{t('stats.average')}</Text>
          </View>
        </View>
      </Card>

      {/* Actividad Reciente */}
      <Text style={styles.sectionTitle}>{t('stats.recentActivity')}</Text>
      <View style={styles.activityRow}>
        <Card style={styles.activityCard}>
          <View style={styles.activityHeader}>
            <Ionicons name="calendar" size={24} color={theme.colors.primary} />
            <Text style={styles.activityValue}>{stats.workoutsByWeek}</Text>
          </View>
          <Text style={styles.activityLabel}>{t('stats.thisWeek')}</Text>
        </Card>

        <Card style={styles.activityCard}>
          <View style={styles.activityHeader}>
            <Ionicons name="calendar-outline" size={24} color={theme.colors.accent} />
            <Text style={styles.activityValue}>{stats.workoutsByMonth}</Text>
          </View>
          <Text style={styles.activityLabel}>{t('stats.thisMonth')}</Text>
        </Card>
      </View>

      {/* Rutina Favorita */}
      {stats.favoriteRoutine && (
        <>
          <Text style={styles.sectionTitle}>{t('stats.favoriteRoutine')}</Text>
          <Card style={styles.favoriteCard}>
            <View style={styles.favoriteHeader}>
              <Ionicons name="heart" size={32} color={theme.colors.error} />
              <View style={styles.favoriteInfo}>
                <Text style={styles.favoriteName}>{stats.favoriteRoutine.routineName}</Text>
                <Text style={styles.favoriteCount}>
                  {t('stats.completedTimes', { count: stats.favoriteRoutine.count })}
                </Text>
              </View>
            </View>
          </Card>
        </>
      )}

      {/* Ejercicios Más Usados */}
      {stats.mostUsedExercises.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('stats.mostUsedExercises')}</Text>
          <Card style={styles.exercisesCard}>
            {stats.mostUsedExercises.map((exercise, index) => (
              <View key={index} style={styles.exerciseItem}>
                <View style={styles.exerciseRank}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>
                <Ionicons
                  name={exercise.icon as any}
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseCount}>{exercise.count}x</Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* Última Actualización */}
      {stats.lastWorkoutDate && (
        <Text style={styles.lastUpdate}>
          {t('stats.lastUpdate')}:{' '}
          {new Date(stats.lastWorkoutDate).toLocaleDateString(
            i18n.language === 'en' ? 'en-US' : i18n.language === 'pt' ? 'pt-BR' : 'es-ES',
            {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            }
          )}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  streakContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  streakCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  streakValue: {
    ...theme.typography.h1,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  streakLabel: {
    ...theme.typography.bodyBold,
  },
  streakSubLabel: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  sectionTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  statsCard: {
    marginBottom: theme.spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.lg,
  },
  statBigItem: {
    width: '45%',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  statBigValue: {
    ...theme.typography.h3,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  statBigLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  activityRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  activityCard: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  activityValue: {
    ...theme.typography.h2,
  },
  activityLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  favoriteCard: {
    marginBottom: theme.spacing.lg,
  },
  favoriteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  favoriteInfo: {
    flex: 1,
  },
  favoriteName: {
    ...theme.typography.h4,
    marginBottom: theme.spacing.xs,
  },
  favoriteCount: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  exercisesCard: {
    marginBottom: theme.spacing.lg,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  exerciseRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    ...theme.typography.bodyBold,
    color: theme.colors.white,
  },
  exerciseName: {
    ...theme.typography.body,
    flex: 1,
  },
  exerciseCount: {
    ...theme.typography.bodyBold,
    color: theme.colors.accent,
  },
  lastUpdate: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  emptyTitle: {
    ...theme.typography.h2,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
