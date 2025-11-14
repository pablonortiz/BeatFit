import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Activity, ExerciseType } from '../types';
import { theme } from '../theme';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';

interface EditActivityModalProps {
  visible: boolean;
  activity: Activity | null;
  onClose: () => void;
  onSave: (activity: Activity) => void;
}

export function EditActivityModal({
  visible,
  activity,
  onClose,
  onSave,
}: EditActivityModalProps) {
  const { t } = useTranslation();
  const [exerciseType, setExerciseType] = useState<ExerciseType>('time');
  const [duration, setDuration] = useState('30');
  const [reps, setReps] = useState('10');

  useEffect(() => {
    if (activity) {
      setExerciseType(activity.exerciseType);
      setDuration(activity.duration?.toString() || '30');
      setReps(activity.reps?.toString() || '10');
    }
  }, [activity]);

  const handleSave = () => {
    if (!activity) return;

    const updatedActivity: Activity = {
      ...activity,
      exerciseType,
      duration: exerciseType === 'time' ? parseInt(duration) || 30 : undefined,
      reps: exerciseType === 'reps' ? parseInt(reps) || 10 : undefined,
    };

    onSave(updatedActivity);
    onClose();
  };

  if (!activity) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar Ejercicio</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView}>
            {/* Mostrar nombre del ejercicio (solo lectura) */}
            <View style={styles.section}>
              <Text style={styles.label}>Ejercicio</Text>
              <View style={styles.readOnlyField}>
                <Ionicons 
                  name={activity.icon as any} 
                  size={24} 
                  color={activity.type === 'rest' ? theme.colors.rest : theme.colors.exercise} 
                />
                <Text style={styles.readOnlyText}>{activity.name}</Text>
              </View>
            </View>

            {/* Tipo de ejercicio */}
            <View style={styles.section}>
              <Text style={styles.label}>Tipo</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    exerciseType === 'time' && styles.typeButtonActive,
                  ]}
                  onPress={() => setExerciseType('time')}
                >
                  <Ionicons
                    name="timer-outline"
                    size={24}
                    color={
                      exerciseType === 'time'
                        ? theme.colors.primary
                        : theme.colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      exerciseType === 'time' && styles.typeButtonTextActive,
                    ]}
                  >
                    Por Tiempo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    exerciseType === 'reps' && styles.typeButtonActive,
                  ]}
                  onPress={() => setExerciseType('reps')}
                >
                  <Ionicons
                    name="repeat-outline"
                    size={24}
                    color={
                      exerciseType === 'reps'
                        ? theme.colors.primary
                        : theme.colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      exerciseType === 'reps' && styles.typeButtonTextActive,
                    ]}
                  >
                    Por Repeticiones
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Duración o Repeticiones */}
            {exerciseType === 'time' ? (
              <View style={styles.section}>
                <Text style={styles.label}>Duración (segundos)</Text>
                <TextInput
                  style={styles.input}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.label}>Repeticiones</Text>
                <TextInput
                  style={styles.input}
                  value={reps}
                  onChangeText={setReps}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              title={t("common.cancel")}
              onPress={onClose}
              variant="outline"
              style={styles.actionButton}
            />
            <Button
              title={t("common.save")}
              onPress={handleSave}
              variant="primary"
              style={styles.actionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.backgroundCard,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.h3,
  },
  scrollView: {
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    ...theme.typography.bodyBold,
    marginBottom: theme.spacing.sm,
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  readOnlyText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  input: {
    ...theme.typography.body,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  typeButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  typeButtonText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  typeButtonTextActive: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionButton: {
    flex: 1,
  },
});

