import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { Card } from '../components';
import { useWorkoutHistory } from '../hooks/useStorage';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeLong } from '../utils/helpers';
import { WorkoutSession } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutHistory'>;

export default function WorkoutHistoryScreen({ navigation }: Props) {
  const { history, loading, deleteWorkout, refresh } = useWorkoutHistory();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleDeleteWorkout = (workout: WorkoutSession) => {
    Alert.alert(
      'Eliminar Entrenamiento',
      `¿Estás seguro que deseas eliminar este entrenamiento?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteWorkout(workout.id),
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Hoy a las ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Ayer a las ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  };

  const renderWorkoutItem = ({ item }: { item: WorkoutSession }) => {
    const completionRate = (item.completedActivities / item.totalActivities) * 100;

    return (
      <Card style={styles.workoutCard}>
        <View style={styles.workoutHeader}>
          <View style={styles.workoutInfo}>
            <Text style={styles.routineName}>{item.routineName}</Text>
            <Text style={styles.dateText}>{formatDate(item.completedAt)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteWorkout(item)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.statValue}>{formatTimeLong(item.duration)}</Text>
            <Text style={styles.statLabel}>Duración</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
            <Text style={styles.statValue}>{item.completedActivities}</Text>
            <Text style={styles.statLabel}>Ejercicios</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="bar-chart" size={20} color={theme.colors.info} />
            <Text style={styles.statValue}>{completionRate.toFixed(0)}%</Text>
            <Text style={styles.statLabel}>Completado</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${completionRate}%` },
            ]}
          />
        </View>
      </Card>
    );
  };

  const renderListHeader = () => {
    if (history.length === 0) return null;

    return (
      <View style={styles.headerStats}>
        <Text style={styles.headerTitle}>
          {history.length} {history.length === 1 ? 'Entrenamiento' : 'Entrenamientos'}
        </Text>
      </View>
    );
  };

  if (!loading && history.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={80} color={theme.colors.textTertiary} />
        <Text style={styles.emptyTitle}>No hay entrenamientos</Text>
        <Text style={styles.emptyText}>
          Completa tu primera rutina para ver tu historial
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        renderItem={renderWorkoutItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + theme.spacing.lg }]}
        ListHeaderComponent={renderListHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    padding: theme.spacing.lg,
  },
  headerStats: {
    marginBottom: theme.spacing.lg,
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.textSecondary,
  },
  workoutCard: {
    marginBottom: theme.spacing.md,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  workoutInfo: {
    flex: 1,
  },
  routineName: {
    ...theme.typography.h4,
    marginBottom: theme.spacing.xs,
  },
  dateText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  deleteButton: {
    padding: theme.spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.md,
  },
  statItem: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statValue: {
    ...theme.typography.h4,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.backgroundCardLight,
    borderRadius: theme.borderRadius.round,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.round,
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
