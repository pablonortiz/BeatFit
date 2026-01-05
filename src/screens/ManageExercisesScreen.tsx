import React, { useMemo, useState } from 'react';
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
import { ExerciseTemplate, ExerciseIcon } from '../types';
import * as Haptics from 'expo-haptics';
import { CustomAlert, SubstitutePickerModal, PaywallModal } from '../components';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { useTranslation } from 'react-i18next';
import { IconPicker, sanitizeExerciseIcon } from '../components/IconPicker';
import { usePremium } from '../contexts/PremiumContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageExercises'>;

export default function ManageExercisesScreen({ navigation }: Props) {
  const { exercises, deleteExercise, saveExercise } = useExercises();
  const { routines } = useRoutines();
  const insets = useSafeAreaInsets();
  const { alertConfig, visible: alertVisible, showAlert, hideAlert } = useCustomAlert();
  const { t } = useTranslation();
  const { isPremium } = usePremium();
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<ExerciseTemplate | null>(null);
  const [substitutePickerVisible, setSubstitutePickerVisible] = useState(false);
  const [exerciseForSubstitutes, setExerciseForSubstitutes] = useState<ExerciseTemplate | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const handleManageSubstitutes = (exercise: ExerciseTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPremium) {
      setExerciseForSubstitutes(exercise);
      setSubstitutePickerVisible(true);
    } else {
      setShowPaywall(true);
    }
  };

  const handleSaveSubstitutes = async (substituteIds: string[]) => {
    if (!exerciseForSubstitutes) return;
    await saveExercise({
      ...exerciseForSubstitutes,
      substitutes: substituteIds,
    });
  };

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
        t('exercises.cannotDelete'),
        t('exercises.cannotDeleteMessage'),
        [{ text: t('common.ok') }],
        'alert-circle',
        theme.colors.warning
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showAlert(
      t('exercises.deleteExercise'),
      t('exercises.deleteConfirm', { name: exercise.name }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
          onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        },
        {
          text: t('common.delete'),
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
    const safeIcon = sanitizeExerciseIcon(item.icon as string);
    const substituteCount = item.substitutes?.length || 0;

    return (
      <View style={styles.exerciseCard}>
        <View style={styles.exerciseIcon}>
          <Ionicons name={safeIcon as any} size={32} color={theme.colors.primary} />
        </View>

        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          <View style={styles.badgesRow}>
            {isInUse && (
              <View style={styles.inUseBadge}>
                <Ionicons name="link" size={14} color={theme.colors.info} />
                <Text style={styles.inUseText}>{t('exercises.inUse')}</Text>
              </View>
            )}
            {substituteCount > 0 && (
              <View style={styles.substituteBadge}>
                <Ionicons name="swap-horizontal" size={14} color={theme.colors.accent} />
                <Text style={styles.substituteText}>{substituteCount}</Text>
              </View>
            )}
          </View>
          {!isInUse && substituteCount === 0 && (
            <Text style={styles.notInUseText}>{t('exercises.notInUse')}</Text>
          )}
        </View>

        {/* Substitute Button */}
        <TouchableOpacity
          style={styles.substituteButton}
          onPress={() => handleManageSubstitutes(item)}
        >
          <Ionicons name="swap-horizontal" size={22} color={theme.colors.accent} />
          {!isPremium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={8} color={theme.colors.warning} />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            setExerciseToEdit({ ...item, icon: safeIcon });
            setIconPickerVisible(true);
          }}
        >
          <Ionicons name="create-outline" size={22} color={theme.colors.primary} />
        </TouchableOpacity>

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
          <Text style={styles.emptyTitle}>{t('exercises.noExercises')}</Text>
          <Text style={styles.emptyText}>
            {t('exercises.noExercisesDescription')}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>{t('exercises.savedExercises')}</Text>
            <Text style={styles.subtitle}>
              {t('exercises.exercisesCount', { count: exercises.length })} •{' '}
              {t('exercises.inUseCount', { count: exercisesInUse.size })}
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

      <IconPicker
        visible={iconPickerVisible}
        selectedIcon={sanitizeExerciseIcon((exerciseToEdit?.icon as string) || 'fitness')}
        onSelect={async (icon) => {
          if (exerciseToEdit) {
            await saveExercise({ ...exerciseToEdit, icon });
          }
        }}
        onClose={() => {
          setExerciseToEdit(null);
          setIconPickerVisible(false);
        }}
      />

      {/* Substitute Picker Modal */}
      <SubstitutePickerModal
        visible={substitutePickerVisible}
        exercise={exerciseForSubstitutes}
        allExercises={exercises}
        onSave={handleSaveSubstitutes}
        onClose={() => {
          setExerciseForSubstitutes(null);
          setSubstitutePickerVisible(false);
        }}
      />

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
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
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
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
  substituteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    backgroundColor: theme.colors.accent + '20',
    borderRadius: theme.borderRadius.sm,
  },
  substituteText: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  notInUseText: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  substituteButton: {
    padding: theme.spacing.sm,
    position: 'relative',
  },
  premiumBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    padding: theme.spacing.sm,
  },
  editButton: {
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
