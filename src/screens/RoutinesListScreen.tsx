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
import { Card, Button } from '../components';
import { useRoutines } from '../hooks/useStorage';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeLong, calculateRoutineDuration } from '../utils/helpers';
import { Routine } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'RoutinesList'>;

export default function RoutinesListScreen({ navigation }: Props) {
  const { routines, loading, deleteRoutine, refresh } = useRoutines();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleDeleteRoutine = (routine: Routine) => {
    Alert.alert(
      'Eliminar Rutina',
      `¿Estás seguro que deseas eliminar "${routine.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteRoutine(routine.id),
        },
      ]
    );
  };

  const handleStartRoutine = (routine: Routine) => {
    navigation.navigate('ExecuteRoutine', { routine, mode: 'full' });
  };

  const handleEditRoutine = (routine: Routine) => {
    navigation.navigate('CreateRoutine', { mode: 'full', routine });
  };

  const renderRoutineItem = ({ item }: { item: Routine }) => {
    const totalDuration = calculateRoutineDuration(item.blocks);
    const totalActivities = item.blocks.reduce(
      (sum, block) => sum + block.activities.length * block.repetitions,
      0
    );

    return (
      <Card style={styles.routineCard}>
        <View style={styles.routineHeader}>
          <View style={styles.routineInfo}>
            <Text style={styles.routineName}>{item.name}</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.statText}>
                  {totalDuration > 0 ? formatTimeLong(totalDuration) : 'Variable'}
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="list" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.statText}>{item.blocks.length} bloques</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="fitness" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.statText}>{totalActivities} ejercicios</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteRoutine(item)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <Button
            title="Editar"
            onPress={() => handleEditRoutine(item)}
            variant="outline"
            size="small"
            style={styles.actionButton}
          />
          <Button
            title="Comenzar"
            onPress={() => handleStartRoutine(item)}
            variant="primary"
            size="small"
            style={styles.actionButton}
          />
        </View>
      </Card>
    );
  };

  if (!loading && routines.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="folder-open-outline" size={80} color={theme.colors.textTertiary} />
        <Text style={styles.emptyTitle}>No hay rutinas guardadas</Text>
        <Text style={styles.emptyText}>
          Crea tu primera rutina para comenzar a entrenar
        </Text>
        <Button
          title="Crear Rutina"
          onPress={() => navigation.navigate('CreateRoutine', { mode: 'full' })}
          style={styles.createButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={routines}
        renderItem={renderRoutineItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + theme.spacing.lg }]}
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
  routineCard: {
    marginBottom: theme.spacing.md,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  deleteButton: {
    padding: theme.spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
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
    marginBottom: theme.spacing.xl,
  },
  createButton: {
    minWidth: 200,
  },
});
