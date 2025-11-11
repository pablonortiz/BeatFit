import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Button } from './Button';
import { IconPicker } from './IconPicker';
import { Activity, ActivityType, ExerciseTemplate, ExerciseIcon, ExerciseType } from '../types';
import { generateId, searchExercises } from '../utils/helpers';
import { useExercises } from '../hooks/useStorage';

interface AddActivityModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (activity: Activity) => void;
  blockId: string;
}

export function AddActivityModal({ visible, onClose, onAdd, blockId }: AddActivityModalProps) {
  const { exercises, saveExercise } = useExercises();

  const [activityType, setActivityType] = useState<ActivityType>('exercise');
  const [exerciseType, setExerciseType] = useState<ExerciseType>('time');
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('30');
  const [reps, setReps] = useState('10');
  const [selectedIcon, setSelectedIcon] = useState<ExerciseIcon>('fitness');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [selectedExerciseTemplate, setSelectedExerciseTemplate] = useState<ExerciseTemplate | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectTemplate = (template: ExerciseTemplate) => {
    setSelectedExerciseTemplate(template);
    setName(template.name);
    setSelectedIcon(template.icon);
    setShowSuggestions(false);
  };

  const handleNameChange = (text: string) => {
    setName(text);
    setSelectedExerciseTemplate(null);
    setShowSuggestions(text.trim().length > 0);
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre');
      return;
    }

    if (activityType === 'exercise' && exerciseType === 'time' && (!duration || parseInt(duration) <= 0)) {
      Alert.alert('Error', 'Por favor ingresa una duración válida');
      return;
    }

    if (activityType === 'exercise' && exerciseType === 'reps' && (!reps || parseInt(reps) <= 0)) {
      Alert.alert('Error', 'Por favor ingresa un número de repeticiones válido');
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
            <Text style={styles.title}>Agregar Actividad</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Tipo de actividad */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tipo</Text>
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
                    Ejercicio
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
                    setName('Descanso');
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
                    Descanso
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Nombre e icono con sugerencias */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {activityType === 'rest' ? 'Nombre' : 'Nombre del ejercicio'}
              </Text>
              <View style={styles.nameRow}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => setShowIconPicker(true)}
                  disabled={activityType === 'rest'}
                >
                  <Ionicons name={selectedIcon as any} size={32} color={theme.colors.primary} />
                </TouchableOpacity>
                <TextInput
                  style={styles.nameInput}
                  placeholder={activityType === 'rest' ? 'Descanso' : 'Escribe el nombre...'}
                  placeholderTextColor={theme.colors.textTertiary}
                  value={name}
                  onChangeText={handleNameChange}
                  editable={activityType !== 'rest'}
                />
              </View>

              {/* Sugerencias de ejercicios existentes */}
              {activityType === 'exercise' && showSuggestions && filteredExercises.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsTitle}>Ejercicios guardados:</Text>
                  <View style={styles.searchResults}>
                    {filteredExercises.slice(0, 5).map((exercise) => (
                      <TouchableOpacity
                        key={exercise.id}
                        style={styles.exerciseItem}
                        onPress={() => handleSelectTemplate(exercise)}
                      >
                        <Ionicons name={exercise.icon as any} size={24} color={theme.colors.primary} />
                        <Text style={styles.exerciseItemText}>{exercise.name}</Text>
                        <Ionicons name="arrow-forward" size={20} color={theme.colors.textTertiary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Indicador si se está usando un ejercicio existente */}
              {selectedExerciseTemplate && (
                <View style={styles.templateIndicator}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.accent} />
                  <Text style={styles.templateIndicatorText}>
                    Usando ejercicio guardado
                  </Text>
                </View>
              )}
            </View>

            {/* Tipo de ejercicio (solo para ejercicios) */}
            {activityType === 'exercise' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Medición</Text>
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
                      Tiempo
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
                      Repeticiones
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Duración o repeticiones */}
            <View style={styles.section}>
              {(activityType === 'rest' || exerciseType === 'time') ? (
                <>
                  <Text style={styles.sectionTitle}>Duración (segundos)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="30"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="numeric"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Repeticiones</Text>
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
              title="Cancelar"
              onPress={handleClose}
              variant="ghost"
              size="medium"
              style={{ flex: 1 }}
            />
            <Button
              title="Agregar"
              onPress={handleAdd}
              variant="primary"
              size="medium"
              style={{ flex: 1 }}
            />
          </View>
        </View>

        <IconPicker
          selectedIcon={selectedIcon}
          onSelect={setSelectedIcon}
          visible={showIconPicker}
          onClose={() => setShowIconPicker(false)}
        />
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
  suggestionsContainer: {
    marginTop: theme.spacing.md,
  },
  suggestionsTitle: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.sm,
  },
  searchResults: {
    marginTop: theme.spacing.sm,
    maxHeight: 200,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCardLight,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  exerciseItemText: {
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
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
