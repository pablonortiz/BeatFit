import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useExercises, useRoutines } from '../hooks/useStorage';
import { ExerciseTemplate } from '../types';
import * as Haptics from 'expo-haptics';
import { CustomAlert } from '../components';
import { useCustomAlert } from '../hooks/useCustomAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageExercises'>;

export default function ManageExercisesScreen({ navigation }: Props) {
  const { exercises, deleteExercise } = useExercises();
  const { routines } = useRoutines();
  const insets = useSafeAreaInsets();
  const { alertConfig, visible: alertVisible, showAlert, hideAlert } = useCustomAlert();

  // Calcular qué ejercicios están en uso
  const exercisesInUse = useMemo(() => {
    const inUse = new Set<string>();
    routines.forEach((routine) => {
      routine.blocks.forEach((block) => {
        block.activities.forEach((activity) => {
          if (activity.exerciseTemplateId) {
            inUse.add(activity.exerciseTemplateId);
          }
        });
      });
    });
    return inUse;
  }, [routines]);

  // Ordenar ejercicios: más usados primero
  const sortedExercises = useMemo(() => {
    return [...exercises].sort((a, b) => {
      const aInUse = exercisesInUse.has(a.id);
      const bInUse = exercisesInUse.has(b.id);

      // Primero los que están en uso
      if (aInUse && !bInUse) return -1;
      if (!aInUse && bInUse) return 1;

      // Luego por fecha de último uso
      return (b.lastUsed || 0) - (a.lastUsed || 0);
    });
  }, [exercises, exercisesInUse]);

  const handleDeleteExercise = (exercise: ExerciseTemplate) => {
    if (exercisesInUse.has(exercise.id)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAlert(
        'No se puede eliminar',
        'Este ejercicio está siendo usado en una o más rutinas. Elimina esas rutinas primero.',
        [{ text: 'Entendido' }],
        'alert-circle',
        theme.colors.warning
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showAlert(
      'Eliminar Ejercicio',
      `¿Estás seguro que deseas eliminar "${exercise.name}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteExercise(exercise.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const renderExercise = ({ item }: { item: ExerciseTemplate }) => {
    const isInUse = exercisesInUse.has(item.id);

    return (
      <View style={styles.exerciseCard}>
        <View style={styles.exerciseIcon}>
          <Ionicons name={item.icon as any} size={32} color={theme.colors.primary} />
        </View>

        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          {isInUse && (
            <View style={styles.inUseBadge}>
              <Ionicons name="link" size={14} color={theme.colors.info} />
              <Text style={styles.inUseText}>En uso</Text>
            </View>
          )}
          {!isInUse && (
            <Text style={styles.notInUseText}>No usado en ninguna rutina</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.deleteButton, isInUse && styles.deleteButtonDisabled]}
          onPress={() => handleDeleteExercise(item)}
        >
          <Ionicons
            name="trash-outline"
            size={24}
            color={isInUse ? theme.colors.textDisabled : theme.colors.error}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {exercises.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="barbell-outline" size={80} color={theme.colors.textTertiary} />
          <Text style={styles.emptyTitle}>No hay ejercicios guardados</Text>
          <Text style={styles.emptyText}>
            Los ejercicios que crees se guardarán aquí automáticamente
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Ejercicios Guardados</Text>
            <Text style={styles.subtitle}>
              {exercises.length} ejercicio{exercises.length !== 1 ? 's' : ''} •{' '}
              {exercisesInUse.size} en uso
            </Text>
          </View>

          <FlatList
            data={sortedExercises}
            keyExtractor={(item) => item.id}
            renderItem={renderExercise}
            contentContainerStyle={[
              styles.list,
              { paddingBottom: insets.bottom + theme.spacing.lg },
            ]}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </>
      )}

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
  header: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    ...theme.typography.h2,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  list: {
    padding: theme.spacing.lg,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  exerciseIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundCardLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...theme.typography.bodyBold,
    marginBottom: theme.spacing.xs,
  },
  inUseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  inUseText: {
    ...theme.typography.caption,
    color: theme.colors.info,
  },
  notInUseText: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  deleteButton: {
    padding: theme.spacing.sm,
  },
  deleteButtonDisabled: {
    opacity: 0.3,
  },
  separator: {
    height: theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    ...theme.typography.h3,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
