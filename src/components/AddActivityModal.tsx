import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Button, CustomAlert } from './';
import { IconPicker, sanitizeExerciseIcon } from './IconPicker';
import { DurationPicker } from './DurationPicker';
import { Activity, ActivityType, ExerciseTemplate, ExerciseIcon, ExerciseType } from '../types';
import { generateId, searchExercises } from '../utils/helpers';
import { useExercises } from '../hooks/useStorage';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { useTranslation } from 'react-i18next';

interface AddActivityModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (activity: Activity) => void;
  blockId: string;
}

export function AddActivityModal({ visible, onClose, onAdd, blockId }: AddActivityModalProps) {
  const { exercises, saveExercise } = useExercises();
  const { alertConfig, visible: alertVisible, showAlert, hideAlert } = useCustomAlert();
  const { t } = useTranslation();

  const [activityType, setActivityType] = useState<ActivityType>('exercise');
  const [exerciseType, setExerciseType] = useState<ExerciseType>('time');
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('30');
  const [reps, setReps] = useState('10');
  const [selectedIcon, setSelectedIcon] = useState<ExerciseIcon>('fitness');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [selectedExerciseTemplate, setSelectedExerciseTemplate] = useState<ExerciseTemplate | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputLayout, setInputLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const filteredExercises = useMemo(() => {
    if (!name.trim() || activityType === 'rest') return [];
    return searchExercises(exercises, name);
  }, [exercises, name, activityType]);

  const resetForm = () => {
    setActivityType('exercise');
    setExerciseType('time');
    setName('');
    setDuration('30');
    setReps('10');
    setSelectedIcon('fitness');
    setSelectedExerciseTemplate(null);
    setShowSuggestions(false);
    setShowDurationPicker(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectTemplate = (template: ExerciseTemplate) => {
    setSelectedExerciseTemplate(template);
    setName(template.name);
    setSelectedIcon(sanitizeExerciseIcon(template.icon as string));
    setShowSuggestions(false);
  };

  const handleNameChange = (text: string) => {
    setName(text);
    setSelectedExerciseTemplate(null);
    setShowSuggestions(text.trim().length > 0);
  };

  const handleDurationSelect = (seconds: number) => {
    setDuration(seconds.toString());
  };

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0) parts.push(`${s}s`);

    return parts.join(' ') || '0s';
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      showAlert(t('common.error'), t('createRoutine.errorNameRequired'), [], 'close-circle', theme.colors.error);
      return;
    }

    if (activityType === 'exercise' && exerciseType === 'time' && (!duration || parseInt(duration) <= 0)) {
      showAlert(t('common.error'), t('createRoutine.errorDurationInvalid'), [], 'close-circle', theme.colors.error);
      return;
    }

    if (activityType === 'exercise' && exerciseType === 'reps' && (!reps || parseInt(reps) <= 0)) {
      showAlert(t('common.error'), t('createRoutine.errorRepsInvalid'), [], 'close-circle', theme.colors.error);
      return;
    }

    // Si es un ejercicio nuevo (no seleccionado de plantilla), guardarlo
    let exerciseTemplateId = selectedExerciseTemplate?.id;
    if (!selectedExerciseTemplate && activityType === 'exercise') {
      const newTemplate: ExerciseTemplate = {
        id: generateId(),
        name: name.trim(),
        icon: selectedIcon,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      await saveExercise(newTemplate);
      exerciseTemplateId = newTemplate.id;
    }

    const activity: Activity = {
      id: generateId(),
      type: activityType,
      exerciseTemplateId,
      name: name.trim(),
      icon: selectedIcon,
      exerciseType: activityType === 'rest' ? 'time' : exerciseType,
      duration: activityType === 'rest' || exerciseType === 'time' ? parseInt(duration) : undefined,
      reps: exerciseType === 'reps' ? parseInt(reps) : undefined,
    };

    onAdd(activity);
    handleClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('createRoutine.addActivity')}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Tipo de actividad */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('exercises.exerciseType')}</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    activityType === 'exercise' && styles.typeButtonActive,
                  ]}
                  onPress={() => {
                    setActivityType('exercise');
                    setSelectedIcon('fitness');
                  }}
                >
                  <Ionicons
                    name="fitness"
                    size={24}
                    color={activityType === 'exercise' ? theme.colors.white : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      activityType === 'exercise' && styles.typeButtonTextActive,
                    ]}
                  >
                    {t('createRoutine.exercise')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    activityType === 'rest' && styles.typeButtonActive,
                  ]}
                  onPress={() => {
                    setActivityType('rest');
                    setExerciseType('time');
                    setSelectedIcon('timer');
                    setName(t('createRoutine.rest'));
                  }}
                >
                  <Ionicons
                    name="timer"
                    size={24}
                    color={activityType === 'rest' ? theme.colors.white : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      activityType === 'rest' && styles.typeButtonTextActive,
                    ]}
                  >
                    {t('createRoutine.rest')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Nombre e icono con sugerencias */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {activityType === 'rest' ? t('exercises.exerciseName') : t('exercises.exerciseName')}
              </Text>
              <View style={styles.nameRow}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => setShowIconPicker(true)}
                  disabled={activityType === 'rest'}
                >
                  <Ionicons name={selectedIcon as any} size={32} color={theme.colors.primary} />
                </TouchableOpacity>
                <View
                  onLayout={(event) => {
                    const layout = event.nativeEvent.layout;
                    event.currentTarget.measure((x, y, width, height, pageX, pageY) => {
                      setInputLayout({ x: pageX, y: pageY, width, height });
                    });
                  }}
                  style={{ flex: 1 }}
                >
                  <TextInput
                    style={styles.nameInput}
                    placeholder={activityType === 'rest' ? t('createRoutine.rest') : t('exercises.exerciseNamePlaceholder')}
                    placeholderTextColor={theme.colors.textTertiary}
                    value={name}
                    onChangeText={handleNameChange}
                    editable={activityType !== 'rest'}
                  />
                </View>
              </View>

              {/* Sugerencias eliminadas de aquí - ahora son absolutas */}

              {/* Indicador si se está usando un ejercicio existente */}
              {selectedExerciseTemplate && (
                <View style={styles.templateIndicator}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.accent} />
                  <Text style={styles.templateIndicatorText}>
                    {t('createRoutine.usingSavedExercise')}
                  </Text>
                </View>
              )}
            </View>

            {/* Tipo de ejercicio (solo para ejercicios) */}
            {activityType === 'exercise' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('createRoutine.measurement')}</Text>
                <View style={styles.typeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      exerciseType === 'time' && styles.typeButtonActive,
                    ]}
                    onPress={() => setExerciseType('time')}
                  >
                    <Ionicons
                      name="time-outline"
                      size={24}
                      color={exerciseType === 'time' ? theme.colors.white : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        exerciseType === 'time' && styles.typeButtonTextActive,
                      ]}
                    >
                      {t('exercises.time')}
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
                      name="repeat"
                      size={24}
                      color={exerciseType === 'reps' ? theme.colors.white : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        exerciseType === 'reps' && styles.typeButtonTextActive,
                      ]}
                    >
                      {t('exercises.reps')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Duración o repeticiones */}
            <View style={styles.section}>
              {(activityType === 'rest' || exerciseType === 'time') ? (
                <>
                  <Text style={styles.sectionTitle}>{t('exercises.duration')}</Text>
                  <TouchableOpacity
                    style={styles.durationButton}
                    onPress={() => setShowDurationPicker(true)}
                  >
                    <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
                    <Text style={styles.durationButtonText}>
                      {formatDuration(parseInt(duration))}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>{t('exercises.reps')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={reps}
                    onChangeText={setReps}
                    keyboardType="numeric"
                  />
                </>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={t("common.cancel")}
              onPress={handleClose}
              variant="ghost"
              size="medium"
              style={{ flex: 1 }}
            />
            <Button
              title={t("common.add")}
              onPress={handleAdd}
              variant="primary"
              size="medium"
              style={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Dropdown absoluto de sugerencias */}
        {activityType === 'exercise' && showSuggestions && filteredExercises.length > 0 && inputLayout && (
          <View
            style={[
              styles.suggestionsDropdown,
              {
                bottom: inputLayout.height + 8,
                left: inputLayout.x,
                width: inputLayout.width,
              },
            ]}
          >
            <View style={styles.suggestionsHeader}>
              <Text style={styles.suggestionsTitle}>Ejercicios guardados</Text>
              <TouchableOpacity onPress={() => setShowSuggestions(false)}>
                <Ionicons name="close-circle" size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.suggestionsList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {filteredExercises.slice(0, 5).map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectTemplate(exercise)}
                >
                  <Ionicons name={sanitizeExerciseIcon(exercise.icon as string) as any} size={24} color={theme.colors.primary} />
                  <Text style={styles.suggestionItemText}>{exercise.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <IconPicker
          selectedIcon={selectedIcon}
          onSelect={setSelectedIcon}
          visible={showIconPicker}
          onClose={() => setShowIconPicker(false)}
        />
        <DurationPicker
          visible={showDurationPicker}
          onClose={() => setShowDurationPicker(false)}
          onSelect={handleDurationSelect}
          initialSeconds={parseInt(duration) || 30}
        />

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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.backgroundCard,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '90%',
    paddingBottom: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    ...theme.typography.h3,
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.bodyBold,
    marginBottom: theme.spacing.sm,
    color: theme.colors.textSecondary,
  },
  typeButtons: {
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
    backgroundColor: theme.colors.backgroundCardLight,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  typeButtonText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  typeButtonTextActive: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  // Dropdown absoluto de sugerencias
  suggestionsDropdown: {
    position: 'absolute',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    maxHeight: 250,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
    zIndex: 1000,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  suggestionsTitle: {
    ...theme.typography.bodySmallBold,
    color: theme.colors.textSecondary,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  suggestionItemText: {
    ...theme.typography.body,
    flex: 1,
  },
  templateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  templateIndicatorText: {
    ...theme.typography.caption,
    color: theme.colors.accent,
  },
  nameRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundCardLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
    backgroundColor: theme.colors.backgroundCardLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  input: {
    backgroundColor: theme.colors.backgroundCardLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  durationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.backgroundCardLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  durationButtonText: {
    flex: 1,
    ...theme.typography.h3,
    color: theme.colors.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
